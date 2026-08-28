"""Punto de entrada de la telemetría desde el servicio de búsqueda.

Es lo único que conoce la ruta del fichero: ni el contrato HTTP ni las
respuestas la mencionan nunca.
"""

from __future__ import annotations

from collections import deque
from pathlib import Path
from typing import Any

from ..telemetry import TelemetryWriter, new_id, utc_now, validate_event
from ..telemetry.schema import SCHEMA_VERSION, SEARCH_VERSION
from .hybrid import match_reasons

# Cuántos search_id recientes se recuerdan para poder validar que un evento se
# refiere a una búsqueda real. Acotado a propósito: es una defensa contra basura,
# no un registro de sesiones.
RECENT_SEARCHES = 2000


class TelemetryCollector:
    def __init__(
        self,
        root: Path,
        *,
        store_raw_query: bool = False,
    ) -> None:
        self.writer = TelemetryWriter(Path(root))
        # Guardar el texto de la consulta es lo que permite reentrenar el
        # ranking más adelante: sin él no se sabe a qué pregunta responde cada
        # juicio. Se activa explícitamente y se documenta.
        self.store_raw_query = store_raw_query
        self._recent: deque[str] = deque(maxlen=RECENT_SEARCHES)

    # ------------------------------------------------------------------ búsqueda

    def record_search(
        self,
        *,
        query: str,
        language: str,
        intent: str,
        normalized_query: str,
        anon_session_id: str | None,
        index: Any,
        results: list[dict[str, Any]],
    ) -> str:
        search_id = new_id()
        self._recent.append(search_id)

        instantanea = []
        for item in results:
            pista = index.tracks[item["row"]]
            literal = item.get("literal")
            # Las etiquetas se derivan igual que en la respuesta pública: se
            # recalculan aquí porque en el candidato interno todavía no existen.
            razones = match_reasons(literal, item.get("semantic_normalized", 0.0)) if literal else []
            instantanea.append(
                {
                    "track_id": pista.track_id,
                    "composition_id": pista.composition_id,
                    "rank": item["rank"],
                    "semantic_score": round(float(item["score"]), 6),
                    "literal_title_score": round(getattr(literal, "title_score", 0.0), 6),
                    "literal_album_score": round(getattr(literal, "album_score", 0.0), 6),
                    "hybrid_score": round(float(item.get("hybrid_score", item["score"])), 6),
                    "match_reasons": razones,
                }
            )

        evento: dict[str, Any] = {
            "schema_version": SCHEMA_VERSION,
            "event_type": "search_performed",
            "event_id": new_id(),
            "timestamp": utc_now(),
            "search_id": search_id,
            "search_version": SEARCH_VERSION,
            "index_version": index.index_version,
            "query_language": language,
            "query_intent": intent,
            "query_length": len(query.split()),
            "result_count": len(results),
            "results": instantanea,
        }
        if anon_session_id:
            evento["anon_session_id"] = anon_session_id
        if self.store_raw_query:
            evento["query"] = query
            evento["query_normalized_en"] = normalized_query

        self.writer.append(evento)
        return search_id

    # ------------------------------------------------------------------ eventos

    def record_event(self, payload: Any, *, index: Any = None) -> dict[str, Any]:
        """Valida un evento del cliente y lo escribe. Devuelve el acuse."""
        evento = validate_event(
            payload,
            known_track_ids={t.track_id for t in index.tracks} if index is not None else None,
            known_search_ids=set(self._recent) if self._recent else None,
            index_version=index.index_version if index is not None else "",
        )
        self.writer.append(evento)
        return {"ok": True, "event_id": evento["event_id"]}
