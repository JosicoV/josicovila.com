from __future__ import annotations

import argparse
import json
import math
import os
import platform
import subprocess
import sys
import time
import traceback
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

import numpy as np
import psutil


SERVICE_ROOT = Path(__file__).resolve().parent
REPOSITORY_ROOT = SERVICE_ROOT.parents[1]
sys.path.insert(0, str(SERVICE_ROOT / "src"))

from music_intelligence_v2.adapters import create_adapter
from music_intelligence_v2.adapters.base import l2_normalize
from music_intelligence_v2.cache import EmbeddingCache, cache_key
from music_intelligence_v2.preprocessing import extract_excerpt, load_audio, probe_duration, sliding_segment_bounds
from music_intelligence_v2.retrieval import rank_tracks, text_embedding_diversity


BENCHMARK_ROOT = REPOSITORY_ROOT / "benchmarks" / "music-intelligence-v2"
PHASE2_ROOT = BENCHMARK_ROOT / "phase2"
DATA_ROOT = REPOSITORY_ROOT / "data" / "music-intelligence-v2"


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="MuQ-MuLan segment validation on the complete catalog")
    parser.add_argument("--catalog", type=Path, default=PHASE2_ROOT / "full_catalog.json")
    parser.add_argument("--queries", type=Path, default=PHASE2_ROOT / "queries_en.json")
    parser.add_argument("--registry", type=Path, default=SERVICE_ROOT / "config" / "model_registry.json")
    parser.add_argument("--results-dir", type=Path, default=PHASE2_ROOT / "results")
    parser.add_argument("--cache-dir", type=Path, default=DATA_ROOT / "embeddings-phase2")
    parser.add_argument("--segment-seconds", type=float, default=25.0)
    parser.add_argument("--stride-seconds", type=float, default=12.5)
    parser.add_argument("--top-k", type=int, default=10)
    parser.add_argument("--device", choices=["auto", "cuda", "cpu"], default="auto")
    parser.add_argument("--force-recompute", action="store_true")
    return parser.parse_args()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def resolve_device(requested: str) -> str:
    import torch

    if requested == "auto":
        return "cuda" if torch.cuda.is_available() else "cpu"
    if requested == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("CUDA requested but unavailable")
    return requested


def environment_report(device: str) -> dict[str, Any]:
    import torch
    import torchaudio
    import transformers

    gpu = None
    if torch.cuda.is_available():
        properties = torch.cuda.get_device_properties(0)
        gpu = {"name": properties.name, "vram_bytes": properties.total_memory}
    nvidia_smi = None
    try:
        nvidia_smi = subprocess.check_output(
            [
                "nvidia-smi",
                "--query-gpu=name,driver_version,memory.total,memory.used,memory.free",
                "--format=csv,noheader,nounits",
            ],
            text=True,
            timeout=10,
        ).strip()
    except (OSError, subprocess.SubprocessError):
        pass
    memory = psutil.virtual_memory()
    return {
        "python": sys.version.split()[0],
        "platform": platform.platform(),
        "torch": torch.__version__,
        "torchaudio": torchaudio.__version__,
        "transformers": transformers.__version__,
        "device": device,
        "cuda_available": torch.cuda.is_available(),
        "cuda_runtime": torch.version.cuda,
        "gpu": gpu,
        "nvidia_smi_at_start": nvidia_smi,
        "system_ram_bytes": memory.total,
        "system_ram_available_bytes_at_start": memory.available,
    }


def validate_catalog(catalog: dict[str, Any]) -> list[dict[str, Any]]:
    tracks = catalog.get("tracks")
    if catalog.get("track_count") != 115 or not isinstance(tracks, list) or len(tracks) != 115:
        raise ValueError("Phase 2 requires the validated 115-track catalog")
    music_root = (REPOSITORY_ROOT / "data" / "musica").resolve()
    for track in tracks:
        audio_path = (REPOSITORY_ROOT / track["audio_path"]).resolve()
        try:
            audio_path.relative_to(music_root)
        except ValueError as error:
            raise ValueError(f"Audio outside data/musica: {audio_path}") from error
        if not audio_path.is_file():
            raise FileNotFoundError(audio_path)
    return tracks


