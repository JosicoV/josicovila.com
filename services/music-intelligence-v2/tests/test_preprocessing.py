import numpy as np

import pytest

from music_intelligence_v2.preprocessing.audio import extract_excerpt, segment_bounds, sliding_segment_bounds


def test_segments_cover_full_track_instead_of_only_intro():
    bounds = segment_bounds(duration=150.0, segment_seconds=25.0, segment_count=6)
    assert bounds[0] == (0.0, 25.0)
    assert bounds[-1] == (125.0, 150.0)
    assert len(bounds) == 6


def test_short_track_uses_one_segment():
    assert segment_bounds(12.5, 25.0, 6) == [(0.0, 12.5)]


def test_model_excerpt_is_centered_and_padded():
    waveform = np.arange(30, dtype=np.float32)
    centered = extract_excerpt(waveform, 1, 0.0, 25.0, 10.0)
    assert centered.tolist() == list(np.arange(7, 17, dtype=np.float32))
    padded = extract_excerpt(waveform[:3], 1, 0.0, 3.0, 5.0)
    assert padded.tolist() == [0.0, 1.0, 2.0, 0.0, 0.0]


def test_sliding_segments_cover_track_with_final_window_aligned_to_end():
    bounds = sliding_segment_bounds(61.0, 25.0, 12.5)
    assert bounds == [(0.0, 25.0), (12.5, 37.5), (25.0, 50.0), (36.0, 61.0)]


def test_sliding_segments_reject_gaps():
    with pytest.raises(ValueError, match="Stride"):
        sliding_segment_bounds(100.0, 25.0, 30.0)
