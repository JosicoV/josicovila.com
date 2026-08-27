from __future__ import annotations

import argparse
import csv
import json
import os
import platform
import subprocess
import sys
import time
import traceback
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
from music_intelligence_v2.preprocessing import extract_excerpt, load_audio, probe_duration, segment_bounds
from music_intelligence_v2.retrieval import rank_tracks, text_embedding_diversity

DEFAULT_BENCHMARK_ROOT = REPOSITORY_ROOT / "benchmarks" / "music-intelligence-v2"
DEFAULT_DATA_ROOT = REPOSITORY_ROOT / "data" / "music-intelligence-v2"


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Music Intelligence v2 Phase 1 benchmark")
    parser.add_argument(
        "--models",
        nargs="+",
        default=["muq_mulan", "laion_clap", "figma"],
        choices=["muq_mulan", "laion_clap", "figma"],
    )
    parser.add_argument(
        "--modes",
        nargs="+",
        default=["global", "segment", "hybrid"],
        choices=["global", "segment", "hybrid"],
    )
    parser.add_argument("--subset", type=Path, default=DEFAULT_BENCHMARK_ROOT / "track_subset.json")
    parser.add_argument("--queries", type=Path, default=DEFAULT_BENCHMARK_ROOT / "benchmark_phase1.json")
    parser.add_argument("--registry", type=Path, default=SERVICE_ROOT / "config" / "model_registry.json")
    parser.add_argument("--results-dir", type=Path, default=DEFAULT_BENCHMARK_ROOT / "results")
    parser.add_argument("--cache-dir", type=Path, default=DEFAULT_DATA_ROOT / "embeddings")
    parser.add_argument("--segment-seconds", type=float, default=25.0)
    parser.add_argument("--segment-count", type=int, default=6)
    parser.add_argument("--global-weight", type=float, default=0.5)
    parser.add_argument("--segment-weight", type=float, default=0.5)
    parser.add_argument("--top-k", type=int, default=8)
    parser.add_argument("--device", default="auto", choices=["auto", "cuda", "cpu"])
    parser.add_argument("--force-recompute", action="store_true")
    return parser.parse_args()


def read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def resolve_device(requested: str) -> str:
    import torch

    if requested == "auto":
        return "cuda" if torch.cuda.is_available() else "cpu"
    if requested == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("CUDA was requested but is not available")
    return requested


def environment_report(device: str) -> dict[str, Any]:
    import torch
    import torchaudio
    import transformers

    gpu = None
    if torch.cuda.is_available():
        properties = torch.cuda.get_device_properties(0)
        gpu = {
            "name": properties.name,
            "vram_bytes": properties.total_memory,
            "compute_capability": f"{properties.major}.{properties.minor}",
        }
    nvidia_smi = None
    try:
        nvidia_smi = subprocess.check_output(
            [
                "nvidia-smi",
                "--query-gpu=name,driver_version,memory.total",
                "--format=csv,noheader,nounits",
            ],
            text=True,
            timeout=10,
        ).strip()
    except (OSError, subprocess.SubprocessError):
        pass
    virtual_memory = psutil.virtual_memory()
    return {
        "python": sys.version.split()[0],
        "platform": platform.platform(),
        "torch": torch.__version__,
        "torchaudio": torchaudio.__version__,
        "transformers": transformers.__version__,
        "cuda_available": torch.cuda.is_available(),
        "cuda_runtime": torch.version.cuda,
        "device": device,
        "gpu": gpu,
        "nvidia_smi": nvidia_smi,
        "cpu_count": os.cpu_count(),
        "system_ram_bytes": virtual_memory.total,
        "system_ram_available_bytes_at_start": virtual_memory.available,
        "process_ram_bytes_at_start": psutil.Process().memory_info().rss,
    }


def directory_size(path: Path) -> int:
    if not path.exists():
        return 0
    return sum(item.stat().st_size for item in path.rglob("*") if item.is_file())