def embed_catalog(adapter, tracks: list[dict[str, Any]], args, status_path: Path):
    cache = EmbeddingCache(args.cache_dir)
    model_info = adapter.info().to_dict()
    preprocessing = {
        "strategy": "sliding-window",
        "segment_seconds": args.segment_seconds,
        "stride_seconds": args.stride_seconds,
        "overlap_fraction": 1.0 - (args.stride_seconds / args.segment_seconds),
        "sample_rate": adapter.sample_rate,
        "audio_input_seconds": adapter.audio_input_seconds,
        "global_strategy": "l2-normalized mean of all segment embeddings",
    }
    embedded_tracks = []
    index_tracks = []
    total_inference_seconds = 0.0
    started_all = time.perf_counter()

    for index, track in enumerate(tracks, 1):
        audio_path = REPOSITORY_ROOT / track["audio_path"]
        key = cache_key(audio_path, model_info, preprocessing)
        cached = None if args.force_recompute else cache.load(adapter.key, track["track_id"], key)
        started = time.perf_counter()
        inference_seconds = 0.0
        if cached is None:
            duration = probe_duration(audio_path)
            waveform = load_audio(audio_path, adapter.sample_rate)
            bounds = sliding_segment_bounds(duration, args.segment_seconds, args.stride_seconds)
            embeddings = []
            for start, end in bounds:
                excerpt = extract_excerpt(waveform, adapter.sample_rate, start, end, adapter.audio_input_seconds)
                inference_started = time.perf_counter()
                embeddings.append(adapter.embed_audio(excerpt, adapter.sample_rate))
                inference_seconds += time.perf_counter() - inference_started
            segments = np.stack(embeddings).astype(np.float32)
            global_embedding = l2_normalize(segments.mean(axis=0)).astype(np.float32)
            starts = np.asarray([bound[0] for bound in bounds], dtype=np.float32)
            ends = np.asarray([bound[1] for bound in bounds], dtype=np.float32)
            cache_path = cache.save(
                adapter.key,
                track["track_id"],
                key,
                global_embedding=global_embedding,
                segment_embeddings=segments,
                segment_starts=starts,
                segment_ends=ends,
                duration=np.asarray([duration], dtype=np.float32),
            )
            cached = {
                "global_embedding": global_embedding,
                "segment_embeddings": segments,
                "segment_starts": starts,
                "segment_ends": ends,
                "duration": np.asarray([duration], dtype=np.float32),
            }
            cache_hit = False
        else:
            cache_path = cache.path_for(adapter.key, track["track_id"], key)
            cache_hit = True

        segments = np.asarray(cached["segment_embeddings"], dtype=np.float32)
        if segments.ndim != 2 or len(segments) == 0 or not np.isfinite(segments).all():
            raise ValueError(f"Invalid cached embeddings for {track['track_id']}")
        norms = np.linalg.norm(segments, axis=1)
        if not np.allclose(norms, 1.0, atol=1e-3):
            raise ValueError(f"Non-normalized embeddings for {track['track_id']}")

        elapsed = time.perf_counter() - started
        total_inference_seconds += inference_seconds
        embedded_tracks.append(
            {
                **track,
                "duration_seconds": float(cached["duration"][0]),
                "global_embedding": np.asarray(cached["global_embedding"], dtype=np.float32),
                "segment_embeddings": segments,
                "segment_starts": np.asarray(cached["segment_starts"], dtype=np.float32),
                "segment_ends": np.asarray(cached["segment_ends"], dtype=np.float32),
            }
        )
        index_tracks.append(
            {
                **track,
                "duration_seconds": float(cached["duration"][0]),
                "segment_count": len(segments),
                "cache_hit": cache_hit,
                "processing_seconds": elapsed,
                "inference_seconds": inference_seconds,
                "cache_file": cache_path.relative_to(REPOSITORY_ROOT).as_posix(),
                "cache_bytes": cache_path.stat().st_size,
            }
        )
        status = {
            "status": "embedding",
            "completed_tracks": index,
            "total_tracks": len(tracks),
            "completed_segments": sum(item["segment_count"] for item in index_tracks),
            "last_track": track["title"],
            "elapsed_seconds": time.perf_counter() - started_all,
        }
        write_json(status_path, status)
        print(
            f"[muq_mulan] {index:03d}/{len(tracks):03d} {track['title']} "
            f"({len(segments)} segments, {'cache' if cache_hit else 'embedded'})",
            flush=True,
        )

    metrics = {
        "preprocessing": preprocessing,
        "total_seconds": time.perf_counter() - started_all,
        "total_inference_seconds": total_inference_seconds,
        "total_segments": sum(item["segment_count"] for item in index_tracks),
        "cache_hits": sum(item["cache_hit"] for item in index_tracks),
        "tracks": index_tracks,
    }
    return embedded_tracks, metrics


