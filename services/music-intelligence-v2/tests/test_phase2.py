import importlib.util
from pathlib import Path


SERVICE_ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("phase2_full_catalog", SERVICE_ROOT / "phase2_full_catalog.py")
assert SPEC is not None and SPEC.loader is not None
phase2 = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(phase2)


def test_phase2_summary_measures_diversity_and_repetition():
    outputs = [
        {
            "category": "broad",
            "results": [{"track_id": "a"}, {"track_id": "b"}, {"track_id": "c"}],
        },
        {
            "category": "broad",
            "results": [{"track_id": "a"}, {"track_id": "c"}, {"track_id": "d"}],
        },
    ]
    summary = phase2.summarize_results(outputs)
    assert summary["top1_distinct_tracks"] == 1
    assert summary["top5_catalog_coverage"] == 4
    assert summary["maximum_top1_repetition"] == 2
    assert summary["category_top1_diversity"]["broad"] == {"queries": 2, "distinct_tracks": 1}
