from __future__ import annotations

import argparse
import csv
import hashlib
import json
import mimetypes
import os
import re
import shutil
import tempfile
import threading
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

SERVICE_ROOT = Path(__file__).resolve().parent
REPOSITORY_ROOT = SERVICE_ROOT.parents[1]
BENCHMARK_ROOT = REPOSITORY_ROOT / "benchmarks" / "music-intelligence-v2"
STATIC_ROOT = SERVICE_ROOT / "review_app"
DEFAULT_CSV = BENCHMARK_ROOT / "human_review_phase1.csv"
DEFAULT_SUBSET = BENCHMARK_ROOT / "track_subset.json"

HUMAN_FIELDS = (
    "human_score",
    "instrument_correct",
    "mood_correct",
    "energy_correct",
    "scene_correct",
    "contradiction",
    "notes",
)
QUICK_MODELS = {"figma", "muq_mulan"}
QUICK_MODES = {"segment", "hybrid"}
BOOLEAN_FIELDS = {
    "instrument_correct",
    "mood_correct",
    "energy_correct",
    "scene_correct",
    "contradiction",
}


class ReviewValidationError(ValueError):
    pass


def parse_byte_range(header: str | None, file_size: int) -> tuple[int, int] | None:
    if not header:
        return None
    match = re.fullmatch(r"bytes=(\d*)-(\d*)", header.strip())
    if not match:
        raise ReviewValidationError("Unsupported Range header")
    start_text, end_text = match.groups()
    if not start_text and not end_text:
        raise ReviewValidationError("Empty byte range")
    if not start_text:
        suffix = int(end_text)
        if suffix <= 0:
            raise ReviewValidationError("Invalid suffix range")
        start = max(0, file_size - suffix)
        end = file_size - 1
    else:
        start = int(start_text)
        end = int(end_text) if end_text else file_size - 1
    if start >= file_size or start < 0 or end < start:
        raise ReviewValidationError("Range outside file")
    return start, min(end, file_size - 1)


