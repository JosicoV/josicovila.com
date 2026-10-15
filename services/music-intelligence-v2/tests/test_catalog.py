import hashlib
import json
import runpy
from pathlib import Path

import pytest

from music_intelligence_v2.catalog import (
    PhpArrayParser,
    build_catalog,
    load_benchmark_queries,
    route_track_id,
)


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
QUERY_SOURCE = REPOSITORY_ROOT / "benchmarks" / "music-intelligence-v2" / "queries" / "search_benchmark_v2.json"


@pytest.fixture(autouse=True)
def forbid_local_document_reads(monkeypatch):
    original_open = Path.open
    local_roots = [REPOSITORY_ROOT / "docs", REPOSITORY_ROOT / "docs-local"]

    def guarded_open(path, *args, **kwargs):
        resolved = path.resolve()
        if any(root == resolved or root in resolved.parents for root in local_roots):
            raise AssertionError(f"Tests must not read local documentation: {path}")
        return original_open(path, *args, **kwargs)

    monkeypatch.setattr(Path, "open", guarded_open)


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
    queries = load_benchmark_queries(QUERY_SOURCE)[:60]
    assert len(queries) == 60
    assert queries[0]["text"] == "epic music"
    assert queries[-1]["text"] == "a quiet piece that slowly becomes more powerful"


def test_phase2_extracts_all_spanish_queries():
    queries = load_benchmark_queries(QUERY_SOURCE)[60:]
    assert len(queries) == 10
    assert queries[0] == {
        "query_id": "es061",
        "text": "música épica con coro",
        "category": "Spanish input benchmark",
        "language": "es",
    }


