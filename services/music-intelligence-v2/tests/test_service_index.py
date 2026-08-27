import json

import numpy as np
import pytest
from service_fixtures import build_arrays_and_meta

from music_intelligence_v2.service.errors import IncompatibleIndex
from music_intelligence_v2.service.index import (
    INDEX_SCHEMA_VERSION,
    SearchIndex,
    catalogue_fingerprint,
    validate_index,
    write_index,
)


def test_written_index_round_trips(tmp_path):
    arrays, meta = build_arrays_and_meta()
    write_index(tmp_path, meta, arrays)

    index = SearchIndex.load(tmp_path)
    assert index.track_count == 4
    assert index.segment_count == 6
    assert index.embedding_dimension == 4
    assert index.index_version == "test-index-1"
    assert index.composition_by_track["believe-live"] == "composition-believe"
    assert index.alternate_version_counts["believe-live"] == 1
    assert index.alternate_version_counts["dragon-rage"] == 0


def test_incompatible_schema_version_is_rejected(tmp_path):
    arrays, meta = build_arrays_and_meta()
    write_index(tmp_path, meta, arrays)
    meta_path = tmp_path / "index_meta.json"
    stored = json.loads(meta_path.read_text(encoding="utf-8"))
    stored["schema_version"] = INDEX_SCHEMA_VERSION + 1
    meta_path.write_text(json.dumps(stored), encoding="utf-8")

    with pytest.raises(IncompatibleIndex, match="schema version"):
        SearchIndex.load(tmp_path)


def test_wrong_embedding_dimension_is_rejected():
    arrays, meta = build_arrays_and_meta()
    meta["retrieval_model"]["embedding_dimension"] = 512

    with pytest.raises(IncompatibleIndex, match="dimension"):
        validate_index(meta, arrays)


def test_missing_metadata_is_rejected():
    arrays, meta = build_arrays_and_meta()
    del meta["segmentation"]

    with pytest.raises(IncompatibleIndex, match="missing keys"):
        validate_index(meta, arrays)


def test_missing_array_is_rejected(tmp_path):
    arrays, meta = build_arrays_and_meta()
    write_index(tmp_path, meta, arrays)
    partial = {name: values for name, values in arrays.items() if name != "global_embeddings"}
    with (tmp_path / "index.npz").open("wb") as handle:
        np.savez(handle, **partial)

    with pytest.raises(IncompatibleIndex, match="arrays missing"):
        SearchIndex.load(tmp_path)


def test_tampered_arrays_fail_the_checksum(tmp_path):
    arrays, meta = build_arrays_and_meta()
    write_index(tmp_path, meta, arrays)
    arrays["segment_embeddings"][0] += 0.01
    with (tmp_path / "index.npz").open("wb") as handle:
        np.savez(handle, **arrays)

    with pytest.raises(IncompatibleIndex, match="checksum"):
        SearchIndex.load(tmp_path)


def test_index_built_with_another_model_revision_is_rejected(tmp_path):
    arrays, meta = build_arrays_and_meta()
    write_index(tmp_path, meta, arrays)

    with pytest.raises(IncompatibleIndex, match="revision"):
        SearchIndex.load(
            tmp_path,
            expected_model={"checkpoint": "OpenMuQ/MuQ-MuLan-large", "revision": "a-different-revision"},
        )


def test_segment_offsets_must_match_counts():
    arrays, meta = build_arrays_and_meta()
    arrays["segment_offsets"] = np.asarray([0, 1, 2, 3], dtype=np.int32)

    with pytest.raises(IncompatibleIndex, match="offsets"):
        validate_index(meta, arrays)


def test_catalogue_fingerprint_reacts_to_reencoded_audio():
    base = [
        {"track_id": "a", "audio_path": "data/musica/a.mp3", "audio_bytes": 10, "duration_seconds": 1.0, "segment_count": 2},
    ]
    changed = [{**base[0], "audio_bytes": 11}]
    assert catalogue_fingerprint(base) != catalogue_fingerprint(changed)
    assert catalogue_fingerprint(base) == catalogue_fingerprint(list(base))
