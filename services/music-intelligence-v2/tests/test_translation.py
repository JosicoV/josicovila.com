import pytest

from music_intelligence_v2.translation import detect_es_or_en


def test_bounded_language_detector_handles_benchmark_inputs():
    assert detect_es_or_en("música épica con coro") == "es"
    assert detect_es_or_en("algo intenso pero que no parezca una batalla") == "es"
    assert detect_es_or_en("soft medieval music with flute") == "en"


@pytest.mark.parametrize(
    "query",
    [
        "honor y gloria",
        "música de cuerdas",
        "quiero algo poderoso",
        "viaje hacia el misterio",
        "guitarra triste",
        "juego de rol medieval",
    ],
)
def test_strategic_spanish_markers_detect_short_queries(query):
    assert detect_es_or_en(query) == "es"


@pytest.mark.parametrize(
    "query",
    [
        "honor and glory",
        "solo violin",
        "medieval piano",
        "sin and redemption",
        "magical journey",
    ],
)
def test_shared_or_english_music_words_stay_english(query):
    assert detect_es_or_en(query) == "en"
