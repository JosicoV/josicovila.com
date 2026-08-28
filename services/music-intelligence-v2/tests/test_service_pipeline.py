import numpy as np
import pytest
from service_fixtures import FailingTranslator, FakeEncoder, FakeTranslator, build_index

from music_intelligence_v2.retrieval.engine import rank_tracks
from music_intelligence_v2.service.errors import (
    EmptyQuery,
    IndexNotLoaded,
    LimitOutOfBounds,
    ModelUnavailable,
    TranslationFailed,
    UnsupportedLanguage,
)
from music_intelligence_v2.service.pipeline import SearchService


def make_service(**overrides):
    return SearchService(
        overrides.get("index", build_index()),
        overrides.get("encoder", FakeEncoder()),
        overrides.get("translator", FakeTranslator()),
    )


def test_english_query_skips_translation():
    encoder = FakeEncoder()
    translator = FakeTranslator()
    service = make_service(encoder=encoder, translator=translator)

    response, telemetry = service.search({"query": "believe in dragons"})

    assert response["detected_language"] == "en"
    assert response["translation_used"] is False
    assert response["query_normalized_en"] == "believe in dragons"
    assert translator.calls == []
    assert encoder.calls == ["believe in dragons"]
    assert telemetry["result_count"] == len(response["results"])


def test_spanish_query_is_translated_before_embedding():
    encoder = FakeEncoder()
    translator = FakeTranslator("calm and melancholic music")
    service = make_service(encoder=encoder, translator=translator)

    response, telemetry = service.search({"query": "musica tranquila y melancolica"})

    assert response["detected_language"] == "es"
    assert response["translation_used"] is True
    assert response["query_normalized_en"] == "calm and melancholic music"
    assert translator.calls == ["musica tranquila y melancolica"]
    assert encoder.calls == ["calm and melancholic music"]
    assert response["results"][0]["track_id"] == "quiet-forest"
    assert telemetry["translation_ms"] >= 0


def test_capitalisation_does_not_change_results():
    """Los teclados de móvil capitalizan solos: la consulta no puede depender de eso."""
    minusculas, _ = make_service().search({"query": "believe in dragons"})
    capitalizada, _ = make_service().search({"query": "Believe In Dragons"})

    assert [r["track_id"] for r in minusculas["results"]] == [r["track_id"] for r in capitalizada["results"]]
    # Lo que escribió el usuario se conserva; lo que se busca va en minúsculas.
    assert capitalizada["query_original"] == "Believe In Dragons"
    assert capitalizada["query_normalized_en"] == "believe in dragons"


def test_spanish_translation_output_is_lowercased():
    encoder = FakeEncoder()
    service = make_service(encoder=encoder, translator=FakeTranslator("Quiet And Melancholy Music"))

    response, _ = service.search({"query": "Musica tranquila"})

    assert response["query_normalized_en"] == "quiet and melancholy music"
    assert encoder.calls == ["quiet and melancholy music"]


def test_explicit_language_overrides_detection():
    translator = FakeTranslator()
    service = make_service(translator=translator)

    response, _ = service.search({"query": "musica epica", "language": "en"})

    assert response["detected_language"] == "en"
    assert translator.calls == []


def test_grouping_keeps_the_best_version_and_drops_siblings():
    service = make_service()

    response, telemetry = service.search({"query": "believe"})

    track_ids = [result["track_id"] for result in response["results"]]
    composition_ids = [result["composition_id"] for result in response["results"]]
    assert track_ids[0] == "believe-studio"
    assert "believe-live" not in track_ids
    assert len(composition_ids) == len(set(composition_ids))
    assert response["results"][0]["alternate_versions"] == 1
    assert telemetry["suppressed_versions"] == 1


def test_result_ordering_is_stable_across_calls():
    # Sin corte por relevancia: aquí se comprueba el orden, no cuántos pasan.
    service = SearchService(build_index(), FakeEncoder(), FakeTranslator(), relevance={"strategy": "none"})

    first, _ = service.search({"query": "believe"})
    second, _ = service.search({"query": "believe"})

    assert [item["track_id"] for item in first["results"]] == [item["track_id"] for item in second["results"]]
    assert [item["rank"] for item in first["results"]] == [1, 2, 3]


