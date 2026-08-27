"""Run the isolated music-intelligence search service.

Local development only: it binds to loopback by default, opens no production
port and never touches the PHP site.
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parent
REPOSITORY_ROOT = SERVICE_ROOT.parents[1]
sys.path.insert(0, str(SERVICE_ROOT / "src"))

from music_intelligence_v2.service.bootstrap import build_service  # noqa: E402
from music_intelligence_v2.service.errors import ServiceError  # noqa: E402
from music_intelligence_v2.service.http import create_server  # noqa: E402
from music_intelligence_v2.service.observability import StructuredLogger  # noqa: E402

DEFAULT_INDEX_DIR = REPOSITORY_ROOT / "data" / "music-intelligence-v2" / "index"


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8100)
    parser.add_argument("--index-dir", type=Path, default=DEFAULT_INDEX_DIR)
    parser.add_argument("--model-registry", type=Path, default=SERVICE_ROOT / "config" / "model_registry.json")
    parser.add_argument(
        "--translation-registry",
        type=Path,
        default=SERVICE_ROOT / "config" / "translation_registry.json",
    )
    parser.add_argument("--device", choices=["auto", "cuda", "cpu"], default="auto")
    parser.add_argument(
        "--log-queries",
        action="store_true",
        help="Log raw user text. Development only; off by default.",
    )
    parser.add_argument(
        "--skip-models",
        action="store_true",
        help="Load the index only. /health reports degraded and /search returns model_unavailable.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_arguments()
    logger = StructuredLogger(log_queries=args.log_queries)
    started = time.perf_counter()
    try:
        bootstrap = build_service(
            index_dir=args.index_dir,
            model_registry=args.model_registry,
            translation_registry=args.translation_registry,
            repository_root=REPOSITORY_ROOT,
            device=args.device,
            load_models=not args.skip_models,
        )
    except ServiceError as error:
        logger.emit("startup_failed", error_code=error.code, error_detail=error.detail)
        return 1

    health = bootstrap.service.health()
    logger.emit(
        "startup",
        host=args.host,
        port=args.port,
        device=bootstrap.device,
        status=health["status"],
        index_version=health.get("index_version"),
        catalogue_tracks=health.get("catalogue_tracks"),
        startup_seconds=round(time.perf_counter() - started, 3),
        **{key: round(value, 3) for key, value in bootstrap.timings.items()},
    )

    server = create_server(bootstrap.service, logger, host=args.host, port=args.port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.emit("shutdown", reason="keyboard_interrupt")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
