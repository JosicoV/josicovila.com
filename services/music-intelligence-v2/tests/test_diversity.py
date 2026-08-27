import numpy as np

from music_intelligence_v2.retrieval import diversify_results, infer_canonical_groups, ranking_overlap


def track(track_id, title, duration, embedding):
    return {
        "track_id": track_id,
        "title": title,
        "duration_seconds": duration,
        "global_embedding": np.asarray(embedding, dtype=np.float32),
    }


def test_canonical_group_requires_title_duration_and_embedding_agreement():
    tracks = [
        track("feel-a", "Feel", 146.0, [1.0, 0.0]),
        track("feel-b", "FEEL", 146.2, [0.96, 0.28]),
        track("feel-unrelated", "Feel", 200.0, [0.0, 1.0]),
    ]
    mapping, groups = infer_canonical_groups(tracks)
    assert mapping["feel-a"] == mapping["feel-b"] == "composition-feel"
    assert mapping["feel-unrelated"] == "feel-unrelated"
    assert groups[0]["members"] == ["feel-a", "feel-b"]


def test_diversification_keeps_best_version_and_refills_depth():
    results = [
        {"track_id": "a", "rank": 1},
        {"track_id": "a-live", "rank": 2},
        {"track_id": "b", "rank": 3},
    ]
    diversified = diversify_results(results, {"a": "song-a", "a-live": "song-a"}, top_k=2)
    assert [item["track_id"] for item in diversified] == ["a", "b"]
    assert diversified[1]["source_rank"] == 3


def test_ranking_overlap_uses_canonical_ids():
    left = [{"canonical_track_id": "a"}, {"canonical_track_id": "b"}]
    right = [{"canonical_track_id": "a"}, {"canonical_track_id": "c"}]
    overlap = ranking_overlap(left, right, 2)
    assert overlap == {"top1_match": True, "overlap_count": 1, "jaccard": 1 / 3}
