"""Measure startup and per-request latency of the isolated search service.

Loads the real index, MuQ-MuLan and OPUS-MT, then times warm English and
Spanish queries both in-process and over the HTTP layer.  Read-only with
respect to the catalogue; writes one report under benchmarks/.
"""

from __future__ import annotations

import argparse
import io
import json
import os
import statistics
import sys
import threading
import time
import traceback
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SERVICE_ROOT = Path(__file__).resolve().parent
REPOSITORY_ROOT = SERVICE_ROOT.parents[1]
sys.path.insert(0, str(SERVICE_ROOT / "src"))

from music_intelligence_v2.service.bootstrap import build_service  # noqa: E402
from music_intelligence_v2.service.http import create_server  # noqa: E402
from music_intelligence_v2.service.observability import StructuredLogger  # noqa: E402

DEFAULT_INDEX_DIR = REPOSITORY_ROOT / "data" / "music-intelligence-v2" / "index"
DEFAULT_RESULTS_DIR = REPOSITORY_ROOT / "benchmarks" / "music-intelligence-v2" / "phase3"

ENGLISH_QUERIES = [
    "epic orchestral music with choir",
    "soft medieval flute in a quiet tavern",
    "dark cinematic music for a dragon battle",
    "calm and melancholic music",
    "hopeful adventure theme with strings",
    "tense music for walking through ancient ruins",
]
SPANISH_QUERIES = [
    "musica epica con coro",
    "flauta medieval suave",
    "musica oscura para una batalla de dragones",
    "musica tranquila y melancolica",
]


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--index-dir", type=Path, default=DEFAULT_INDEX_DIR)
    parser.add_argument("--model-registry", type=Path, default=SERVICE_ROOT / "config" / "model_registry.json")
    parser.add_argument(
        "--translation-registry",
        type=Path,
        default=SERVICE_ROOT / "config" / "translation_registry.json",
    )
    parser.add_argument("--results-dir", type=Path, default=DEFAULT_RESULTS_DIR)
    parser.add_argument("--device", choices=["auto", "cuda", "cpu"], default="auto")
    parser.add_argument("--warmup", type=int, default=2)
    parser.add_argument("--repeats", type=int, default=5)
    return parser.parse_args()


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def summarize(samples: list[float]) -> dict[str, float]:
    ordered = sorted(samples)
    return {
        "count": len(ordered),
        "mean_ms": round(statistics.fmean(ordered), 2),
        "median_ms": round(statistics.median(ordered), 2),
        "min_ms": round(ordered[0], 2),
        "max_ms": round(ordered[-1], 2),
        "p95_ms": round(ordered[min(len(ordered) - 1, int(round(0.95 * (len(ordered) - 1))))], 2),
    }


def measure_in_process(service, queries: list[str], warmup: int, repeats: int) -> dict[str, Any]:
    for query in queries[:warmup] or queries[:1]:
        service.search({"query": query})

    totals: list[float] = []
    translation: list[float] = []
    embedding: list[float] = []
    retrieval: list[float] = []
    for _ in range(repeats):
        for query in queries:
            started = time.perf_counter()
            _, telemetry = service.search({"query": query})
            totals.append((time.perf_counter() - started) * 1000)
            translation.append(telemetry["translation_ms"])
            embedding.append(telemetry["embedding_ms"])
            retrieval.append(telemetry["retrieval_ms"])
    return {
        "queries": len(queries),
        "total": summarize(totals),
        "translation": summarize(translation),
        "text_embedding": summarize(embedding),
        "retrieval_and_ranking": summarize(retrieval),
    }


def measure_over_http(service, queries: list[str], warmup: int, repeats: int) -> dict[str, Any]:
    logger = StructuredLogger(stream=io.StringIO())
    server = create_server(service, logger, host="127.0.0.1", port=0)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address[:2]
    base_url = f"http://{host}:{port}"
    try:
        def call(query: str) -> float:
            body = json.dumps({"query": query}).encode("utf-8")
            request = urllib.request.Request(
                f"{base_url}/search",
                data=body,
                method="POST",
                headers={"Content-Type": "application/json"},
            )
            started = time.perf_counter()
            with urllib.request.urlopen(request, timeout=60) as response:
                response.read()
            return (time.perf_counter() - started) * 1000

        for query in queries[:warmup] or queries[:1]:
            call(query)
        samples = [call(query) for _ in range(repeats) for query in queries]

        health_samples = []
        for _ in range(repeats):
            started = time.perf_counter()
            with urllib.request.urlopen(f"{base_url}/health", timeout=10) as response:
                response.read()
            health_samples.append((time.perf_counter() - started) * 1000)
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
    return {"search": summarize(samples), "health": summarize(health_samples)}


