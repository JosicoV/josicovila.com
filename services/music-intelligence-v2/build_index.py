"""Consolidate the validated Phase 2 embedding cache into one serialized index.

Reads only artefacts that already exist (catalogue JSON, Phase 2 index manifest
and the per-track ``.npz`` cache files).  No MP3 is opened, no model is loaded
and nothing outside ``data/music-intelligence-v2/index/`` is written.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np

SERVICE_ROOT = Path(__file__).resolve().parent
REPOSITORY_ROOT = SERVICE_ROOT.parents[1]
sys.path.insert(0, str(SERVICE_ROOT / "src"))

from music_intelligence_v2.retrieval import infer_canonical_groups  # noqa: E402
from music_intelligence_v2.service.index import (  # noqa: E402
    INDEX_SCHEMA_VERSION,
    catalogue_fingerprint,
    write_index,
)

PHASE2_ROOT = REPOSITORY_ROOT / "benchmarks" / "music-intelligence-v2" / "phase2"
DEFAULT_INDEX_DIR = REPOSITORY_ROOT / "data" / "music-intelligence-v2" / "index"


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=PHASE2_ROOT / "full_catalog.json")
    parser.add_argument("--manifest", type=Path, default=PHASE2_ROOT / "results" / "index_manifest.json")
    parser.add_argument(
        "--translation-registry",
        type=Path,
        default=SERVICE_ROOT / "config" / "translation_registry.json",
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_INDEX_DIR)
    # Defaults mirror the relative URLs the production player already uses
    # (`musica/${ruta}` and `musica/DISCOS/${imagen}`).
    parser.add_argument("--audio-url-prefix", default="musica/")
    parser.add_argument("--cover-url-prefix", default="musica/DISCOS/")
    parser.add_argument("--index-version", default=None, help="Defaults to a UTC build stamp.")
    return parser.parse_args()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def load_cached_track(manifest_entry: dict[str, Any]) -> dict[str, np.ndarray]:
    cache_path = (REPOSITORY_ROOT / manifest_entry["cache_file"]).resolve()
    if not cache_path.is_file():
        raise FileNotFoundError(f"Embedding cache missing for {manifest_entry['track_id']}: {cache_path}")
    with np.load(cache_path, allow_pickle=False) as cached:
        return {name: np.asarray(cached[name]) for name in cached.files}


def main() -> int:
    args = parse_arguments()
    started = time.perf_counter()

    catalog = read_json(args.catalog)
    manifest = read_json(args.manifest)
    translation_config = read_json(args.translation_registry)["opus_es_en"]

    catalog_by_id = {track["track_id"]: track for track in catalog["tracks"]}
    manifest_tracks = manifest["embedding"]["tracks"]
    dimension = int(manifest["model"]["embedding_dimension"])

    # Grouping needs global embeddings, so it happens here once at build time
    # and the resulting composition_id is baked into the index metadata.
    grouping_input = []
    cached_by_id: dict[str, dict[str, np.ndarray]] = {}
    for entry in manifest_tracks:
        track_id = entry["track_id"]
        if track_id not in catalog_by_id:
            raise ValueError(f"Manifest track absent from catalogue: {track_id}")
        cached = load_cached_track(entry)
        cached_by_id[track_id] = cached
        grouping_input.append(
            {
                "track_id": track_id,
                "title": catalog_by_id[track_id]["title"],
                "duration_seconds": float(cached["duration"][0]),
                "global_embedding": np.asarray(cached["global_embedding"], dtype=np.float32),
            }
        )
    composition_by_track, groups = infer_canonical_groups(grouping_input)

    segment_embeddings: list[np.ndarray] = []
    segment_starts: list[np.ndarray] = []
    segment_ends: list[np.ndarray] = []
    global_embeddings: list[np.ndarray] = []
    segment_offsets: list[int] = []
    segment_counts: list[int] = []
    track_meta: list[dict[str, Any]] = []
    fingerprint_input: list[dict[str, Any]] = []

    offset = 0
    for row, entry in enumerate(manifest_tracks):
        track_id = entry["track_id"]
        catalog_entry = catalog_by_id[track_id]
        cached = cached_by_id[track_id]
        segments = np.asarray(cached["segment_embeddings"], dtype=np.float32)
        if segments.ndim != 2 or int(segments.shape[1]) != dimension:
            raise ValueError(f"Track {track_id} has embeddings of shape {segments.shape}, expected (n, {dimension})")
        count = int(segments.shape[0])
        if count != int(entry["segment_count"]):
            raise ValueError(f"Track {track_id} has {count} cached segments but the manifest declares {entry['segment_count']}")

        segment_embeddings.append(segments)
        segment_starts.append(np.asarray(cached["segment_starts"], dtype=np.float32))
        segment_ends.append(np.asarray(cached["segment_ends"], dtype=np.float32))
        global_embeddings.append(np.asarray(cached["global_embedding"], dtype=np.float32))
        segment_offsets.append(offset)
        segment_counts.append(count)

        duration = float(cached["duration"][0])
        track_meta.append(
            {
                "row": row,
                "track_id": track_id,
                "composition_id": composition_by_track[track_id],
                "title": catalog_entry["title"],
                "album": catalog_entry["album"],
                "album_code": catalog_entry.get("album_code", ""),
                "album_cover_url": f"{args.cover_url_prefix}{catalog_entry['album_cover']}" if catalog_entry.get("album_cover") else "",
                "audio_url": f"{args.audio_url_prefix}{catalog_entry['web_audio_route']}",
                "duration_seconds": duration,
                "segment_offset": offset,
                "segment_count": count,
            }
        )
        fingerprint_input.append(
            {
                "track_id": track_id,
                "audio_path": catalog_entry["audio_path"],
                "audio_bytes": int(catalog_entry["audio_bytes"]),
                "duration_seconds": duration,
                "segment_count": count,
            }
        )
        offset += count

    arrays = {
        "segment_embeddings": np.concatenate(segment_embeddings, axis=0).astype(np.float32),
        "segment_starts": np.concatenate(segment_starts, axis=0).astype(np.float32),
        "segment_ends": np.concatenate(segment_ends, axis=0).astype(np.float32),
        "segment_offsets": np.asarray(segment_offsets, dtype=np.int32),
        "segment_counts": np.asarray(segment_counts, dtype=np.int32),
        "global_embeddings": np.stack(global_embeddings, axis=0).astype(np.float32),
    }

    built_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    meta = {
        "schema_version": INDEX_SCHEMA_VERSION,
        "index_version": args.index_version or f"muq-segment-{built_at.replace(':', '').replace('-', '')}",
        "built_at": built_at,
        "retrieval_model": {
            "key": manifest["model"]["key"],
            "name": manifest["model"]["name"],
            "checkpoint": manifest["model"]["checkpoint"],
            "revision": manifest["model"]["revision"],
            "embedding_dimension": dimension,
            "sample_rate": manifest["model"]["sample_rate"],
            "audio_input_seconds": manifest["model"]["audio_input_seconds"],
            "license": manifest["model"]["license"],
        },
        "translation_model": {
            "key": "opus_es_en",
            "checkpoint": translation_config["checkpoint"],
            "revision": translation_config["revision"],
            "license": translation_config["license"],
        },
        "segmentation": {
            "strategy": manifest["embedding"]["preprocessing"]["strategy"],
            "segment_seconds": manifest["embedding"]["preprocessing"]["segment_seconds"],
            "stride_seconds": manifest["embedding"]["preprocessing"]["stride_seconds"],
            "overlap_fraction": manifest["embedding"]["preprocessing"]["overlap_fraction"],
            "global_strategy": manifest["embedding"]["preprocessing"]["global_strategy"],
        },
        "catalogue": {
            "track_count": len(track_meta),
            "segment_count": int(arrays["segment_embeddings"].shape[0]),
            "album_count": int(catalog["album_count"]),
            "fingerprint": catalogue_fingerprint(fingerprint_input),
            "source_manifest": args.manifest.relative_to(REPOSITORY_ROOT).as_posix(),
        },
        "composition_groups": [
            {
                "composition_id": group["canonical_track_id"],
                "title": group["title"],
                "members": group["members"],
            }
            for group in groups
        ],
        "embeddings_sha256": "",
        "tracks": track_meta,
    }

    written = write_index(args.output, meta, arrays)
    summary = {
        "index_dir": args.output.as_posix(),
        "index_version": meta["index_version"],
        "tracks": meta["catalogue"]["track_count"],
        "segments": meta["catalogue"]["segment_count"],
        "embedding_dimension": dimension,
        "composition_groups": len(meta["composition_groups"]),
        "catalogue_fingerprint": meta["catalogue"]["fingerprint"],
        "array_bytes": written["arrays"].stat().st_size,
        "build_seconds": round(time.perf_counter() - started, 3),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
