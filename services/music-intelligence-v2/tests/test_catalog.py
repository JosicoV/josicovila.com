from pathlib import Path

from music_intelligence_v2.catalog import (
    PhpArrayParser,
    build_catalog,
    extract_english_queries,
    extract_spanish_queries,
    route_track_id,
)


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]


def test_php_array_parser_handles_nested_catalog_shape():
    parsed = PhpArrayParser('$disco = [["nombre" => "Album", "canciones" => [["nombre" => "Track"]]]];').parse_assignment("disco")
    assert parsed[0]["nombre"] == "Album"
    assert parsed[0]["canciones"][0]["nombre"] == "Track"


def test_route_track_id_is_stable_and_path_aware():
    assert route_track_id("DragonRage/1Riding_Oriental_Winds.mp3") == "dragonrage-1riding-oriental-winds"


def test_real_catalog_has_exactly_115_audio_files():
    catalog = build_catalog(
        REPOSITORY_ROOT / "app" / "includes" / "musica.estructura-datos.php",
        REPOSITORY_ROOT / "data" / "musica",
        REPOSITORY_ROOT,
    )
    assert catalog["track_count"] == 115
    assert len({track["track_id"] for track in catalog["tracks"]}) == 115


def test_phase2_extracts_all_english_queries():
    queries = extract_english_queries(REPOSITORY_ROOT / "docs" / "SEARCH_BENCHMARK_V2.md")
    assert len(queries) == 60
    assert queries[0]["text"] == "epic music"
    assert queries[-1]["text"] == "a quiet piece that slowly becomes more powerful"


def test_phase2_extracts_all_spanish_queries():
    queries = extract_spanish_queries(REPOSITORY_ROOT / "docs" / "SEARCH_BENCHMARK_V2.md")
    assert len(queries) == 10
    assert queries[0] == {
        "query_id": "es061",
        "text": "música épica con coro",
        "category": "Spanish input benchmark",
        "language": "es",
    }
