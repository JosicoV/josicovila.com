from __future__ import annotations

import csv
import sys
from pathlib import Path


SERVICE_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = SERVICE_ROOT.parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

import analyze_human_review  # noqa: E402
from review_app import HUMAN_FIELDS, ReviewStore  # noqa: E402


def completed_store(tmp_path: Path) -> ReviewStore:
    source = REPOSITORY_ROOT / "benchmarks" / "music-intelligence-v2" / "human_review_phase1.csv"
    destination = tmp_path / source.name
    with source.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        fieldnames = list(reader.fieldnames or [])
        rows = list(reader)
    for row in rows:
        for field in HUMAN_FIELDS:
            row[field] = ""
        row["human_score"] = "2"
    with destination.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    subset = REPOSITORY_ROOT / "benchmarks" / "music-intelligence-v2" / "track_subset.json"
    return ReviewStore(destination, subset, REPOSITORY_ROOT)


def test_quick_analysis_aggregates_four_systems(tmp_path):
    analysis = analyze_human_review.build_analysis(completed_store(tmp_path))

    assert analysis["status"]["reviewed"] == 45
    assert analysis["status"]["candidate_rows"] == 80
    assert set(analysis["systems"]) == set(analyze_human_review.SYSTEM_LABELS)
    assert all(metric["n"] == 20 for metric in analysis["systems"].values())
    assert all(metric["mean_score"] == 2 for metric in analysis["systems"].values())
    assert len(analysis["pairwise"]) == 6
    assert "## Ranking" in analyze_human_review.render_markdown(analysis)
