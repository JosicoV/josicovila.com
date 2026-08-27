from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

from .errors import IncompatibleIndex

INDEX_SCHEMA_VERSION = 1
INDEX_FILE_NAME = "index.npz"
META_FILE_NAME = "index_meta.json"

ARRAY_NAMES = (
    "segment_embeddings",
    "segment_starts",
    "segment_ends",
    "segment_offsets",
    "segment_counts",
    "global_embeddings",
)

REQUIRED_META_KEYS = (
    "schema_version",
    "index_version",
    "built_at",
    "retrieval_model",
    "translation_model",
    "segmentation",
    "catalogue",
    "embeddings_sha256",
    "tracks",
)

REQUIRED_MODEL_KEYS = ("key", "checkpoint", "revision", "embedding_dimension")
REQUIRED_SEGMENTATION_KEYS = ("segment_seconds", "stride_seconds", "global_strategy")
REQUIRED_CATALOGUE_KEYS = ("track_count", "segment_count", "fingerprint")
REQUIRED_TRACK_KEYS = (
    "row",
    "track_id",
    "composition_id",
    "title",
    "album",
    "audio_url",
    "duration_seconds",
    "segment_offset",
    "segment_count",
)


@dataclass(frozen=True)
class TrackEntry:
    row: int
    track_id: str
    composition_id: str
    title: str
    album: str
    album_code: str
    album_cover_url: str
    audio_url: str
    duration_seconds: float
    segment_offset: int
    segment_count: int

    @classmethod
    def from_meta(cls, payload: dict[str, Any]) -> TrackEntry:
        return cls(
            row=int(payload["row"]),
            track_id=str(payload["track_id"]),
            composition_id=str(payload["composition_id"]),
            title=str(payload["title"]),
            album=str(payload["album"]),
            album_code=str(payload.get("album_code", "")),
            album_cover_url=str(payload.get("album_cover_url", "")),
            audio_url=str(payload["audio_url"]),
            duration_seconds=float(payload["duration_seconds"]),
            segment_offset=int(payload["segment_offset"]),
            segment_count=int(payload["segment_count"]),
        )


def catalogue_fingerprint(tracks: list[dict[str, Any]]) -> str:
    """Stable digest of what the index was built from.

    Changes whenever a track is added, removed, re-encoded or re-segmented, so
    a stale index can be detected without rescanning the MP3 files.
    """
    payload = sorted(
        (
            str(track["track_id"]),
            str(track["audio_path"]),
            int(track["audio_bytes"]),
            round(float(track["duration_seconds"]), 6),
            int(track["segment_count"]),
        )
        for track in tracks
    )
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


class SearchIndex:
    """Runtime-only view of the catalogue: embeddings plus display metadata.

    Deliberately holds no audio, no model handle and no reference to the
    embedding cache, so the service never rescans MP3s on startup.
    """

    def __init__(self, meta: dict[str, Any], arrays: dict[str, np.ndarray]) -> None:
        self.meta = meta
        self.segment_embeddings = arrays["segment_embeddings"]
        self.segment_starts = arrays["segment_starts"]
        self.segment_ends = arrays["segment_ends"]
        self.segment_offsets = arrays["segment_offsets"]
        self.segment_counts = arrays["segment_counts"]
        self.global_embeddings = arrays["global_embeddings"]
        self.tracks = [TrackEntry.from_meta(entry) for entry in meta["tracks"]]
        self.composition_by_track = {track.track_id: track.composition_id for track in self.tracks}
        self.alternate_version_counts = {
            track.track_id: sum(
                other.composition_id == track.composition_id and other.track_id != track.track_id
                for other in self.tracks
            )
            for track in self.tracks
        }

    @property
    def index_version(self) -> str:
        return str(self.meta["index_version"])

    @property
    def embedding_dimension(self) -> int:
        return int(self.meta["retrieval_model"]["embedding_dimension"])

    @property
    def track_count(self) -> int:
        return len(self.tracks)

    @property
    def segment_count(self) -> int:
        return int(self.segment_embeddings.shape[0])

    @property
    def retrieval_model(self) -> dict[str, Any]:
        return self.meta["retrieval_model"]

    @property
    def translation_model(self) -> dict[str, Any]:
        return self.meta["translation_model"]

    @classmethod
    def load(cls, directory: Path, *, expected_model: dict[str, Any] | None = None) -> SearchIndex:
        meta_path = directory / META_FILE_NAME
        array_path = directory / INDEX_FILE_NAME
        if not meta_path.is_file() or not array_path.is_file():
            raise IncompatibleIndex(f"Index files missing under {directory}")
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8-sig"))
        except json.JSONDecodeError as error:
            raise IncompatibleIndex(f"Index metadata is not valid JSON: {error}") from error
        with np.load(array_path, allow_pickle=False) as stored:
            missing = [name for name in ARRAY_NAMES if name not in stored.files]
            if missing:
                raise IncompatibleIndex(f"Index arrays missing: {', '.join(missing)}")
            arrays = {name: np.asarray(stored[name]) for name in ARRAY_NAMES}
        validate_index(meta, arrays, digest=file_sha256(array_path), expected_model=expected_model)
        arrays["segment_embeddings"] = np.ascontiguousarray(arrays["segment_embeddings"], dtype=np.float32)
        arrays["global_embeddings"] = np.ascontiguousarray(arrays["global_embeddings"], dtype=np.float32)
        return cls(meta, arrays)