def run_queries(adapter, embedded_tracks, queries: list[dict[str, str]], top_k: int, status_path: Path):
    query_outputs = []
    text_embeddings = []
    started_all = time.perf_counter()
    for index, query in enumerate(queries, 1):
        text_started = time.perf_counter()
        embedding = adapter.embed_texts([query["text"]])[0]
        text_seconds = time.perf_counter() - text_started
        retrieval_started = time.perf_counter()
        results = rank_tracks(embedding, embedded_tracks, "segment", top_k=top_k)
        retrieval_seconds = time.perf_counter() - retrieval_started
        if len(results) != top_k or any(not math.isfinite(item["score"]) for item in results):
            raise ValueError(f"Invalid ranking for query {query['query_id']}")
        text_embeddings.append(embedding)
        query_outputs.append(
            {
                **query,
                "text_embedding_seconds": text_seconds,
                "retrieval_seconds": retrieval_seconds,
                "results": results,
            }
        )
        write_json(
            status_path,
            {
                "status": "querying",
                "completed_queries": index,
                "total_queries": len(queries),
                "last_query": query["text"],
                "elapsed_seconds": time.perf_counter() - started_all,
            },
        )
        print(f"[muq_mulan] query {index:02d}/{len(queries):02d}: {query['text']}", flush=True)

    validation = text_embedding_diversity(np.stack(text_embeddings))
    if validation["collapsed"]:
        raise RuntimeError("Text embedding collapse detected in Phase 2")
    return query_outputs, validation


def summarize_results(query_outputs: list[dict[str, Any]]) -> dict[str, Any]:
    top1 = [query["results"][0]["track_id"] for query in query_outputs]
    top5 = [item["track_id"] for query in query_outputs for item in query["results"][:5]]
    top10 = [item["track_id"] for query in query_outputs for item in query["results"]]
    category_top1: dict[str, list[str]] = defaultdict(list)
    for query in query_outputs:
        category_top1[query["category"]].append(query["results"][0]["track_id"])
    top1_counts = Counter(top1)
    signatures = Counter(tuple(item["track_id"] for item in query["results"][:5]) for query in query_outputs)
    return {
        "query_count": len(query_outputs),
        "top1_distinct_tracks": len(set(top1)),
        "top5_catalog_coverage": len(set(top5)),
        "top10_catalog_coverage": len(set(top10)),
        "top1_most_common": [
            {"track_id": track_id, "count": count}
            for track_id, count in top1_counts.most_common(10)
        ],
        "maximum_top1_repetition": max(top1_counts.values()),
        "maximum_identical_top5_signature_repetition": max(signatures.values()),
        "category_top1_diversity": {
            category: {"queries": len(values), "distinct_tracks": len(set(values))}
            for category, values in category_top1.items()
        },
    }


def render_report(
    model_info,
    environment,
    embedding_metrics,
    summary,
    validation,
    load_seconds,
    peak_vram,
    initial_performance=None,
) -> str:
    initial_lines = []
    if initial_performance:
        initial_embedding = initial_performance["embedding"]
        initial_lines = [
            f"- Initial catalog build: {initial_embedding['total_seconds']:.2f} s "
            f"({initial_embedding['total_inference_seconds']:.2f} s fresh inference, "
            f"{initial_embedding['cache_hits']}/115 prior cache hits).",
            f"- Initial peak allocated VRAM: {initial_performance['peak_vram_bytes'] / 2**30:.2f} GiB.",
        ]
    return "\n".join(
        [
            "# Phase 2 — full-catalog MuQ-MuLan segment validation",
            "",
            "## Configuration",
            "",
            f"- Model: `{model_info['name']}`.",
            f"- Checkpoint: `{model_info['checkpoint']}` at `{model_info['revision']}`.",
            f"- License: `{model_info.get('license', 'unknown')}`.",
            f"- Device: `{environment['device']}` ({environment.get('nvidia_smi_at_start') or 'CPU'}).",
            f"- Tracks: {len(embedding_metrics['tracks'])}.",
            f"- Segments: {embedding_metrics['total_segments']} windows of "
            f"{embedding_metrics['preprocessing']['segment_seconds']:g} s with "
            f"{embedding_metrics['preprocessing']['stride_seconds']:g} s stride.",
            "- Retrieval mode: best segment cosine similarity.",
            "",
            "## Performance",
            "",
            f"- Model load: {load_seconds:.2f} s.",
            f"- Catalog embedding/cache load: {embedding_metrics['total_seconds']:.2f} s.",
            f"- Fresh inference time: {embedding_metrics['total_inference_seconds']:.2f} s.",
            f"- Cache hits: {embedding_metrics['cache_hits']}/115.",
            f"- Peak allocated VRAM: {peak_vram / 2**30:.2f} GiB." if peak_vram else "- Peak allocated VRAM: not measured.",
            *initial_lines,
            "",
            "## Automated retrieval checks",
            "",
            f"- English queries: {summary['query_count']}.",
            f"- Distinct top-1 tracks: {summary['top1_distinct_tracks']}.",
            f"- Catalog coverage in top 5: {summary['top5_catalog_coverage']}/115.",
            f"- Catalog coverage in top 10: {summary['top10_catalog_coverage']}/115.",
            f"- Maximum repetition of one top-1 track: {summary['maximum_top1_repetition']}/60 queries.",
            f"- Maximum repeated identical top-5 ranking: {summary['maximum_identical_top5_signature_repetition']}.",
            f"- Text embedding collapse guard: {'FAILED' if validation['collapsed'] else 'passed'} "
            f"(mean off-diagonal cosine {validation['mean_off_diagonal_cosine']:.4f}).",
            "",
            "## Interpretation and next guardrails",
            "",
            "- The rankings are technically valid, but automated diversity does not replace semantic human review.",
            f"- Top-1 concentration remains visible: one track leads {summary['maximum_top1_repetition']}/60 queries.",
            "- Alternate recordings or versions of one composition can occupy several positions in the same top 10.",
            "- Before UI integration, add canonical-track grouping/diversification and validate Spanish-to-English consistency.",
            "",
            "## Boundary",
            "",
            "This run creates an offline index and validation report only. It does not modify or connect to the PHP frontend, API, Docker configuration or production deployment.",
            "",
        ]
    )