def main() -> int:
    args = parse_arguments()
    args.results_dir.mkdir(parents=True, exist_ok=True)
    status_path = args.results_dir / "RUN_STATUS.json"
    write_json(status_path, {"status": "starting"})
    try:
        process_started = time.perf_counter()
        bootstrap = build_service(
            index_dir=args.index_dir,
            model_registry=args.model_registry,
            translation_registry=args.translation_registry,
            repository_root=REPOSITORY_ROOT,
            device=args.device,
        )
        startup_seconds = time.perf_counter() - process_started
        service = bootstrap.service
        health = service.health()

        write_json(status_path, {"status": "measuring_english"})
        english = measure_in_process(service, ENGLISH_QUERIES, args.warmup, args.repeats)
        write_json(status_path, {"status": "measuring_spanish"})
        spanish = measure_in_process(service, SPANISH_QUERIES, args.warmup, args.repeats)
        write_json(status_path, {"status": "measuring_http"})
        http = measure_over_http(service, ENGLISH_QUERIES, args.warmup, args.repeats)

        peak_vram_bytes = None
        try:
            import torch

            if torch.cuda.is_available():
                peak_vram_bytes = int(torch.cuda.max_memory_allocated())
        except ImportError:
            pass

        report = {
            "measured_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "device": bootstrap.device,
            "index_version": health.get("index_version"),
            "catalogue_tracks": health.get("catalogue_tracks"),
            "catalogue_segments": health.get("catalogue_segments"),
            "startup": {
                "total_seconds": round(startup_seconds, 3),
                **{key: round(value, 3) for key, value in bootstrap.timings.items()},
            },
            "peak_vram_bytes": peak_vram_bytes,
            "english_in_process": english,
            "spanish_in_process": spanish,
            "http_round_trip": http,
        }
        write_json(args.results_dir / "latency.json", report)

        lines = [
            "# Phase 3 — search service latency",
            "",
            f"- Measured: {report['measured_at']}",
            f"- Device: `{report['device']}`",
            f"- Index: `{report['index_version']}` ({report['catalogue_tracks']} tracks, {report['catalogue_segments']} segments)",
            "",
            "## Startup",
            "",
            f"- Total service startup: {report['startup']['total_seconds']:.2f} s",
            f"- Index load: {report['startup'].get('index_load_seconds', 0):.3f} s",
            f"- Translator load: {report['startup'].get('translator_load_seconds', 0):.2f} s",
            f"- Retrieval model load: {report['startup'].get('model_load_seconds', 0):.2f} s",
        ]
        if peak_vram_bytes:
            lines.append(f"- Peak VRAM: {peak_vram_bytes / 1024 ** 3:.2f} GiB")
        lines += [
            "",
            "## Warm request latency",
            "",
            "| Path | Stage | Mean | Median | p95 | Max |",
            "| --- | --- | --- | --- | --- | --- |",
        ]
        for label, block in (("English", english), ("Spanish", spanish)):
            for stage in ("text_embedding", "retrieval_and_ranking", "translation", "total"):
                values = block[stage]
                lines.append(
                    f"| {label} | {stage.replace('_', ' ')} | {values['mean_ms']:.2f} ms | "
                    f"{values['median_ms']:.2f} ms | {values['p95_ms']:.2f} ms | {values['max_ms']:.2f} ms |"
                )
        for stage, values in (("search", http["search"]), ("health", http["health"])):
            lines.append(
                f"| HTTP | {stage} round trip | {values['mean_ms']:.2f} ms | "
                f"{values['median_ms']:.2f} ms | {values['p95_ms']:.2f} ms | {values['max_ms']:.2f} ms |"
            )
        lines += [
            "",
            "## Boundary",
            "",
            "Loopback only. No production port, PHP file, Docker service or deployment was touched.",
            "",
        ]
        (args.results_dir / "LATENCY_REPORT.md").write_text("\n".join(lines), encoding="utf-8")

        write_json(status_path, {"status": "complete", "report": report})
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0
    except Exception as error:  # noqa: BLE001 - benchmark records its own failures
        write_json(status_path, {"status": "failed", "error": f"{type(error).__name__}: {error}", "traceback": traceback.format_exc()})
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
