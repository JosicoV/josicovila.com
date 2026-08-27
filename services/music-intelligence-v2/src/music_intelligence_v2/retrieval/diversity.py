from __future__ import annotations

import re
import unicodedata
from collections import defaultdict
from typing import Any

import numpy as np


def normalized_title(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", ascii_value.casefold()).strip("-")


def infer_canonical_groups(
    tracks: list[dict[str, Any]],
    *,
    minimum_embedding_cosine: float = 0.9,
    maximum_duration_delta_seconds: float = 1.0,
) -> tuple[dict[str, str], list[dict[str, Any]]]:
    """Group same-title tracks only when duration and audio embeddings agree."""
    candidates: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for track in tracks:
        candidates[normalized_title(track["title"])].append(track)

    canonical_by_track = {track["track_id"]: track["track_id"] for track in tracks}
    groups = []
    for title_key, members in sorted(candidates.items()):
        if len(members) < 2:
            continue
        accepted = []
        comparisons = []
        anchor = members[0]
        for candidate in members[1:]:
            duration_delta = abs(float(anchor["duration_seconds"]) - float(candidate["duration_seconds"]))
            cosine = float(np.dot(anchor["global_embedding"], candidate["global_embedding"]))
            comparisons.append(
                {
                    "left": anchor["track_id"],
                    "right": candidate["track_id"],
                    "duration_delta_seconds": duration_delta,
                    "global_embedding_cosine": cosine,
                }
            )
            if duration_delta <= maximum_duration_delta_seconds and cosine >= minimum_embedding_cosine:
                accepted.append(candidate)
        if not accepted:
            continue
        canonical_id = f"composition-{title_key}"
        grouped_members = [anchor, *accepted]
        for member in grouped_members:
            canonical_by_track[member["track_id"]] = canonical_id
        groups.append(
            {
                "canonical_track_id": canonical_id,
                "title": anchor["title"],
                "members": [member["track_id"] for member in grouped_members],
                "comparisons": comparisons,
            }
        )
    return canonical_by_track, groups


def diversify_results(
    ranked_results: list[dict[str, Any]],
    canonical_by_track: dict[str, str],
    *,
    top_k: int,
) -> list[dict[str, Any]]:
    diversified = []
    seen = set()
    for source_rank, result in enumerate(ranked_results, 1):
        canonical_id = canonical_by_track.get(result["track_id"], result["track_id"])
        if canonical_id in seen:
            continue
        seen.add(canonical_id)
        diversified.append(
            {
                **result,
                "canonical_track_id": canonical_id,
                "source_rank": source_rank,
                "rank": len(diversified) + 1,
            }
        )
        if len(diversified) == top_k:
            break
    return diversified


def ranking_overlap(left: list[dict[str, Any]], right: list[dict[str, Any]], depth: int) -> dict[str, float | int | bool]:
    left_ids = [item["canonical_track_id"] for item in left[:depth]]
    right_ids = [item["canonical_track_id"] for item in right[:depth]]
    intersection = len(set(left_ids) & set(right_ids))
    union = len(set(left_ids) | set(right_ids))
    return {
        "top1_match": bool(left_ids and right_ids and left_ids[0] == right_ids[0]),
        "overlap_count": intersection,
        "jaccard": intersection / union if union else 1.0,
    }
