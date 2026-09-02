from __future__ import annotations

import threading
import time
from typing import Any, Protocol

import numpy as np

from ..retrieval import diversify_results
from ..translation import detect_es_or_en, literal_alias_queries
from .contract import CONTRACT_VERSION, MAX_LIMIT, SearchRequest, parse_search_request, parse_suggest_request
from ..telemetry import EventValidationError
from .errors import (
    IndexNotLoaded,
    InvalidEvent,
    ModelUnavailable,
    ServiceError,
    TelemetryUnavailable,
    TranslationFailed,
)
from .hybrid import (
    LITERAL_CANDIDATE_THRESHOLD,
    SEMANTIC_POOL_SIZE,
    STRONG_TITLE_MATCHES,
    apply_relevance,
    catalogue_fit_level,
    classify_intent,
    effective_intent,
    hybrid_score,
    match_reasons,
)
from .index import SearchIndex
from .textmatch import LiteralMatch, score_literal

INTERNAL_TOP_K = 10


class TextEncoder(Protocol):
    def embed_query(self, text: str) -> np.ndarray: ...


class Translator(Protocol):
    def translate(self, text: str) -> str: ...


class SearchService:
    """Query in, ranked catalogue entries out.

    The encoder and translator are injected so the ranking contract can be
    tested without loading MuQ or OPUS-MT.
    """

    def __init__(
        self,
        index: SearchIndex | None,
        text_encoder: TextEncoder | None,
        translator: Translator | None,
        *,
        internal_top_k: int = INTERNAL_TOP_K,
        hybrid: bool = True,
        relevance: dict[str, Any] | None = None,
        semantic_pool: int = SEMANTIC_POOL_SIZE,
        telemetry: Any = None,
        catalogue_fit: dict[str, Any] | None = None,
    ) -> None:
        self.semantic_pool = semantic_pool
        # Opcional a propósito: benchmarks y tests corren sin telemetría, y un
        # fallo escribiendo eventos nunca puede tumbar una búsqueda.
        self.telemetry = telemetry
        self.index = index
        self.text_encoder = text_encoder
        self.translator = translator
        self.internal_top_k = internal_top_k
        # Desactivable para poder comparar contra el comportamiento anterior
        # sin mantener dos implementaciones.
        self.hybrid = hybrid
        self.relevance = relevance
        self.catalogue_fit = catalogue_fit
        # MuQ inference and Marian generation are not safe to run concurrently
        # from several request threads on one model instance.
        self._model_lock = threading.Lock()

    def health(self) -> dict[str, Any]:
        index_loaded = self.index is not None
        components_ready = index_loaded and self.text_encoder is not None and self.translator is not None
        payload: dict[str, Any] = {
            "status": "ok" if components_ready else "degraded",
            "contract_version": CONTRACT_VERSION,
            "index_loaded": index_loaded,
            "model_ready": self.text_encoder is not None,
            "translator_ready": self.translator is not None,
        }
        if self.index is not None:
            payload["index_version"] = self.index.index_version
            payload["catalogue_tracks"] = self.index.track_count
            payload["catalogue_segments"] = self.index.segment_count
        return payload

    def record_event(self, payload: Any) -> dict[str, Any]:
        """Registra un evento de telemetría enviado por el cliente."""
        if self.telemetry is None:
            raise TelemetryUnavailable("La telemetría no está activada en este servicio")
        try:
            return self.telemetry.record_event(payload, index=self.index)
        except EventValidationError as error:
            raise InvalidEvent(str(error)) from error

    def suggest(self, payload: Any) -> dict[str, Any]:
        request = parse_suggest_request(payload)
        return {
            "query_original": request.query,
            "available": False,
            "suggestions": [],
        }

    def search(self, payload: Any, *, diagnostics: bool = False) -> tuple[dict[str, Any], dict[str, Any]]:
        """Return the public response plus a telemetry record for the caller to log.

        `diagnostics` añade a cada resultado las puntuaciones internas. Lo usan
        el benchmark y el ajuste de pesos; la capa HTTP nunca lo activa, así que
        el contrato público no cambia.
        """
        started = time.perf_counter()
        request = parse_search_request(payload)
        if self.index is None:
            raise IndexNotLoaded("Search called before the index was loaded")
        if self.text_encoder is None:
            raise ModelUnavailable("Search called before the retrieval model was loaded")

        language = detect_es_or_en(request.query) if request.language == "auto" else request.language
        translation_used = language == "es"

        # Se busca siempre en minúsculas. El codificador de texto de MuQ
        # distingue mayúsculas, así que "Música tranquila" y "música tranquila"
        # daban rankings distintos; los teclados de móvil capitalizan la primera
        # letra por su cuenta y la misma consulta devolvía resultados distintos
        # según el dispositivo. Además alinea la ejecución con el benchmark de
        # Fase 2, cuyas consultas son todas minúsculas.
        # `query_original` conserva lo que escribió el usuario.
        normalized_query = request.query.lower()
        translation_seconds = 0.0
        if translation_used:
            if self.translator is None:
                raise TranslationFailed("Spanish query received but no translator is loaded")
            translation_started = time.perf_counter()
            with self._model_lock:
                try:
                    # También en minúsculas a la salida: OPUS capitaliza la
                    # primera palabra aunque la entrada no lo estuviera.
                    normalized_query = self.translator.translate(normalized_query).strip().lower()
                except ServiceError:
                    raise
                except Exception as error:  # noqa: BLE001 - surfaced as a stable service error
                    raise TranslationFailed(f"{type(error).__name__}: {error}") from error
            translation_seconds = time.perf_counter() - translation_started
            if not normalized_query:
                raise TranslationFailed("Translator returned an empty string")

        embedding_started = time.perf_counter()
        with self._model_lock:
            try:
                embedding = np.asarray(self.text_encoder.embed_query(normalized_query), dtype=np.float32)
            except ServiceError:
                raise
            except Exception as error:  # noqa: BLE001 - surfaced as a stable service error
                raise ModelUnavailable(f"{type(error).__name__}: {error}") from error
        embedding_seconds = time.perf_counter() - embedding_started
        if embedding.shape != (self.index.embedding_dimension,):
            raise ModelUnavailable(
                f"Text encoder returned shape {embedding.shape}, expected ({self.index.embedding_dimension},)"
            )

        retrieval_started = time.perf_counter()
        ranked = self._rank_tracks(embedding)
        retrieval_seconds = time.perf_counter() - retrieval_started

        # La coincidencia literal conserva la consulta original para títulos
        # ingleses escritos dentro de una frase española, pero también usa la
        # traducción. Sin la segunda variante, "taberna medieval" llega bien al
        # modelo como "medieval tavern" pero nunca puede coincidir con el álbum
        # Reunion's Tavern ni con A night at the tavern.
        rerank_started = time.perf_counter()
        intent = classify_intent(request.query)
        if self.hybrid:
            ranked, intent = self._apply_hybrid(
                ranked,
                request.query,
                intent,
                translated_query=normalized_query if translation_used else None,
            )
        else:
            for item in ranked:
                item["literal"] = LiteralMatch()
                item["hybrid_score"] = item["score"]
                item["semantic_normalized"] = item["score"]

        fit_level = catalogue_fit_level(ranked, self.catalogue_fit)

        diversified = diversify_results(ranked, self.index.composition_by_track, top_k=self.internal_top_k)
        visible = diversified[: request.limit]
        # `limit` es un máximo: si los últimos candidatos son flojos, se cortan.
        conservados = apply_relevance(
            [item["hybrid_score"] for item in visible], self.relevance, intent=intent
        )
        visible = visible[:conservados]
        rerank_seconds = time.perf_counter() - rerank_started

        raw_compositions = [
            self.index.composition_by_track.get(item["track_id"], item["track_id"])
            for item in ranked[: self.internal_top_k]
        ]

        # Identificador de esta búsqueda. Lo devuelve la respuesta para que el
        # navegador pueda referirse a ella al enviar clics, escuchas y feedback.
        search_id = self._registrar_busqueda(request, language, intent, normalized_query, visible, payload)

        response = {
            "contract_version": CONTRACT_VERSION,
            "index_version": self.index.index_version,
            "search_id": search_id,
            "query_original": request.query,
            "detected_language": language,
            "query_normalized_en": normalized_query,
            "translation_used": translation_used,
            "catalogue_fit": fit_level,
            "limit": request.limit,
            "results": [
                self._public_result(item, diagnostics=diagnostics, catalogue_fit=fit_level)
                for item in visible
            ],
        }
        telemetry = {
            "detected_language": language,
            "translation_used": translation_used,
            "query_intent": intent,
            "catalogue_fit": fit_level,
            "result_count": len(visible),
            "index_version": self.index.index_version,
            "translation_ms": round(translation_seconds * 1000, 3),
            "embedding_ms": round(embedding_seconds * 1000, 3),
            "retrieval_ms": round(retrieval_seconds * 1000, 3),
            "rerank_ms": round(rerank_seconds * 1000, 3),
            "total_ms": round((time.perf_counter() - started) * 1000, 3),
            "suppressed_versions": len(raw_compositions) - len(set(raw_compositions)),
        }
        return response, telemetry

    def _registrar_busqueda(
        self,
        request: SearchRequest,
        language: str,
        intent: str,
        normalized_query: str,
        visible: list[dict[str, Any]],
        payload: Any,
    ) -> str | None:
        """Anota la búsqueda y qué resultados se mostraron.

        Guarda la instantánea completa —con las puntuaciones internas— porque
        para entrenar un reranker en el futuro hace falta saber qué alternativas
        se le ofrecieron al usuario, no sólo cuál eligió. Embeddings, nunca.

        Un fallo aquí no se propaga: la telemetría no es crítica.
        """
        if self.telemetry is None:
            return None
        try:
            sesion = payload.get("anon_session_id") if isinstance(payload, dict) else None
            return self.telemetry.record_search(
                query=request.query,
                language=language,
                intent=intent,
                normalized_query=normalized_query,
                anon_session_id=sesion,
                index=self.index,
                results=visible,
            )
        except Exception:  # noqa: BLE001 - la búsqueda manda; la telemetría no
            return None

    def _apply_hybrid(
        self,
        ranked: list[dict[str, Any]],
        query: str,
        intent: str,
        translated_query: str | None = None,
    ) -> tuple[list[dict[str, Any]], str]:
        """Rerankea la unión de los mejores semánticos y los aciertos literales.

        No basta con rerankear el top-10 semántico: `avalon` deja a 'Quest for
        Avalon' muy lejos en la lista de MuQ, así que un título fuerte tiene que
        poder entrar aunque la semántica no lo haya visto.
        """
        index = self.index
        assert index is not None

        literal_queries = [query]
        if translated_query and translated_query.casefold() != query.casefold():
            literal_queries.append(translated_query)
            literal_queries.extend(literal_alias_queries(query))

        literales: dict[str, LiteralMatch] = {}
        for track in index.tracks:
            coincidencias = [
                score_literal(literal_query, track.title, track.album)
                for literal_query in literal_queries
            ]
            # En empate gana la original por estar primero. Así no cambia la
            # explicación de los títulos que ya funcionaban antes.
            literales[track.track_id] = max(
                coincidencias,
                key=lambda match: (match.score, match.title_score, match.album_score),
            )

        por_id = {item["track_id"]: item for item in ranked}
        piscina = [item["track_id"] for item in ranked[: self.semantic_pool]]
        vistos = set(piscina)
        for track_id, literal in literales.items():
            if literal.score >= LITERAL_CANDIDATE_THRESHOLD and track_id not in vistos:
                piscina.append(track_id)
                vistos.add(track_id)

        # Si ningún título cubre la consulta entera, se rebaja la intención:
        # una consulta corta sin título claro debe decidirse por la música.
        hay_fuerte = any(
            literales[t].match_type in STRONG_TITLE_MATCHES for t in piscina
        )
        hay_exacta = any(literales[t].match_type == "exact_title" for t in piscina)
        intent = effective_intent(intent, hay_fuerte, hay_exacta)

        # Normalizar la semántica dentro del conjunto hace que los pesos sean
        # comparables: el coseno de MuQ vive en un rango estrecho y propio.
        semanticas = [por_id[t]["score"] for t in piscina]
        minimo, maximo = min(semanticas), max(semanticas)
        rango = maximo - minimo

        candidatos = []
        for track_id in piscina:
            item = por_id[track_id]
            normalizada = (item["score"] - minimo) / rango if rango > 1e-9 else 1.0
            literal = literales[track_id]
            candidato = {
                **item,
                "literal": literal,
                "semantic_normalized": normalizada,
                "hybrid_score": hybrid_score(normalizada, literal, intent),
            }
            candidatos.append(candidato)

        candidatos.sort(key=lambda c: (-c["hybrid_score"], c["track_id"]))
        for posicion, candidato in enumerate(candidatos, start=1):
            candidato["rank"] = posicion
        return candidatos, intent

    def _rank_tracks(self, embedding: np.ndarray) -> list[dict[str, Any]]:
        """Best-segment score per track, ordered exactly like the Phase 2 benchmark."""
        index = self.index
        assert index is not None
        scores = index.segment_embeddings @ embedding
        ranked: list[dict[str, Any]] = []
        for track in index.tracks:
            window = scores[track.segment_offset : track.segment_offset + track.segment_count]
            local = int(np.argmax(window))
            absolute = track.segment_offset + local
            score = float(window[local])
            ranked.append(
                {
                    "track_id": track.track_id,
                    "row": track.row,
                    "score": score,
                    "semantic_raw": score,
                    "best_segment": {
                        "start": float(index.segment_starts[absolute]),
                        "end": float(index.segment_ends[absolute]),
                    },
                }
            )
        ranked.sort(key=lambda item: (-item["score"], item["track_id"]))
        for rank, item in enumerate(ranked, start=1):
            item["rank"] = rank
        return ranked

    def _public_result(
        self,
        item: dict[str, Any],
        *,
        diagnostics: bool = False,
        catalogue_fit: str = "clear",
    ) -> dict[str, Any]:
        index = self.index
        assert index is not None
        track = index.tracks[item["row"]]
        literal = item.get("literal") or LiteralMatch()
        extra = {}
        if diagnostics:
            extra["diagnostics"] = {
                "semantic_score": round(float(item.get("semantic_raw", item["score"])), 6),
                "semantic_normalized": round(float(item.get("semantic_normalized", 0.0)), 6),
                "literal_title_score": round(literal.title_score, 6),
                "literal_album_score": round(literal.album_score, 6),
                "literal_match_type": literal.match_type,
                "hybrid_score": round(float(item.get("hybrid_score", item["score"])), 6),
            }
        return {
            **extra,
            "rank": item["rank"],
            # Campo nuevo y opcional: el contrato anterior se mantiene intacto.
            "match_reasons": match_reasons(
                literal,
                item.get("semantic_normalized", 0.0),
                catalogue_fit=catalogue_fit,
            ),
            "track_id": track.track_id,
            "composition_id": track.composition_id,
            "title": track.title,
            "album": track.album,
            "album_cover_url": track.album_cover_url,
            "audio_url": track.audio_url,
            "duration_seconds": round(track.duration_seconds, 3),
            "alternate_versions": index.alternate_version_counts[track.track_id],
            "match": {
                "best_segment_start": round(item["best_segment"]["start"], 3),
                "best_segment_end": round(item["best_segment"]["end"], 3),
            },
        }


__all__ = ["SearchService", "TextEncoder", "Translator", "INTERNAL_TOP_K", "MAX_LIMIT", "SearchRequest"]