class ReviewStore:
    def __init__(
        self,
        csv_path: Path = DEFAULT_CSV,
        subset_path: Path = DEFAULT_SUBSET,
        repository_root: Path = REPOSITORY_ROOT,
    ) -> None:
        self.csv_path = csv_path.resolve()
        self.subset_path = subset_path.resolve()
        self.repository_root = repository_root.resolve()
        self._lock = threading.RLock()
        self._tracks = self._load_tracks()

    def _load_tracks(self) -> dict[str, dict[str, Any]]:
        tracks = json.loads(self.subset_path.read_text(encoding="utf-8"))
        result = {}
        music_root = (self.repository_root / "data" / "musica").resolve()
        for track in tracks:
            audio_path = (self.repository_root / track["audio_path"]).resolve()
            try:
                audio_path.relative_to(music_root)
            except ValueError as error:
                raise ReviewValidationError(f"Audio outside data/musica: {audio_path}") from error
            if not audio_path.is_file():
                raise FileNotFoundError(audio_path)
            result[track["track_id"]] = {**track, "resolved_audio_path": audio_path}
        return result

    def _read_rows(self) -> tuple[list[str], list[dict[str, str]]]:
        with self.csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            if reader.fieldnames is None:
                raise ReviewValidationError("CSV has no header")
            missing = [field for field in HUMAN_FIELDS if field not in reader.fieldnames]
            if missing:
                raise ReviewValidationError(f"CSV missing fields: {', '.join(missing)}")
            return list(reader.fieldnames), list(reader)

    @staticmethod
    def _review_id(row: dict[str, str]) -> str:
        key = "\x1f".join(row[field] for field in ("query", "model", "mode", "rank", "track_id"))
        return hashlib.sha1(key.encode("utf-8")).hexdigest()[:16]

    @staticmethod
    def _judgment_key(row: dict[str, str]) -> tuple[str, str, str, str]:
        return (
            row["query"],
            row["track_id"],
            row["best_segment_start"],
            row["best_segment_end"],
        )

    def _quick_review(self, rows: list[dict[str, str]], enriched: list[dict[str, Any]]) -> dict[str, Any]:
        all_by_key: dict[tuple[str, str, str, str], list[int]] = {}
        quick_by_key: dict[tuple[str, str, str, str], list[int]] = {}
        for index, row in enumerate(rows):
            key = self._judgment_key(row)
            all_by_key.setdefault(key, []).append(index)
            if row["model"] in QUICK_MODELS and row["mode"] in QUICK_MODES and row["rank"] == "1":
                quick_by_key.setdefault(key, []).append(index)

        quick_rows = []
        for quick_index, (key, candidate_indices) in enumerate(quick_by_key.items()):
            equivalent_indices = all_by_key[key]
            representative = dict(enriched[candidate_indices[0]])
            conflicts = []
            for field in HUMAN_FIELDS:
                values = list(dict.fromkeys(rows[index][field] for index in equivalent_indices if rows[index][field]))
                representative[field] = values[0] if values else ""
                if len(values) > 1:
                    conflicts.append(field)
            representative.update(
                {
                    "quick_index": quick_index,
                    "equivalent_row_indices": equivalent_indices,
                    "human_conflicts": conflicts,
                    "systems": [
                        {
                            "model": rows[index]["model"],
                            "mode": rows[index]["mode"],
                            "score": rows[index]["score"],
                        }
                        for index in candidate_indices
                    ],
                }
            )
            quick_rows.append(representative)

        reviewed = sum(bool(row["human_score"]) for row in quick_rows)
        return {
            "rows": quick_rows,
            "summary": {"total": len(quick_rows), "reviewed": reviewed},
            "candidate_rows": sum(len(indices) for indices in quick_by_key.values()),
        }

    def bootstrap(self) -> dict[str, Any]:
        with self._lock:
            _, rows = self._read_rows()
        enriched: list[dict[str, Any]] = []
        for index, row in enumerate(rows):
            track = self._tracks.get(row["track_id"])
            if track is None:
                raise ReviewValidationError(f"Unknown track_id in CSV: {row['track_id']}")
            enriched.append(
                {
                    **row,
                    "row_index": index,
                    "review_id": self._review_id(row),
                    "album": track["album"],
                    "audio_url": f"/api/audio/{row['track_id']}",
                }
            )
        models = list(dict.fromkeys(row["model"] for row in rows))
        modes = list(dict.fromkeys(row["mode"] for row in rows))
        queries = list(dict.fromkeys(row["query"] for row in rows))
        reviewed = sum(bool(row["human_score"]) for row in rows)
        return {
            "rows": enriched,
            "quick_review": self._quick_review(rows, enriched),
            "models": models,
            "modes": modes,
            "queries": queries,
            "summary": {"total": len(rows), "reviewed": reviewed},
        }

    def update(
        self,
        row_index: int,
        changes: dict[str, Any],
        propagate_equivalent: bool = False,
    ) -> dict[str, Any]:
        if not isinstance(row_index, int):
            raise ReviewValidationError("row_index must be an integer")
        unknown = set(changes) - set(HUMAN_FIELDS)
        if unknown:
            raise ReviewValidationError(f"Unsupported fields: {', '.join(sorted(unknown))}")

        normalized: dict[str, str] = {}
        for field, raw_value in changes.items():
            value = "" if raw_value is None else str(raw_value).strip()
            if field == "human_score" and value not in {"", "0", "1", "2", "3"}:
                raise ReviewValidationError("human_score must be blank or 0–3")
            if field in BOOLEAN_FIELDS and value not in {"", "yes", "no"}:
                raise ReviewValidationError(f"{field} must be blank, yes or no")
            if field == "notes":
                value = value.replace("\r\n", "\n").replace("\r", "\n")
                if len(value) > 2000:
                    raise ReviewValidationError("notes must not exceed 2000 characters")
            normalized[field] = value

        with self._lock:
            fieldnames, rows = self._read_rows()
            if row_index < 0 or row_index >= len(rows):
                raise ReviewValidationError("row_index outside CSV")
            if not isinstance(propagate_equivalent, bool):
                raise ReviewValidationError("propagate_equivalent must be a boolean")
            target_key = self._judgment_key(rows[row_index])
            row_indices = (
                [
                    index
                    for index, row in enumerate(rows)
                    if self._judgment_key(row) == target_key
                ]
                if propagate_equivalent
                else [row_index]
            )
            for index in row_indices:
                rows[index].update(normalized)
            backup_path = self.csv_path.with_suffix(self.csv_path.suffix + ".bak")
            if not backup_path.exists():
                shutil.copy2(self.csv_path, backup_path)
            self._write_atomic(fieldnames, rows)
            reviewed = sum(bool(row["human_score"]) for row in rows)
            quick_review = self._quick_review(rows, [{**row} for row in rows])
            return {
                "row_index": row_index,
                "row_indices": row_indices,
                "review_id": self._review_id(rows[row_index]),
                "saved": normalized,
                "summary": {"total": len(rows), "reviewed": reviewed},
                "quick_summary": quick_review["summary"],
            }

    def _write_atomic(self, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
        self.csv_path.parent.mkdir(parents=True, exist_ok=True)
        temporary_name = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8-sig",
                newline="",
                delete=False,
                dir=self.csv_path.parent,
                prefix=f".{self.csv_path.name}.",
                suffix=".tmp",
            ) as handle:
                temporary_name = handle.name
                writer = csv.DictWriter(handle, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(rows)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary_name, self.csv_path)
        finally:
            if temporary_name and Path(temporary_name).exists():
                Path(temporary_name).unlink()

    def audio_path(self, track_id: str) -> Path:
        track = self._tracks.get(track_id)
        if track is None:
            raise KeyError(track_id)
        return track["resolved_audio_path"]


