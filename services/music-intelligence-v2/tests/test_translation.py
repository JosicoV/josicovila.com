from music_intelligence_v2.translation import detect_es_or_en


def test_bounded_language_detector_handles_benchmark_inputs():
    assert detect_es_or_en("música épica con coro") == "es"
    assert detect_es_or_en("algo intenso pero que no parezca una batalla") == "es"
    assert detect_es_or_en("soft medieval music with flute") == "en"