def main() -> int:
    args = parse_arguments()
    args.results_dir.mkdir(parents=True, exist_ok=True)
    status_path = args.results_dir / "RUN_STATUS.json"
    write_json(status_path, {"status": "starting"})
    adapter = None
    try:
        import torch

        catalog = read_json(args.catalog)
        tracks = validate_catalog(catalog)
        queries = read_json(args.queries)
        if len(queries) != 60:
            raise ValueError("Phase 2 requires 60 English validation queries")
        registry = read_json(args.registry)
        config = registry["muq_mulan"]
        device = resolve_device(args.device)
        environment = environment_report(device)
        write_json(args.results_dir / "environment.json", environment)
        adapter = create_adapter("muq_mulan", config, device)
        if device == "cuda":
            torch.cuda.empty_cache()
            torch.cuda.reset_peak_memory_stats()
        load_started = time.perf_counter()
        adapter.load()
        load_seconds = time.perf_counter() - load_started
        embedded_tracks, embedding_metrics = embed_catalog(adapter, tracks, args, status_path)
        query_outputs, validation = run_queries(adapter, embedded_tracks, queries, args.top_k, status_path)
        summary = summarize_results(query_outputs)
        peak_vram = torch.cuda.max_memory_allocated() if device == "cuda" else None
        model_info = adapter.info().to_dict()
        write_json(
            args.results_dir / "index_manifest.json",
            {"model": model_info, "embedding": embedding_metrics},
        )
        write_json(
            args.results_dir / "search_validation.json",
            {
                "model": model_info,
                "retrieval_mode": "segment",
                "top_k": args.top_k,
                "text_embedding_validation": validation,
                "summary": summary,
                "queries": query_outputs,
            },
        )
        performance = {
            "model_load_seconds": load_seconds,
            "peak_vram_bytes": peak_vram,
            "process_ram_bytes_end": psutil.Process().memory_info().rss,
            "embedding": {
                key: value for key, value in embedding_metrics.items() if key != "tracks"
            },
        }
        write_json(args.results_dir / "performance.json", performance)
        initial_performance_path = args.results_dir / "initial_index_performance.json"
        if embedding_metrics["total_inference_seconds"] > 0:
            write_json(initial_performance_path, performance)
            initial_performance = performance
        elif initial_performance_path.exists():
            initial_performance = json.loads(initial_performance_path.read_text(encoding="utf-8"))
        else:
            initial_performance = None
        report = render_report(
            model_info,
            environment,
            embedding_metrics,
            summary,
            validation,
            load_seconds,
            peak_vram,
            initial_performance,
        )
        (PHASE2_ROOT / "PHASE2_REPORT.md").write_text(report, encoding="utf-8")
        write_json(
            status_path,
            {
                "status": "complete",
                "tracks": len(tracks),
                "segments": embedding_metrics["total_segments"],
                "queries": len(queries),
            },
        )
        print(f"Phase 2 complete: {len(tracks)} tracks, {embedding_metrics['total_segments']} segments, {len(queries)} queries")
        return 0
    except Exception as error:
        write_json(
            status_path,
            {
                "status": "failed",
                "error": f"{type(error).__name__}: {error}",
                "traceback": traceback.format_exc(),
            },
        )
        raise
    finally:
        if adapter is not None:
            adapter.close()


if __name__ == "__main__":
    raise SystemExit(main())
