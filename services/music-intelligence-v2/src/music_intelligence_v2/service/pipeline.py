from __future__ import annotations

import threading
import time
from typing import Any, Protocol

import numpy as np

from ..retrieval import diversify_results
from ..translation import detect_es_or_en
from .contract import CONTRACT_VERSION, MAX_LIMIT, SearchRequest, parse_search_request, parse_suggest_request
from .errors import IndexNotLoaded, ModelUnavailable, ServiceError, TranslationFailed
from .index import SearchIndex

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
    ) -> None:
        self.index = index
        self.text_encoder = text_encoder
        self.translator = translator
        self.internal_top_k = internal_top_k
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

    def suggest(self, payload: Any) -> dict[str, Any]:
        request = parse_suggest_request(payload)
        return {
            "query_original": request.query,
            "available": False,
            "suggestions": [],
        }

    def search(self, payload: Any) -> tuple[dict[str, Any], dict[str, Any]]:
        """Return the public response plus a telemetry record for the caller to log."""
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
        diversified = diversify_results(ranked, self.index.composition_by_track, top_k=self.internal_top_k)
        visible = diversified[: request.limit]
        retrieval_seconds = time.perf_counter() - retrieval_started
        raw_compositions = [
            self.index.composition_by_track.get(item["track_id"], item["track_id"])
            for item in ranked[: self.internal_top_k]
        ]

        response = {
            "contract_version": CONTRACT_VERSION,
            "index_version": self.index.index_version,
            "query_original": request.query,
            "detected_language": language,
            "query_normalized_en": normalized_query,
            "translation_used": translation_used,
            "limit": request.limit,
            "results": [self._public_result(item) for item in visible],
        }
        telemetry = {
            "detected_language": language,
            "translation_used": translation_used,
            "result_count": len(visible),
            "index_version": self.index.index_version,
            "translation_ms": round(translation_seconds * 1000, 3),
            "embedding_ms": round(embedding_seconds * 1000, 3),
            "retrieval_ms": round(retrieval_seconds * 1000, 3),
            "total_ms": round((time.perf_counter() - started) * 1000, 3),
            "suppressed_versions": len(raw_compositions) - len(set(raw_compositions)),
        }
        return response, telemetry

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
            ranked.append(
                {
                    "track_id": track.track_id,
                    "row": track.row,
                    "score": float(window[local]),
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

    def _public_result(self, item: dict[str, Any]) -> dict[str, Any]:
        index = self.index
        assert index is not None
        track = index.tracks[item["row"]]
        return {
            "rank": item["rank"],
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