class ReviewRequestHandler(BaseHTTPRequestHandler):
    server_version = "MusicReview/1.0"
    protocol_version = "HTTP/1.1"

    @property
    def store(self) -> ReviewStore:
        return self.server.review_store  # type: ignore[attr-defined]

    def handle(self) -> None:
        try:
            super().handle()
        except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
            # The media element may close an idle keep-alive connection after
            # seeking or switching tracks. It is expected browser behaviour.
            pass

    def log_message(self, format_string: str, *args: Any) -> None:
        print(f"{self.address_string()} - {format_string % args}")

    def _security_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self'; media-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
        )

    def _send_json(self, payload: Any, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._security_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_error_json(self, status: HTTPStatus, message: str) -> None:
        self._send_json({"error": message}, status)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self._send_json({"status": "ok"})
            return
        if parsed.path == "/api/bootstrap":
            try:
                self._send_json(self.store.bootstrap())
            except (OSError, ValueError) as error:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(error))
            return
        if parsed.path.startswith("/api/audio/"):
            self._serve_audio(unquote(parsed.path.removeprefix("/api/audio/")), head_only=False)
            return
        self._serve_static(parsed.path)

    def do_HEAD(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/audio/"):
            self._serve_audio(unquote(parsed.path.removeprefix("/api/audio/")), head_only=True)
            return
        self._serve_static(parsed.path, head_only=True)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path != "/api/review":
            self._send_error_json(HTTPStatus.NOT_FOUND, "Not found")
            return
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length <= 0 or content_length > 65536:
                raise ReviewValidationError("Invalid request size")
            payload = json.loads(self.rfile.read(content_length).decode("utf-8"))
            if not isinstance(payload, dict):
                raise ReviewValidationError("JSON object expected")
            row_index = payload.get("row_index")
            changes = payload.get("changes")
            if not isinstance(changes, dict):
                raise ReviewValidationError("changes object expected")
            propagate_equivalent = payload.get("propagate_equivalent", False)
            result = self.store.update(row_index, changes, propagate_equivalent)
            self._send_json(result)
        except (json.JSONDecodeError, ReviewValidationError) as error:
            self._send_error_json(HTTPStatus.BAD_REQUEST, str(error))
        except OSError as error:
            self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(error))

    def _serve_static(self, request_path: str, head_only: bool = False) -> None:
        relative = "index.html" if request_path in {"", "/"} else request_path.lstrip("/")
        if relative not in {"index.html", "app.js", "styles.css"}:
            self._send_error_json(HTTPStatus.NOT_FOUND, "Not found")
            return
        path = STATIC_ROOT / relative
        if not path.is_file():
            self._send_error_json(HTTPStatus.NOT_FOUND, "Static asset missing")
            return
        body = path.read_bytes()
        mime_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        self.send_response(HTTPStatus.OK)
        self._security_headers()
        self.send_header("Content-Type", f"{mime_type}; charset=utf-8" if mime_type.startswith("text/") or mime_type == "application/javascript" else mime_type)
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if not head_only:
            self.wfile.write(body)

    def _serve_audio(self, track_id: str, head_only: bool) -> None:
        try:
            path = self.store.audio_path(track_id)
        except KeyError:
            self._send_error_json(HTTPStatus.NOT_FOUND, "Unknown track")
            return
        file_size = path.stat().st_size
        try:
            byte_range = parse_byte_range(self.headers.get("Range"), file_size)
        except ReviewValidationError as error:
            self.send_response(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
            self._security_headers()
            self.send_header("Content-Range", f"bytes */{file_size}")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        start, end = byte_range if byte_range else (0, file_size - 1)
        content_length = end - start + 1
        self.send_response(HTTPStatus.PARTIAL_CONTENT if byte_range else HTTPStatus.OK)
        self._security_headers()
        self.send_header("Content-Type", "audio/mpeg")
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(content_length))
        if byte_range:
            self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
        self.end_headers()
        if head_only:
            return
        with path.open("rb") as handle:
            handle.seek(start)
            remaining = content_length
            while remaining:
                chunk = handle.read(min(256 * 1024, remaining))
                if not chunk:
                    break
                try:
                    self.wfile.write(chunk)
                except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
                    # Browsers routinely cancel a range request when the user
                    # seeks or selects another track. That is a normal media
                    # control event, not a server error.
                    break
                remaining -= len(chunk)


def create_server(host: str, port: int, store: ReviewStore | None = None) -> ThreadingHTTPServer:
    server = ThreadingHTTPServer((host, port), ReviewRequestHandler)
    server.review_store = store or ReviewStore()  # type: ignore[attr-defined]
    return server


def main() -> None:
    parser = argparse.ArgumentParser(description="Local human review app for the Phase 1 benchmark")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8091)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    args = parser.parse_args()
    store = ReviewStore(csv_path=args.csv)
    server = create_server(args.host, args.port, store)
    print(f"Music Intelligence v2 review app: http://{args.host}:{args.port}")
    print(f"CSV: {args.csv.resolve()}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
