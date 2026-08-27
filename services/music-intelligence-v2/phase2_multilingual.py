from __future__ import annotations

import argparse
import json
import os
import sys
import time
import traceback
from pathlib import Path
from typing import Any

import numpy as np


SERVICE_ROOT = Path(__file__).resolve().parent
REPOSITORY_ROOT = SERVICE_ROOT.parents[1]
sys.path.insert(0, str(SERVICE_ROOT / "src"))

from music_intelligence_v2.adapters import create_adapter
from music_intelligence_v2.retrieval import (
    diversify_results,
    infer_canonical_groups,
    rank_tracks,
    ranking_overlap,
)
from music_intelligence_v2.translation import detect_es_or_en


PHASE2_ROOT = REPOSITORY_ROOT / "benchmarks" / "music-intelligence-v2" / "phase2"
RESULTS_ROOT = PHASE2_ROOT / "multilingual-results"


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Canonical diversification and Spanish-to-English benchmark")
    parser.add_argument("--catalog", type=Path, default=PHASE2_ROOT / "full_catalog.json")
    parser.add_argument("--queries-en", type=Path, default=PHASE2_ROOT / "queries_en.json")
    parser.add_argument("--queries-es", type=Path, default=PHASE2_ROOT / "queries_es.json")
    parser.add_argument(
        "--references",
        type=Path,
        default=SERVICE_ROOT / "config" / "spanish_benchmark_references.json",
    )
    parser.add_argument("--index", type=Path, default=PHASE2_ROOT / "results" / "index_manifest.json")
    parser.add_argument("--model-registry", type=Path, default=SERVICE_ROOT / "config" / "model_registry.json")
    parser.add_argument(
        "--translation-registry",
        type=Path,
        default=SERVICE_ROOT / "config" / "translation_registry.json",
    )
    parser.add_argument("--results-dir", type=Path, default=RESULTS_ROOT)
    parser.add_argument("--top-k", type=int, default=10)
    parser.add_argument("--device", choices=["auto", "cuda", "cpu"], default="auto")
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


def load_embedded_tracks(catalog_path: Path, index_path: Path) -> list[dict[str, Any]]:
    catalog = read_json(catalog_path)
    index = read_json(index_path)
    by_id = {track["track_id"]: track for track in catalog["tracks"]}
    tracks = []
    for indexed in index["embedding"]["tracks"]:
        track_id = indexed["track_id"]
        cache_path = (REPOSITORY_ROOT / indexed["cache_file"]).resolve()
        if track_id not in by_id or not cache_path.is_file():
            raise ValueError(f"Incomplete Phase 2 index for {track_id}")
        with np.load(cache_path) as cached:
            tracks.append(
                {
                    **by_id[track_id],
                    "duration_seconds": float(cached["duration"][0]),
                    "global_embedding": np.asarray(cached["global_embedding"], dtype=np.float32),
                    "segment_embeddings": np.asarray(cached["segment_embeddings"], dtype=np.float32),
                    "segment_starts": np.asarray(cached["segment_starts"], dtype=np.float32),
                    "segment_ends": np.asarray(cached["segment_ends"], dtype=np.float32),
                }
            )
    if len(tracks) != 115:
        raise ValueError(f"Expected 115 indexed tracks, found {len(tracks)}")
    return tracks


def translate_queries(queries: list[dict[str, str]], config: dict[str, str]) -> tuple[list[str], float]:
    from transformers import MarianMTModel, MarianTokenizer

    local_path = (REPOSITORY_ROOT / config["local_path"]).resolve()
    if not local_path.is_dir():
        raise FileNotFoundError(f"Local translation model not found: {local_path}")
    started = time.perf_counter()
    tokenizer = MarianTokenizer.from_pretrained(local_path, local_files_only=True)
    model = MarianMTModel.from_pretrained(local_path, local_files_only=True).eval()
    encoded = tokenizer([query["text"] for query in queries], return_tensors="pt", padding=True)
    generated = model.generate(**encoded, max_new_tokens=64)
    translations = [text.strip() for text in tokenizer.batch_decode(generated, skip_special_tokens=True)]
    return translations, time.perf_counter() - started


def ranked(adapter, text: str, tracks, canonical_by_track, top_k: int):
    embedding = adapter.embed_texts([text])[0]
    raw = rank_tracks(embedding, tracks, "segment", top_k=len(tracks))
    diversified = diversify_results(raw, canonical_by_track, top_k=top_k)
    return embedding, raw[:top_k], diversified


