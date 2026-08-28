"""Esquema y validación de eventos de telemetría.

Nada llega a disco sin pasar por aquí: el cliente no escribe JSON arbitrario.
Los campos que puede fijar el servidor los fija el servidor, aunque el cliente
los mande.
"""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Any, Iterable

SCHEMA_VERSION = 1
SEARCH_VERSION = "hybrid-v1"

EVENT_TYPES = (
    "search_performed",
    "result_clicked",
    "play_started",
    "play_summary",
    "play_completed",
    "quick_skip",
    "replay",
    "feedback_match",
    "feedback_no_match",
    "query_reformulated",
)

# Eventos que se refieren a un resultado concreto de una búsqueda.
TRACK_EVENTS = frozenset(
    {
        "result_clicked",
        "play_started",
        "play_summary",
        "play_completed",
        "quick_skip",
        "replay",
        "feedback_match",
        "feedback_no_match",
    }
)

FEEDBACK_EVENTS = frozenset({"feedback_match", "feedback_no_match"})

# Un salto por debajo de esto se lee como señal negativa débil. Nunca como un
# "no" explícito: puede ser que el usuario ya conociera la canción.
QUICK_SKIP_SECONDS = 8.0

MAX_STRING_LENGTH = 300
MAX_RANK = 50
MAX_SECONDS = 24 * 3600

_UUID_HEX = re.compile(r"^[0-9a-f]{8,64}$")


class EventValidationError(ValueError):
    """El evento no cumple el esquema. No se escribe nada."""


def new_id() -> str:
    return uuid.uuid4().hex


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _identificador(valor: Any, campo: str) -> str:
    if not isinstance(valor, str) or not _UUID_HEX.match(valor):
        raise EventValidationError(f"'{campo}' no es un identificador válido")
    return valor


def _texto(valor: Any, campo: str, *, maximo: int = MAX_STRING_LENGTH) -> str:
    if not isinstance(valor, str):
        raise EventValidationError(f"'{campo}' debe ser texto")
    recortado = valor.strip()
    if len(recortado) > maximo:
        raise EventValidationError(f"'{campo}' supera los {maximo} caracteres")
    return recortado


def _entero(valor: Any, campo: str, *, minimo: int, maximo: int) -> int:
    if isinstance(valor, bool) or not isinstance(valor, int):
        raise EventValidationError(f"'{campo}' debe ser un entero")
    if not minimo <= valor <= maximo:
        raise EventValidationError(f"'{campo}' fuera de rango ({minimo}..{maximo})")
    return valor


def _segundos(valor: Any, campo: str) -> float:
    if isinstance(valor, bool) or not isinstance(valor, (int, float)):
        raise EventValidationError(f"'{campo}' debe ser un número")
    numero = float(valor)
    if numero < 0:
        raise EventValidationError(f"'{campo}' no puede ser negativo")
    if numero > MAX_SECONDS:
        raise EventValidationError(f"'{campo}' es implausible ({numero} s)")
    return round(numero, 3)


def validate_event(
    payload: Any,
    *,
    known_track_ids: Iterable[str] | None = None,
    known_search_ids: Iterable[str] | None = None,
    index_version: str = "",
) -> dict[str, Any]:
    """Valida y normaliza un evento del cliente.

    Devuelve el evento listo para escribir, con el sobre rellenado por el
    servidor. Lanza `EventValidationError` si algo no cuadra.
    """
    if not isinstance(payload, dict):
        raise EventValidationError("El evento debe ser un objeto JSON")

    tipo = payload.get("event_type")
    if tipo not in EVENT_TYPES:
        raise EventValidationError(f"Tipo de evento desconocido: {tipo!r}")

    evento: dict[str, Any] = {
        # El sobre lo pone el servidor, no el cliente: una marca de tiempo o una
        # versión de índice enviadas desde el navegador no son de fiar.
        "schema_version": SCHEMA_VERSION,
        "event_type": tipo,
        "event_id": new_id(),
        "timestamp": utc_now(),
        "search_version": SEARCH_VERSION,
        "index_version": index_version,
    }

    if "anon_session_id" in payload:
        evento["anon_session_id"] = _identificador(payload["anon_session_id"], "anon_session_id")

    if tipo == "query_reformulated":
        evento["previous_search_id"] = _identificador(payload.get("previous_search_id"), "previous_search_id")
        evento["new_search_id"] = _identificador(payload.get("new_search_id"), "new_search_id")
        evento["time_delta_seconds"] = _segundos(payload.get("time_delta_seconds", 0), "time_delta_seconds")
        return evento

    evento["search_id"] = _identificador(payload.get("search_id"), "search_id")
    if known_search_ids is not None and evento["search_id"] not in set(known_search_ids):
        raise EventValidationError("search_id desconocido")

    if tipo not in TRACK_EVENTS:
        return evento

    track_id = _texto(payload.get("track_id"), "track_id", maximo=120)
    if known_track_ids is not None and track_id not in set(known_track_ids):
        raise EventValidationError("track_id desconocido")
    evento["track_id"] = track_id

    if payload.get("composition_id"):
        evento["composition_id"] = _texto(payload["composition_id"], "composition_id", maximo=120)

    if payload.get("rank") is not None:
        evento["rank"] = _entero(payload["rank"], "rank", minimo=1, maximo=MAX_RANK)

    if tipo in {"play_summary", "play_completed", "quick_skip"}:
        evento["seconds_listened"] = _segundos(payload.get("seconds_listened", 0), "seconds_listened")
        duracion = _segundos(payload.get("track_duration", 0), "track_duration")
        evento["track_duration"] = duracion
        # La proporción se calcula aquí y no se acepta del cliente: es la métrica
        # con la que después se juzga la relevancia.
        proporcion = evento["seconds_listened"] / duracion if duracion > 0 else 0.0
        evento["listen_ratio"] = round(min(1.0, max(0.0, proporcion)), 4)
        evento["completed"] = bool(payload.get("completed", False))

    return evento
