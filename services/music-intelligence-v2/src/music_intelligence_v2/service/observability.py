from __future__ import annotations

import json
import sys
import threading
import uuid
from datetime import datetime, timezone
from typing import Any, TextIO


def new_request_id() -> str:
    return uuid.uuid4().hex[:16]


class StructuredLogger:
    """One JSON object per line on stderr.

    Embeddings are never logged.  Raw user text is only logged when
    ``log_queries`` is explicitly enabled, which stays off outside development.
    """

    def __init__(self, stream: TextIO | None = None, *, log_queries: bool = False) -> None:
        self.stream = stream if stream is not None else sys.stderr
        self.log_queries = log_queries
        self._lock = threading.Lock()

    def emit(self, event: str, **fields: Any) -> dict[str, Any]:
        record: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
            "event": event,
        }
        for key, value in fields.items():
            if value is None:
                continue
            if key in {"query", "query_normalized_en"} and not self.log_queries:
                continue
            record[key] = value
        line = json.dumps(record, ensure_ascii=False, default=str)
        with self._lock:
            self.stream.write(line + "\n")
            self.stream.flush()
        return record