def test_limit_is_honoured_and_capped():
    service = make_service()

    assert len(service.search({"query": "believe", "limit": 1})[0]["results"]) == 1
    with pytest.raises(LimitOutOfBounds):
        service.search({"query": "believe", "limit": 11})
    with pytest.raises(LimitOutOfBounds):
        service.search({"query": "believe", "limit": 0})


def test_empty_and_unsupported_input_is_rejected():
    service = make_service()

    with pytest.raises(EmptyQuery):
        service.search({"query": "   "})
    with pytest.raises(EmptyQuery):
        service.search({})
    with pytest.raises(UnsupportedLanguage):
        service.search({"query": "believe", "language": "fr"})


def test_missing_components_produce_stable_errors():
    with pytest.raises(IndexNotLoaded):
        SearchService(None, FakeEncoder(), FakeTranslator()).search({"query": "believe"})
    with pytest.raises(ModelUnavailable):
        SearchService(build_index(), None, FakeTranslator()).search({"query": "believe"})
    with pytest.raises(TranslationFailed):
        SearchService(build_index(), FakeEncoder(), None).search({"query": "musica tranquila"})


def test_translator_failure_is_wrapped():
    service = make_service(translator=FailingTranslator())

    with pytest.raises(TranslationFailed):
        service.search({"query": "musica tranquila"})


def test_encoder_returning_a_wrong_shape_is_rejected():
    class WrongShapeEncoder:
        def embed_query(self, text):
            return np.zeros(7, dtype=np.float32)

    service = make_service(encoder=WrongShapeEncoder())

    with pytest.raises(ModelUnavailable, match="shape"):
        service.search({"query": "believe"})


def test_flat_ranking_matches_the_phase2_engine():
    """The service ranks over one flat matrix; it must agree with rank_tracks."""
    index = build_index()
    service = SearchService(index, FakeEncoder(), FakeTranslator())
    query = np.asarray([0.4, 0.6, 0.1, 0.0], dtype=np.float32)
    query = query / np.linalg.norm(query)

    flat = service._rank_tracks(query)

    reference_tracks = [
        {
            "track_id": track.track_id,
            "title": track.title,
            "album": track.album,
            "global_embedding": index.global_embeddings[track.row],
            "segment_embeddings": index.segment_embeddings[
                track.segment_offset : track.segment_offset + track.segment_count
            ],
            "segment_starts": index.segment_starts[
                track.segment_offset : track.segment_offset + track.segment_count
            ],
            "segment_ends": index.segment_ends[track.segment_offset : track.segment_offset + track.segment_count],
        }
        for track in index.tracks
    ]
    reference = rank_tracks(query, reference_tracks, "segment", top_k=len(reference_tracks))

    assert [item["track_id"] for item in flat] == [item["track_id"] for item in reference]
    for left, right in zip(flat, reference):
        assert left["score"] == pytest.approx(right["score"], abs=1e-6)
        assert left["best_segment"] == right["best_segment"]


def test_health_reports_component_state():
    ready = make_service().health()
    assert ready["status"] == "ok"
    assert ready["index_loaded"] is True
    assert ready["catalogue_tracks"] == 4
    assert ready["index_version"] == "test-index-1"

    degraded = SearchService(None, None, None).health()
    assert degraded["status"] == "degraded"
    assert degraded["index_loaded"] is False
    assert "index_version" not in degraded


def test_suggest_contract_is_defined_but_inactive():
    service = make_service()

    assert service.suggest({"query": ""}) == {"query_original": "", "available": False, "suggestions": []}
    assert service.suggest({"query": "believe"})["available"] is False


def test_response_hides_model_internals():
    response, _ = make_service().search({"query": "believe"})

    result = response["results"][0]
    assert set(result) == {
        "rank",
        "match_reasons",
        "track_id",
        "composition_id",
        "title",
        "album",
        "album_cover_url",
        "audio_url",
        "duration_seconds",
        "alternate_versions",
        "match",
    }
    # Etiquetas legibles, nunca porcentajes: las similitudes internas no son
    # probabilidades calibradas.
    assert all(isinstance(r, str) and "%" not in r for r in result["match_reasons"])
    assert set(result["match"]) == {"best_segment_start", "best_segment_end"}
