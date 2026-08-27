from __future__ import annotations

import csv
import importlib.util
import json
import shutil
import threading
import urllib.request
from pathlib import Path

import pytest


SERVICE_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = SERVICE_ROOT.parents[1]
MODULE_PATH = SERVICE_ROOT / "review_app.py"
SPEC = importlib.util.spec_from_file_location("music_review_app", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
review_app = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(review_app)


@pytest.mark.parametrize(
    ("header", "size", "expected"),
    [
        (None, 1_000, None),
        ("bytes=0-99", 1_000, (0, 99)),
        ("bytes=100-", 1_000, (100, 999)),
        ("bytes=-100", 1_000, (900, 999)),
        ("bytes=900-2000", 1_000, (900, 999)),
    ],
)
def test_parse_byte_range(header, size, expected):
    assert review_app.parse_byte_range(header, size) == expected


@pytest.mark.parametrize("header", ["bytes=", "items=0-1", "bytes=1000-", "bytes=5-4"])
def test_parse_byte_range_rejects_invalid_values(header):
    with pytest.raises(review_app.ReviewValidationError):
        review_app.parse_byte_range(header, 1_000)


def make_store(tmp_path: Path):
    source = REPOSITORY_ROOT / "benchmarks" / "music-intelligence-v2" / "human_review_phase1.csv"
    csv_path = tmp_path / source.name
    shutil.copy2(source, csv_path)
    subset = REPOSITORY_ROOT / "benchmarks" / "music-intelligence-v2" / "track_subset.json"
    return review_app.ReviewStore(csv_path, subset, REPOSITORY_ROOT), csv_path


def test_store_loads_full_benchmark_and_saves_atomically(tmp_path):
    store, csv_path = make_store(tmp_path)
    bootstrap = store.bootstrap()
    initial_reviewed = bootstrap["summary"]["reviewed"]

    assert len(bootstrap["rows"]) == 1_440
    assert len(bootstrap["models"]) == 3
    assert len(bootstrap["modes"]) == 3
    assert len(bootstrap["queries"]) == 20
    assert bootstrap["summary"] == {"total": 1_440, "reviewed": initial_reviewed}
    assert bootstrap["quick_review"]["candidate_rows"] == 80
    assert bootstrap["quick_review"]["summary"]["total"] == 45

    target = next(row for row in bootstrap["rows"] if not row["human_score"])
    saved = store.update(target["row_index"], {"human_score": 3, "mood_correct": "yes", "notes": "Prueba local"})
    assert saved["summary"]["reviewed"] == initial_reviewed + 1
    assert saved["row_indices"] == [target["row_index"]]
    assert csv_path.with_suffix(".csv.bak").is_file()

    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        saved_row = list(csv.DictReader(handle))[target["row_index"]]
    assert saved_row["human_score"] == "3"
    assert saved_row["mood_correct"] == "yes"
    assert saved_row["notes"] == "Prueba local"

    with csv_path.with_suffix(".csv.bak").open("r", encoding="utf-8-sig", newline="") as handle:
        backup_row = list(csv.DictReader(handle))[target["row_index"]]
    assert backup_row["human_score"] == ""


def test_quick_review_propagates_one_judgment_to_equivalent_rows(tmp_path):
    store, csv_path = make_store(tmp_path)
    quick_rows = store.bootstrap()["quick_review"]["rows"]
    target = next(row for row in quick_rows if len(row["equivalent_row_indices"]) > 1)

    saved = store.update(target["row_index"], {"human_score": 2}, propagate_equivalent=True)

    assert saved["row_indices"] == target["equivalent_row_indices"]
    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    assert all(rows[index]["human_score"] == "2" for index in saved["row_indices"])
    assert saved["quick_summary"]["total"] == 45


def test_store_rejects_invalid_human_fields(tmp_path):
    store, _ = make_store(tmp_path)
    with pytest.raises(review_app.ReviewValidationError):
        store.update(0, {"human_score": 4})
    with pytest.raises(review_app.ReviewValidationError):
        store.update(0, {"unknown": "value"})


def test_http_health_bootstrap_and_audio_range(tmp_path):
    store, _ = make_store(tmp_path)
    server = review_app.create_server("127.0.0.1", 0, store)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base_url = f"http://127.0.0.1:{server.server_address[1]}"
    try:
        with urllib.request.urlopen(f"{base_url}/api/health") as response:
            assert json.load(response) == {"status": "ok"}

        with urllib.request.urlopen(f"{base_url}/api/bootstrap") as response:
            assert len(json.load(response)["rows"]) == 1_440

        request = urllib.request.Request(
            f"{base_url}/api/audio/avalon",
            headers={"Range": "bytes=0-99"},
        )
        with urllib.request.urlopen(request) as response:
            assert response.status == 206
            assert response.headers["Accept-Ranges"] == "bytes"
            assert response.headers["Content-Range"].startswith("bytes 0-99/")
            assert len(response.read()) == 100
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
