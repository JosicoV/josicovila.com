import numpy as np

from music_intelligence_v2.retrieval.engine import rank_tracks
from music_intelligence_v2.retrieval.validation import text_embedding_diversity


def _track(track_id, global_embedding, segments):
    return {
        "track_id": track_id,
        "title": track_id,
        "album": "test",
        "global_embedding": np.asarray(global_embedding, dtype=np.float32),
        "segment_embeddings": np.asarray(segments, dtype=np.float32),
        "segment_starts": np.asarray([0.0, 25.0]),
        "segment_ends": np.asarray([25.0, 50.0]),
    }


def test_segment_mode_preserves_best_segment_provenance():
    tracks = [
        _track("a", [0.2, 0.8], [[0.1, 0.9], [0.9, 0.1]]),
        _track("b", [0.8, 0.2], [[0.7, 0.3], [0.2, 0.8]]),
    ]
    results = rank_tracks(np.asarray([1.0, 0.0]), tracks, "segment")
    assert results[0]["track_id"] == "a"
    assert results[0]["best_segment"] == {"start": 25.0, "end": 50.0}


def test_hybrid_weights_must_sum_to_one():
    try:
        rank_tracks(np.asarray([1.0, 0.0]), [], "hybrid", 0.7, 0.7)
    except ValueError as error:
        assert "sum to 1" in str(error)
    else:
        raise AssertionError("Expected invalid weights to fail")


def test_text_embedding_collapse_is_detected():
    collapsed = np.asarray([[1.0, 0.0], [0.9999, 0.01], [0.9998, 0.02]], dtype=np.float32)
    varied = np.asarray([[1.0, 0.0], [0.0, 1.0], [-1.0, 0.0]], dtype=np.float32)
    assert text_embedding_diversity(collapsed)["collapsed"] is True
    assert text_embedding_diversity(varied)["collapsed"] is False
