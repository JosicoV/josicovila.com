"""Telemetría de búsqueda y feedback de relevancia, en ficheros JSONL.

Sin base de datos: eventos que sólo se añaden al final, un fichero por día.
Nada de lo que hay aquí puede alterar el ranking ni romper una búsqueda.
"""

from .aggregate import build_dataset, consolidate_listening, mark_superseded, resolve_feedback, summarize
from .schema import (
    EVENT_TYPES,
    FEEDBACK_EVENTS,
    QUICK_SKIP_SECONDS,
    SCHEMA_VERSION,
    SEARCH_VERSION,
    EventValidationError,
    new_id,
    utc_now,
    validate_event,
)
from .writer import TelemetryWriter, load_events, read_events

__all__ = [
    "EVENT_TYPES",
    "FEEDBACK_EVENTS",
    "QUICK_SKIP_SECONDS",
    "SCHEMA_VERSION",
    "SEARCH_VERSION",
    "EventValidationError",
    "TelemetryWriter",
    "build_dataset",
    "consolidate_listening",
    "load_events",
    "mark_superseded",
    "new_id",
    "read_events",
    "resolve_feedback",
    "summarize",
    "utc_now",
    "validate_event",
]
