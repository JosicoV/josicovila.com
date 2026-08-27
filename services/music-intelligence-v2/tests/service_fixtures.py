"""Small synthetic index shared by the service tests.

Four tracks, two of which are versions of the same composition, so grouping and
diversification are observable without loading MuQ or the 115-track index.
"""

from __future__ import annotations

from typing import Any

import numpy as np

from music_intelligence_v2.service.index import INDEX_SCHEMA_VERSION, SearchIndex

DIMENSION = 4

TRACK_SPECS = [
    # (track_id, composition_id, title, segment vectors)
    ("believe-studio", "composition-believe", "Believe", [[1.0, 0.0, 0.0, 0.0], [0.9, 0.1, 0.0, 0.0]]),
    ("believe-live", "composition-believe", "Believe", [[0.95, 0.05, 0.0, 0.0]]),
    ("dragon-rage", "dragon-rage", "Dragon Rage", [[0.0, 1.0, 0.0, 0.0], [0.2, 0.9, 0.0, 0.0]]),
    ("quiet-forest", "quiet-forest", "Quiet Forest", [[0.0, 0.0, 1.0, 0.0]]),
]


def _normalize(values: np.ndarray) -> np.ndarray:
    array = np.asarray(values, dtype=np.float32)
    return array / np.maximum(np.linalg.norm(array, axis=-1, keepdims=True), 1e-8)


def build_arrays_and_meta() -> tuple[dict[str, np.ndarray], dict[str, Any]]:
    segment_embeddings = []
    segment_starts = []
    segment_ends = []
    global_embeddings = []
    offsets = []
    counts = []
    tracks = []

    offset = 0
    for row, (track_id, composition_id, title, segments) in enumerate(TRACK_SPECS):
        vectors = _normalize(np.asarray(segments, dtype=np.float32))
        count = len(vectors)
        segment_embeddings.append(vectors)
        segment_starts.append(np.asarray([12.5 * index for index in range(count)], dtype=np.float32))
        segment_ends.append(np.asarray([12.5 * index + 25.0 for index in range(count)], dtype=np.float32))
        global_embeddings.append(_normalize(vectors.mean(axis=0)))
        offsets.append(offset)
        counts.append(count)
        tracks.append(
            {
                "row": row,
                "track_id": track_id,
                "composition_id": composition_id,
                "title": title,
                "album": "Test Album",
                "album_code": "TestAl",
                "album_cover_url": "musica/DISCOS/test.jpg",
                "audio_url": f"musica/Test/{track_id}.mp3",
                "duration_seconds": 100.0 + row,
                "segment_offset": offset,
                "segment_count": count,
            }
        )
        offset += count

    arrays = {
        "segment_embeddings": np.concatenate(segment_embeddings, axis=0).astype(np.float32),
        "segment_starts": np.concatenate(segment_starts, axis=0).astype(np.float32),
        "segment_ends": np.concatenate(segment_ends, axis=0).astype(np.float32),
        "segment_offsets": np.asarray(offsets, dtype=np.int32),
        "segment_counts": np.asarray(counts, dtype=np.int32),
        "global_embeddings": np.stack(global_embeddings, axis=0).astype(np.float32),
    }
    meta = {
        "schema_version": INDEX_SCHEMA_VERSION,
        "index_version": "test-index-1",
        "built_at": "2026-08-27T00:00:00+00:00",
        "retrieval_model": {
            "key": "muq_mulan",
            "name": "MuQ-MuLan",
            "checkpoint": "OpenMuQ/MuQ-MuLan-large",
            "revision": "test-revision",
            "embedding_dimension": DIMENSION,
            "license": "CC-BY-NC-4.0",
        },
        "translation_model": {
            "key": "opus_es_en",
            "checkpoint": "Helsinki-NLP/opus-mt-es-en",
            "revision": "test-revision",
            "license": "Apache-2.0",
        },
        "segmentation": {
            "strategy": "sliding-window",
            "segment_seconds": 25.0,
            "stride_seconds": 12.5,
            "global_strategy": "l2-normalized mean of all segment embeddings",
        },
        "catalogue": {
            "track_count": len(tracks),
            "segment_count": int(arrays["segment_embeddings"].shape[0]),
            "fingerprint": "test-fingerprint",
        },
        "composition_groups": [
            {
                "composition_id": "composition-believe",
                "title": "Believe",
                "members": ["believe-studio", "believe-live"],
            }
        ],
        "embeddings_sha256": "",
        "tracks": tracks,
    }
    return arrays, meta


def build_index() -> SearchIndex:
    arrays, meta = build_arrays_and_meta()
    return SearchIndex(meta, arrays)


class FakeEncoder:
    """Maps a handful of English phrases onto the synthetic embedding space."""

    VECTORS = {
        "believe": [1.0, 0.0, 0.0, 0.0],
        "dragon": [0.0, 1.0, 0.0, 0.0],
        "calm and melancholic music": [0.0, 0.0, 1.0, 0.0],
    }

    def __init__(self) -> None:
        self.calls: list[str] = []

    def embed_query(self, text: str) -> np.ndarray:
        self.calls.append(text)
        for keyword, vector in self.VECTORS.items():
            if keyword in text.casefold():
                return _normalize(np.asarray(vector, dtype=np.float32))
        return _normalize(np.asarray([0.25, 0.25, 0.25, 0.25], dtype=np.float32))


class FakeTranslator:
    def __init__(self, output: str = "calm and melancholic music") -> None:
        self.output = output
        self.calls: list[str] = []

    def translate(self, text: str) -> str:
        self.calls.append(text)
        return self.output


class FailingTranslator:
    def translate(self, text: str) -> str:
        raise RuntimeError("marian exploded")
