from pathlib import Path

from music_intelligence_v2.cache.store import cache_key


def test_cache_key_changes_with_segmentation(tmp_path: Path):
    audio = tmp_path / "track.mp3"
    audio.write_bytes(b"test")
    model = {"key": "model", "revision": "abc"}
    first = cache_key(audio, model, {"segment_seconds": 25, "segment_count": 6})
    second = cache_key(audio, model, {"segment_seconds": 20, "segment_count": 6})
    assert first != second