def validate_index(
    meta: dict[str, Any],
    arrays: dict[str, np.ndarray],
    *,
    digest: str | None = None,
    expected_model: dict[str, Any] | None = None,
) -> None:
    """Reject stale or incompatible indexes instead of silently loading them."""
    if not isinstance(meta, dict):
        raise IncompatibleIndex("Index metadata must be a JSON object")

    missing_keys = [key for key in REQUIRED_META_KEYS if key not in meta]
    if missing_keys:
        raise IncompatibleIndex(f"Index metadata missing keys: {', '.join(missing_keys)}")

    if int(meta["schema_version"]) != INDEX_SCHEMA_VERSION:
        raise IncompatibleIndex(
            f"Index schema version {meta['schema_version']} is not supported "
            f"(service expects {INDEX_SCHEMA_VERSION})"
        )

    for section, required in (
        ("retrieval_model", REQUIRED_MODEL_KEYS),
        ("segmentation", REQUIRED_SEGMENTATION_KEYS),
        ("catalogue", REQUIRED_CATALOGUE_KEYS),
    ):
        block = meta[section]
        if not isinstance(block, dict):
            raise IncompatibleIndex(f"Index metadata section '{section}' must be an object")
        absent = [key for key in required if key not in block]
        if absent:
            raise IncompatibleIndex(f"Index metadata '{section}' missing keys: {', '.join(absent)}")

    tracks = meta["tracks"]
    if not isinstance(tracks, list) or not tracks:
        raise IncompatibleIndex("Index metadata must list at least one track")
    for position, entry in enumerate(tracks):
        if not isinstance(entry, dict):
            raise IncompatibleIndex(f"Track entry {position} must be an object")
        absent = [key for key in REQUIRED_TRACK_KEYS if key not in entry]
        if absent:
            raise IncompatibleIndex(f"Track entry {position} missing keys: {', '.join(absent)}")

    segment_embeddings = arrays["segment_embeddings"]
    global_embeddings = arrays["global_embeddings"]
    if segment_embeddings.ndim != 2 or global_embeddings.ndim != 2:
        raise IncompatibleIndex("Embedding arrays must be two-dimensional")

    dimension = int(meta["retrieval_model"]["embedding_dimension"])
    if int(segment_embeddings.shape[1]) != dimension:
        raise IncompatibleIndex(
            f"Segment embedding dimension {segment_embeddings.shape[1]} does not match "
            f"declared dimension {dimension}"
        )
    if int(global_embeddings.shape[1]) != dimension:
        raise IncompatibleIndex(
            f"Global embedding dimension {global_embeddings.shape[1]} does not match "
            f"declared dimension {dimension}"
        )

    track_count = int(meta["catalogue"]["track_count"])
    segment_count = int(meta["catalogue"]["segment_count"])
    if len(tracks) != track_count:
        raise IncompatibleIndex(f"Metadata lists {len(tracks)} tracks but declares {track_count}")
    if int(global_embeddings.shape[0]) != track_count:
        raise IncompatibleIndex(
            f"Global embedding rows {global_embeddings.shape[0]} do not match track count {track_count}"
        )
    if int(segment_embeddings.shape[0]) != segment_count:
        raise IncompatibleIndex(
            f"Segment embedding rows {segment_embeddings.shape[0]} do not match segment count {segment_count}"
        )
    for name in ("segment_starts", "segment_ends"):
        if int(arrays[name].shape[0]) != segment_count:
            raise IncompatibleIndex(f"Array '{name}' does not have {segment_count} rows")
    for name in ("segment_offsets", "segment_counts"):
        if int(arrays[name].shape[0]) != track_count:
            raise IncompatibleIndex(f"Array '{name}' does not have {track_count} rows")

    counts = np.asarray(arrays["segment_counts"], dtype=np.int64)
    offsets = np.asarray(arrays["segment_offsets"], dtype=np.int64)
    if counts.min(initial=1) < 1:
        raise IncompatibleIndex("Every track must contribute at least one segment")
    if int(counts.sum()) != segment_count:
        raise IncompatibleIndex(f"Segment counts sum to {counts.sum()}, expected {segment_count}")
    expected_offsets = np.concatenate(([0], np.cumsum(counts)[:-1]))
    if not np.array_equal(offsets, expected_offsets):
        raise IncompatibleIndex("Segment offsets are not the running total of segment counts")

    for position, entry in enumerate(tracks):
        if int(entry["row"]) != position:
            raise IncompatibleIndex(f"Track entry {position} declares row {entry['row']}")
        if int(entry["segment_offset"]) != int(offsets[position]):
            raise IncompatibleIndex(f"Track '{entry['track_id']}' has a mismatched segment offset")
        if int(entry["segment_count"]) != int(counts[position]):
            raise IncompatibleIndex(f"Track '{entry['track_id']}' has a mismatched segment count")

    track_ids = [entry["track_id"] for entry in tracks]
    if len(set(track_ids)) != len(track_ids):
        raise IncompatibleIndex("Index contains duplicate track ids")

    if digest is not None and digest != meta["embeddings_sha256"]:
        raise IncompatibleIndex("Index array checksum does not match metadata; rebuild the index")

    if expected_model is not None:
        declared = meta["retrieval_model"]
        for key in ("checkpoint", "revision"):
            if str(declared.get(key)) != str(expected_model.get(key)):
                raise IncompatibleIndex(
                    f"Index was built with retrieval model {key} "
                    f"'{declared.get(key)}' but the service is configured for '{expected_model.get(key)}'"
                )


def write_index(directory: Path, meta: dict[str, Any], arrays: dict[str, np.ndarray]) -> dict[str, Path]:
    """Write ``index.npz`` first, then stamp its digest into ``index_meta.json``."""
    directory.mkdir(parents=True, exist_ok=True)
    array_path = directory / INDEX_FILE_NAME
    meta_path = directory / META_FILE_NAME

    temporary_arrays = array_path.with_suffix(array_path.suffix + ".tmp")
    # Write through a handle: np.savez would otherwise append ".npz" to the
    # temporary name and leave the real target untouched.
    with temporary_arrays.open("wb") as handle:
        np.savez(handle, **{name: arrays[name] for name in ARRAY_NAMES})
    os.replace(temporary_arrays, array_path)

    stamped = {**meta, "embeddings_sha256": file_sha256(array_path)}
    validate_index(stamped, arrays, digest=stamped["embeddings_sha256"])

    temporary_meta = meta_path.with_suffix(meta_path.suffix + ".tmp")
    temporary_meta.write_text(json.dumps(stamped, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary_meta, meta_path)
    return {"arrays": array_path, "meta": meta_path}