def embed_tracks(adapter, tracks, args, cache: EmbeddingCache) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    embedded_tracks: list[dict[str, Any]] = []
    timings: list[dict[str, Any]] = []
    model_info = adapter.info().to_dict()
    preprocessing_config = {
        "segment_seconds": args.segment_seconds,
        "segment_count": args.segment_count,
        "sample_rate": adapter.sample_rate,
        "audio_input_seconds": adapter.audio_input_seconds,
        "excerpt_strategy": "center-crop-or-right-pad",
        "global_strategy": "l2-normalized mean of all segment embeddings",
    }

    for index, track in enumerate(tracks, start=1):
        audio_path = REPOSITORY_ROOT / Path(track["audio_path"])
        if not audio_path.is_file():
            raise FileNotFoundError(f"Missing source audio: {audio_path}")
        key = cache_key(audio_path, model_info, preprocessing_config)
        cached = None if args.force_recompute else cache.load(adapter.key, track["track_id"], key)
        started = time.perf_counter()
        if cached is None:
            duration = probe_duration(audio_path)
            waveform = load_audio(audio_path, adapter.sample_rate)
            bounds = segment_bounds(duration, args.segment_seconds, args.segment_count)
            segment_embeddings = []
            segment_inference_seconds = []
            for start, end in bounds:
                excerpt = extract_excerpt(
                    waveform,
                    adapter.sample_rate,
                    start,
                    end,
                    adapter.audio_input_seconds,
                )
                inference_started = time.perf_counter()
                segment_embeddings.append(adapter.embed_audio(excerpt, adapter.sample_rate))
                segment_inference_seconds.append(time.perf_counter() - inference_started)
            segments = np.stack(segment_embeddings).astype(np.float32)
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
            segment_inference_seconds = []
            cache_hit = True
        elapsed = time.perf_counter() - started
        print(f"[{adapter.key}] {index:02d}/{len(tracks):02d} {track['title']} ({'cache' if cache_hit else 'embedded'})")
        embedded_tracks.append(
            {
                **track,
                "duration_seconds": float(cached["duration"][0]),
                "global_embedding": cached["global_embedding"],
                "segment_embeddings": cached["segment_embeddings"],
                "segment_starts": cached["segment_starts"],
                "segment_ends": cached["segment_ends"],
            }
        )
        timings.append(
            {
                "track_id": track["track_id"],
                "cache_hit": cache_hit,
                "total_seconds": elapsed,
                "segment_inference_seconds": segment_inference_seconds,
                "cache_file": cache_path.relative_to(REPOSITORY_ROOT).as_posix(),
                "cache_bytes": cache_path.stat().st_size,
            }
        )
    return embedded_tracks, {"preprocessing": preprocessing_config, "tracks": timings}


def run_queries(adapter, embedded_tracks, queries, args) -> tuple[dict[str, list[dict[str, Any]]], list[dict[str, Any]], dict[str, Any]]:
    outputs = {mode: [] for mode in args.modes}
    query_metrics: list[dict[str, Any]] = []
    prepared_queries = []
    for index, query in enumerate(queries, start=1):
        text_started = time.perf_counter()
        query_embedding = adapter.embed_texts([query["text"]])[0]
        text_seconds = time.perf_counter() - text_started
        prepared_queries.append((query, query_embedding, text_seconds))
        print(f"[{adapter.key}] text {index:02d}/{len(queries):02d}: {query['text']}")

    validation = text_embedding_diversity(np.stack([item[1] for item in prepared_queries]))
    if validation["collapsed"]:
        raise RuntimeError(
            "Text embedding collapse detected: mean off-diagonal cosine "
            f"{validation['mean_off_diagonal_cosine']:.6f} >= {validation['collapse_threshold']:.6f}"
        )

    for index, (query, query_embedding, text_seconds) in enumerate(prepared_queries, start=1):
        mode_times = {}
        for mode in args.modes:
            search_started = time.perf_counter()
            results = rank_tracks(
                query_embedding,
                embedded_tracks,
                mode,
                global_weight=args.global_weight,
                segment_weight=args.segment_weight,
                top_k=args.top_k,
            )
            search_seconds = time.perf_counter() - search_started
            mode_times[mode] = search_seconds
            outputs[mode].append(
                {
                    "query_id": query["query_id"],
                    "query": query["text"],
                    "text_embedding_seconds": text_seconds,
                    "retrieval_seconds": search_seconds,
                    "results": results,
                }
            )
        query_metrics.append(
            {
                "query_id": query["query_id"],
                "text_embedding_seconds": text_seconds,
                "retrieval_seconds_by_mode": mode_times,
            }
        )
        print(f"[{adapter.key}] query {index:02d}/{len(queries):02d}: {query['text']}")
    return outputs, query_metrics, validation


def write_model_outputs(model_key, adapter, outputs, args) -> list[dict[str, Any]]:
    combined_rows = []
    for mode, query_outputs in outputs.items():
        payload = {
            "model": adapter.info().to_dict(),
            "retrieval_mode": mode,
            "top_k": args.top_k,
            "hybrid_weights": {
                "global": args.global_weight,
                "segment": args.segment_weight,
            } if mode == "hybrid" else None,
            "queries": query_outputs,
        }
        write_json(args.results_dir / f"{model_key}_{mode}.json", payload)
        for query in query_outputs:
            for result in query["results"]:
                combined_rows.append(
                    {
                        "query_id": query["query_id"],
                        "query": query["query"],
                        "model": model_key,
                        "checkpoint": adapter.info().checkpoint,
                        "revision": adapter.info().revision,
                        "mode": mode,
                        **result,
                        "text_embedding_seconds": query["text_embedding_seconds"],
                        "retrieval_seconds": query["retrieval_seconds"],
                    }
                )
    return combined_rows


