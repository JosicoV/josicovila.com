from __future__ import annotations

import json
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from .errors import (
    MalformedRequest,
    MethodNotAllowed,
    PayloadTooLarge,
    RouteNotFound,
    ServiceError,
)
from .observability import StructuredLogger, new_request_id
from .pipeline import SearchService

MAX_BODY_BYTES = 16 * 1024
POST_ROUTES = ("/search", "/suggest", "/events")
GET_ROUTES = ("/health",)


def _read_json_body(handler: BaseHTTPRequestHandler) -> Any:
    raw_length = handler.headers.get("Content-Length")
    try:
        length = int(raw_length) if raw_length is not None else 0
    except ValueError as error:
        raise MalformedRequest(f"Invalid Content-Length: {raw_length}") from error
    if length > MAX_BODY_BYTES:
        raise PayloadTooLarge(f"Body of {length} bytes exceeds {MAX_BODY_BYTES}")
    if length <= 0:
        raise MalformedRequest("Request body is empty")
    body = handler.rfile.read(length)
    try:
        return json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise MalformedRequest(f"Body is not valid UTF-8 JSON: {error}") from error


def create_handler(service: SearchService, logger: StructuredLogger) -> type[BaseHTTPRequestHandler]:
    class SearchRequestHandler(BaseHTTPRequestHandler):
        server_version = "music-intelligence-v2"
        sys_version = ""
        protocol_version = "HTTP/1.1"

        def log_message(self, format: str, *args: Any) -> None:  # noqa: A002 - stdlib signature
            """Silence the default stderr access log; we emit structured records."""

        def _respond(self, status: int, payload: dict[str, Any], request_id: str) -> None:
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("X-Request-Id", request_id)
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def _handle(self, method: str) -> None:
            request_id = new_request_id()
            started = time.perf_counter()
            path = self.path.split("?", 1)[0].rstrip("/") or "/"
            try:
                if path not in GET_ROUTES + POST_ROUTES:
                    raise RouteNotFound(path)
                allowed = "GET" if path in GET_ROUTES else "POST"
                if method != allowed:
                    raise MethodNotAllowed(f"{method} {path}")

                if method == "GET":
                    payload = service.health()
                    status = 200 if payload["status"] == "ok" else 503
                    self._respond(status, payload, request_id)
                    logger.emit(
                        "health",
                        request_id=request_id,
                        path=path,
                        http_status=status,
                        index_version=payload.get("index_version"),
                        total_ms=round((time.perf_counter() - started) * 1000, 3),
                    )
                    return

                body = _read_json_body(self)
                if path == "/events":
                    payload = service.record_event(body)
                    self._respond(200, payload, request_id)
                    logger.emit(
                        "event_recorded",
                        request_id=request_id,
                        http_status=200,
                        event_type=body.get("event_type") if isinstance(body, dict) else None,
                        total_ms=round((time.perf_counter() - started) * 1000, 3),
                    )
                    return

                if path == "/suggest":
                    payload = service.suggest(body)
                    self._respond(200, payload, request_id)
                    logger.emit(
                        "suggest",
                        request_id=request_id,
                        http_status=200,
                        total_ms=round((time.perf_counter() - started) * 1000, 3),
                    )
                    return

                response, telemetry = service.search(body)
                self._respond(200, response, request_id)
                logger.emit(
                    "search",
                    request_id=request_id,
                    http_status=200,
                    query=response["query_original"],
                    query_normalized_en=response["query_normalized_en"],
                    **telemetry,
                )
            except ServiceError as error:
                self._respond(error.http_status, error.to_public_dict(), request_id)
                logger.emit(
                    "request_failed",
                    request_id=request_id,
                    path=path,
                    method=method,
                    http_status=error.http_status,
                    error_code=error.code,
                    error_detail=error.detail,
                    total_ms=round((time.perf_counter() - started) * 1000, 3),
                )
            except Exception as error:  # noqa: BLE001 - never leak a traceback to a caller
                failure = ServiceError(f"{type(error).__name__}: {error}")
                self._respond(failure.http_status, failure.to_public_dict(), request_id)
                logger.emit(
                    "request_crashed",
                    request_id=request_id,
                    path=path,
                    method=method,
                    http_status=failure.http_status,
                    error_code=failure.code,
                    error_detail=failure.detail,
                    total_ms=round((time.perf_counter() - started) * 1000, 3),
                )

        def do_GET(self) -> None:  # noqa: N802 - stdlib signature
            self._handle("GET")

        def do_POST(self) -> None:  # noqa: N802 - stdlib signature
            self._handle("POST")

        def do_PUT(self) -> None:  # noqa: N802 - stdlib signature
            self._handle("PUT")

        def do_DELETE(self) -> None:  # noqa: N802 - stdlib signature
            self._handle("DELETE")

    return SearchRequestHandler


def create_server(
    service: SearchService,
    logger: StructuredLogger,
    *,
    host: str = "127.0.0.1",
    port: int = 8100,
) -> ThreadingHTTPServer:
    server = ThreadingHTTPServer((host, port), create_handler(service, logger))
    server.daemon_threads = True
    return server