def test_benchmark_queries_preserve_complete_historical_contract():
    queries = load_benchmark_queries(QUERY_SOURCE)
    assert len(queries) == 70
    assert len({query["query_id"] for query in queries}) == 70
    assert [query["query_id"] for query in queries] == (
        [f"en{number:03d}" for number in range(1, 61)]
        + [f"es{number:03d}" for number in range(61, 71)]
    )
    assert [query["language"] for query in queries] == ["en"] * 60 + ["es"] * 10
    categories = (
        ["Broad mood / genre"] * 8
        + ["Fine-grained instrument queries"] * 8
        + ["Compound queries"] * 8
        + ["Scene / narrative queries"] * 8
        + ["Style mixtures"] * 28
        + ["Spanish input benchmark"] * 10
    )
    assert [query["category"] for query in queries] == categories
    assert all(set(query) == {"query_id", "text", "category", "language"} for query in queries)
    # Captured from the historical parsers before the separation; covers every
    # record, field and its order without reading the ignored Markdown.
    canonical = json.dumps(queries, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    assert hashlib.sha256(canonical).hexdigest() == "3e47eb621180a25af13598d7d60f251abb5ccc2627c5d9a9daac66d1c6bbdbf9"


def test_benchmark_queries_equal_existing_phase2_artifacts():
    queries = load_benchmark_queries(QUERY_SOURCE)
    phase2 = REPOSITORY_ROOT / "benchmarks" / "music-intelligence-v2" / "phase2"
    assert queries[:60] == json.loads((phase2 / "queries_en.json").read_text(encoding="utf-8-sig"))
    assert queries[60:] == json.loads((phase2 / "queries_es.json").read_text(encoding="utf-8-sig"))
    references = json.loads(
        (REPOSITORY_ROOT / "services" / "music-intelligence-v2" / "config" / "spanish_benchmark_references.json")
        .read_text(encoding="utf-8-sig")
    )
    assert set(references) == {query["query_id"] for query in queries[60:]}
    assert all(isinstance(value, str) and value for value in references.values())


@pytest.mark.parametrize("invalid", [
    "not_list", "wrong_count", "not_record", "missing_field", "extra_field",
    "non_string", "empty_text", "blank_category", "duplicate_id",
    "wrong_id", "wrong_language", "wrong_order",
])
def test_benchmark_queries_reject_invalid_structure(tmp_path, invalid):
    queries = load_benchmark_queries(QUERY_SOURCE)
    if invalid == "not_list":
        queries = {"queries": queries}
    elif invalid == "wrong_count":
        queries.pop()
    elif invalid == "not_record":
        queries[0] = "not a record"
    elif invalid == "missing_field":
        del queries[0]["category"]
    elif invalid == "extra_field":
        queries[0]["extra"] = "unexpected"
    elif invalid == "non_string":
        queries[0]["text"] = 123
    elif invalid == "empty_text":
        queries[0]["text"] = ""
    elif invalid == "blank_category":
        queries[0]["category"] = "   "
    elif invalid == "duplicate_id":
        queries[1]["query_id"] = queries[0]["query_id"]
    elif invalid == "wrong_id":
        queries[60]["query_id"] = "es001"
    elif invalid == "wrong_language":
        queries[0]["language"] = "es"
    elif invalid == "wrong_order":
        queries[0], queries[1] = queries[1], queries[0]
    source = tmp_path / "invalid.json"
    source.write_text(json.dumps(queries, ensure_ascii=False), encoding="utf-8")
    with pytest.raises(ValueError):
        load_benchmark_queries(source)


@pytest.mark.parametrize("content", ["{invalid", '[{"query_id":"en001","query_id":"en002"}]'])
def test_benchmark_queries_reject_malformed_json_and_duplicate_fields(tmp_path, content):
    source = tmp_path / "invalid.json"
    source.write_text(content, encoding="utf-8")
    with pytest.raises(ValueError):
        load_benchmark_queries(source)


def test_benchmark_reader_does_not_normalize_text(tmp_path):
    queries = load_benchmark_queries(QUERY_SOURCE)
    queries[0]["text"] = "  Épic,  music!  "
    source = tmp_path / "queries.json"
    source.write_text(json.dumps(queries, ensure_ascii=False), encoding="utf-8")
    assert load_benchmark_queries(source) == queries


def test_phase2_default_preparation_uses_json_without_local_documents(tmp_path, monkeypatch):
    module = runpy.run_path(str(REPOSITORY_ROOT / "services" / "music-intelligence-v2" / "prepare_phase2.py"))
    namespace = module["main"].__globals__
    expected = load_benchmark_queries(QUERY_SOURCE)
    assert module["DEFAULT_QUERY_SOURCE"] == QUERY_SOURCE

    def forbid_markdown(*args):
        raise AssertionError("Default preparation must not use Markdown extractors")

    outputs = {}
    monkeypatch.setitem(namespace, "extract_english_queries", forbid_markdown)
    monkeypatch.setitem(namespace, "extract_spanish_queries", forbid_markdown)
    monkeypatch.setitem(namespace, "build_catalog", lambda *args: {"album_count": 0, "track_count": 0})
    monkeypatch.setitem(namespace, "write_json", lambda path, payload: outputs.__setitem__(path.name, payload))
    monkeypatch.setattr("sys.argv", ["prepare_phase2.py", "--output-root", str(tmp_path)])
    module["main"]()
    assert outputs["queries_en.json"] == expected[:60]
    assert outputs["queries_es.json"] == expected[60:]


def test_phase2_markdown_compatibility_is_explicit_and_self_contained(tmp_path, monkeypatch):
    module = runpy.run_path(str(REPOSITORY_ROOT / "services" / "music-intelligence-v2" / "prepare_phase2.py"))
    source = tmp_path / "synthetic.md"
    lines = ["# Core English queries", "## Synthetic"]
    lines += [f"{number}. `English {number}`" for number in range(1, 61)]
    lines += ["# Spanish input benchmark"]
    lines += [f"{number}. `Español {number}`" for number in range(61, 71)]
    lines += ["## Translation test"]
    source.write_text("\n".join(lines), encoding="utf-8")
    english, spanish = module["load_query_source"](source, "markdown")
    assert [query["query_id"] for query in english] == [f"en{number:03d}" for number in range(1, 61)]
    assert all(query["category"] == "Synthetic" and query["language"] == "en" for query in english)
    assert [query["query_id"] for query in spanish] == [f"es{number:03d}" for number in range(61, 71)]
    assert spanish[0]["text"] == "Español 61"
    with pytest.raises(ValueError):
        module["load_query_source"](source, "json")
    with pytest.raises(ValueError, match="Unsupported query format"):
        module["load_query_source"](source, "auto")
    monkeypatch.setattr("sys.argv", ["prepare_phase2.py", "--query-format", "markdown"])
    with pytest.raises(SystemExit) as error:
        module["main"]()
    assert error.value.code == 2