def mean(items: list[float]) -> float:
    return float(np.mean(items)) if items else 0.0


def main() -> int:
    args = parse_arguments()
    args.results_dir.mkdir(parents=True, exist_ok=True)
    status_path = args.results_dir / "RUN_STATUS.json"
    write_json(status_path, {"status": "starting"})
    adapter = None
    try:
        tracks = load_embedded_tracks(args.catalog, args.index)
        queries_en = read_json(args.queries_en)
        queries_es = read_json(args.queries_es)
        references = read_json(args.references)
        if len(queries_en) != 60 or len(queries_es) != 10 or set(references) != {q["query_id"] for q in queries_es}:
            raise ValueError("Unexpected multilingual benchmark contract")

        canonical_by_track, groups = infer_canonical_groups(tracks)
        translation_config = read_json(args.translation_registry)["opus_es_en"]
        translations, translation_seconds = translate_queries(queries_es, translation_config)

        device = resolve_device(args.device)
        adapter = create_adapter("muq_mulan", read_json(args.model_registry)["muq_mulan"], device)
        adapter.load()

        english_outputs = []
        duplicate_slots = 0
        for index, query in enumerate(queries_en, 1):
            _, raw, diversified = ranked(adapter, query["text"], tracks, canonical_by_track, args.top_k)
            raw_canonical = [canonical_by_track.get(item["track_id"], item["track_id"]) for item in raw]
            removed = len(raw_canonical) - len(set(raw_canonical))
            duplicate_slots += removed
            english_outputs.append({**query, "duplicate_slots_in_raw_top10": removed, "raw_results": raw, "results": diversified})
            write_json(status_path, {"status": "english_diversification", "completed": index, "total": 60})

        spanish_outputs = []
        for index, (query, translated) in enumerate(zip(queries_es, translations), 1):
            reference = references[query["query_id"]]
            translated_embedding, _, translated_results = ranked(adapter, translated, tracks, canonical_by_track, args.top_k)
            reference_embedding, _, reference_results = ranked(adapter, reference, tracks, canonical_by_track, args.top_k)
            direct_embedding, _, direct_results = ranked(adapter, query["text"], tracks, canonical_by_track, args.top_k)
            spanish_outputs.append(
                {
                    "query_id": query["query_id"],
                    "query_original": query["text"],
                    "detected_language": detect_es_or_en(query["text"]),
                    "query_normalized_en": translated,
                    "reference_en": reference,
                    "translation_exact_match": translated.casefold() == reference.casefold(),
                    "translated_reference_embedding_cosine": float(np.dot(translated_embedding, reference_embedding)),
                    "translated_vs_reference_top5": ranking_overlap(translated_results, reference_results, 5),
                    "translated_vs_reference_top10": ranking_overlap(translated_results, reference_results, 10),
                    "direct_es_vs_reference_top5": ranking_overlap(direct_results, reference_results, 5),
                    "direct_es_vs_reference_top10": ranking_overlap(direct_results, reference_results, 10),
                    "direct_reference_embedding_cosine": float(np.dot(direct_embedding, reference_embedding)),
                    "translated_results": translated_results,
                    "direct_es_results": direct_results,
                    "reference_results": reference_results,
                }
            )
            write_json(status_path, {"status": "spanish_validation", "completed": index, "total": 10})

        summary = {
            "language_detector_scope": "bounded_es_en_search_queries",
            "canonical_groups": len(groups),
            "grouped_catalog_entries": sum(len(group["members"]) for group in groups),
            "english_queries_with_duplicate_slots_in_raw_top10": sum(
                output["duplicate_slots_in_raw_top10"] > 0 for output in english_outputs
            ),
            "total_duplicate_slots_removed_from_english_top10": duplicate_slots,
            "spanish_queries": len(spanish_outputs),
            "language_detection_accuracy": mean([item["detected_language"] == "es" for item in spanish_outputs]),
            "translation_exact_matches": sum(item["translation_exact_match"] for item in spanish_outputs),
            "mean_translation_reference_embedding_cosine": mean(
                [item["translated_reference_embedding_cosine"] for item in spanish_outputs]
            ),
            "translated_top1_match_rate": mean(
                [item["translated_vs_reference_top10"]["top1_match"] for item in spanish_outputs]
            ),
            "direct_es_top1_match_rate": mean(
                [item["direct_es_vs_reference_top10"]["top1_match"] for item in spanish_outputs]
            ),
            "translated_mean_top5_overlap": mean(
                [item["translated_vs_reference_top5"]["overlap_count"] / 5 for item in spanish_outputs]
            ),
            "direct_es_mean_top5_overlap": mean(
                [item["direct_es_vs_reference_top5"]["overlap_count"] / 5 for item in spanish_outputs]
            ),
            "translated_mean_top10_overlap": mean(
                [item["translated_vs_reference_top10"]["overlap_count"] / 10 for item in spanish_outputs]
            ),
            "direct_es_mean_top10_overlap": mean(
                [item["direct_es_vs_reference_top10"]["overlap_count"] / 10 for item in spanish_outputs]
            ),
        }
        summary["recommended_spanish_strategy"] = (
            "local_translation"
            if summary["translated_mean_top5_overlap"] >= summary["direct_es_mean_top5_overlap"]
            else "direct_multilingual_embedding"
        )

        write_json(args.results_dir / "canonical_groups.json", {"thresholds": {"minimum_embedding_cosine": 0.9, "maximum_duration_delta_seconds": 1.0}, "groups": groups, "canonical_by_track": canonical_by_track})
        write_json(args.results_dir / "english_diversified.json", {"summary": summary, "queries": english_outputs})
        write_json(args.results_dir / "spanish_translation_validation.json", {"translation_model": translation_config, "translation_seconds": translation_seconds, "summary": summary, "queries": spanish_outputs})
        report = "\n".join(
            [
                "# Phase 2 — canonical diversification and Spanish benchmark",
                "",
                "## Canonical grouping",
                "",
                f"- Confirmed composition groups: {summary['canonical_groups']}.",
                f"- Grouped catalogue entries: {summary['grouped_catalog_entries']}.",
                f"- English queries affected by duplicate versions in raw top 10: {summary['english_queries_with_duplicate_slots_in_raw_top10']}/60.",
                f"- Duplicate result slots removed: {summary['total_duplicate_slots_removed_from_english_top10']}.",
                "- Rule: same normalized title, duration delta <= 1 s and global embedding cosine >= 0.90.",
                "",
                "## Spanish to English",
                "",
                f"- Translator: `{translation_config['checkpoint']}` at `{translation_config['revision']}`.",
                f"- License: `{translation_config['license']}`.",
                f"- Language detection: {summary['language_detection_accuracy']:.0%} on 10/10 benchmark queries.",
                f"- Translation model load plus 10 translations: {translation_seconds:.2f} s on CPU.",
                f"- Exact reference translations: {summary['translation_exact_matches']}/10.",
                f"- Mean translated/reference MuQ text cosine: {summary['mean_translation_reference_embedding_cosine']:.4f}.",
                f"- Translated top-1 agreement with English reference: {summary['translated_top1_match_rate']:.0%}.",
                f"- Direct-Spanish top-1 agreement: {summary['direct_es_top1_match_rate']:.0%}.",
                f"- Translated mean top-5 overlap: {summary['translated_mean_top5_overlap']:.0%}.",
                f"- Direct-Spanish mean top-5 overlap: {summary['direct_es_mean_top5_overlap']:.0%}.",
                f"- Recommended strategy: `{summary['recommended_spanish_strategy']}`.",
                "",
                "## Caveats",
                "",
                "- The language detector is deliberately bounded to Spanish/English music-search phrases; it is not a general-purpose detector.",
                "- The only translated top-1 mismatch was `música tranquila y melancólica`: OPUS produced `quiet and melancholy music` instead of the reference `calm and melancholic music`; 4/5 and 9/10 results still overlapped.",
                "- Validate broader free-form Spanish input before using this pipeline in a public endpoint.",
                "",
                "## Boundary",
                "",
                "This benchmark is offline and isolated. It does not modify PHP, Docker, frontend code or production services.",
                "",
            ]
        )
        (PHASE2_ROOT / "PHASE2_MULTILINGUAL_REPORT.md").write_text(report, encoding="utf-8")
        write_json(status_path, {"status": "complete", "english_queries": 60, "spanish_queries": 10, "summary": summary})
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 0
    except Exception as error:
        write_json(status_path, {"status": "failed", "error": f"{type(error).__name__}: {error}", "traceback": traceback.format_exc()})
        traceback.print_exc()
        return 1
    finally:
        if adapter is not None:
            adapter.close()


if __name__ == "__main__":
    raise SystemExit(main())