def write_human_review(path: Path, rows: list[dict[str, Any]]) -> None:
    fields = [
        "query", "model", "mode", "rank", "track_id", "title", "score",
        "best_segment_start", "best_segment_end", "human_score", "instrument_correct",
        "mood_correct", "energy_correct", "scene_correct", "contradiction", "notes",
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow(
                {
                    "query": row["query"],
                    "model": row["model"],
                    "mode": row["mode"],
                    "rank": row["rank"],
                    "track_id": row["track_id"],
                    "title": row["title"],
                    "score": f"{row['score']:.8f}",
                    "best_segment_start": row["best_segment"]["start"],
                    "best_segment_end": row["best_segment"]["end"],
                    "human_score": "",
                    "instrument_correct": "",
                    "mood_correct": "",
                    "energy_correct": "",
                    "scene_correct": "",
                    "contradiction": "",
                    "notes": "",
                }
            )


def write_model_status(path: Path, statuses: dict[str, dict[str, Any]]) -> None:
    lines = ["# Model status — Phase 1", "", "Generated by the benchmark harness.", ""]
    for key, status in statuses.items():
        lines.extend(
            [
                f"## {status.get('display_name', key)}",
                "",
                f"- Status: **{status['status']}**",
                f"- Checkpoint: `{status.get('checkpoint') or 'none'}`",
                f"- Revision: `{status.get('revision') or 'none'}`",
            ]
        )
        if status.get("reason"):
            lines.append(f"- Detail: {status['reason']}")
        if status.get("license"):
            lines.append(f"- License: `{status['license']}`")
        if status.get("sample_rate"):
            lines.append(f"- Sample rate: `{status['sample_rate']} Hz`")
        if status.get("audio_input_seconds"):
            lines.append(f"- Model input: `{status['audio_input_seconds']} s`")
        lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    args = parse_arguments()
    registry = read_json(args.registry)
    tracks = read_json(args.subset)
    queries = read_json(args.queries)
    device = resolve_device(args.device)
    args.results_dir.mkdir(parents=True, exist_ok=True)
    cache = EmbeddingCache(args.cache_dir)
    environment = environment_report(device)
    write_json(args.results_dir / "environment.json", environment)

    statuses = {
        "tp_clap": {
            "display_name": registry["tp_clap"]["display_name"],
            "status": "unavailable",
            "checkpoint": None,
            "revision": None,
            "reason": registry["tp_clap"]["reason"],
        }
    }
    combined_rows: list[dict[str, Any]] = []
    performance: dict[str, Any] = {"environment": environment, "models": {}}

    for model_key in args.models:
        config = registry[model_key]
        status = {
            "display_name": config["display_name"],
            "status": "running",
            "checkpoint": config["checkpoint"],
            "revision": config["revision"],
            "license": config.get("license"),
            "sample_rate": config.get("sample_rate"),
            "audio_input_seconds": config.get("audio_input_seconds"),
        }
        statuses[model_key] = status
        write_model_status(DEFAULT_BENCHMARK_ROOT / "MODEL_STATUS.md", statuses)
        adapter = create_adapter(model_key, config, device)
        try:
            import torch

            if device == "cuda":
                torch.cuda.empty_cache()
                torch.cuda.reset_peak_memory_stats()
            load_started = time.perf_counter()
            adapter.load()
            load_seconds = time.perf_counter() - load_started
            embedded_tracks, embedding_metrics = embed_tracks(adapter, tracks, args, cache)
            outputs, query_metrics, text_validation = run_queries(adapter, embedded_tracks, queries, args)
            model_rows = write_model_outputs(model_key, adapter, outputs, args)
            combined_rows.extend(model_rows)
            status.update({"status": "working", "reason": "Benchmark completed successfully."})
            performance["models"][model_key] = {
                "model": adapter.info().to_dict(),
                "load_seconds": load_seconds,
                "peak_vram_bytes": torch.cuda.max_memory_allocated() if device == "cuda" else None,
                "process_ram_bytes": psutil.Process().memory_info().rss,
                "embedding": embedding_metrics,
                "queries": query_metrics,
                "text_embedding_validation": text_validation,
                "cache_total_bytes": directory_size(args.cache_dir / model_key),
            }
        except Exception as error:
            status.update(
                {
                    "status": "failed",
                    "reason": f"{type(error).__name__}: {error}",
                    "traceback": traceback.format_exc(),
                }
            )
            performance["models"][model_key] = {"failure": status}
            print(f"[{model_key}] FAILED: {type(error).__name__}: {error}", file=sys.stderr)
        finally:
            adapter.close()
            write_model_status(DEFAULT_BENCHMARK_ROOT / "MODEL_STATUS.md", statuses)
            write_json(args.results_dir / f"performance_{model_key}.json", performance["models"][model_key])
            write_json(args.results_dir / "performance.json", performance)

    write_json(args.results_dir / "combined_results.json", combined_rows)
    write_human_review(DEFAULT_BENCHMARK_ROOT / "human_review_phase1.csv", combined_rows)
    successful = [key for key, value in statuses.items() if value["status"] == "working"]
    print(f"Completed models: {', '.join(successful) if successful else 'none'}")
    return 0 if successful else 1


if __name__ == "__main__":
    raise SystemExit(main())
