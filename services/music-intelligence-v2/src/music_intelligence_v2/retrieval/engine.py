from __future__ import annotations

from typing import Any

import numpy as np


def rank_tracks(
    query_embedding: np.ndarray,
    tracks: list[dict[str, Any]],
    mode: str,
    global_weight: float = 0.5,
    segment_weight: float = 0.5,
    top_k: int = 8,
) -> list[dict[str, Any]]:
    if mode not in {"global", "segment", "hybrid"}:
        raise ValueError(f"Unsupported retrieval mode: {mode}")
    if mode == "hybrid" and not np.isclose(global_weight + segment_weight, 1.0):
        raise ValueError("Hybrid weights must sum to 1")

    query = np.asarray(query_embedding, dtype=np.float32)
    ranked: list[dict[str, Any]] = []
    for track in tracks:
        global_score = float(np.dot(query, track["global_embedding"]))
        segment_scores = np.asarray(track["segment_embeddings"], dtype=np.float32) @ query
        best_index = int(np.argmax(segment_scores))
        best_segment_score = float(segment_scores[best_index])
        if mode == "global":
            score = global_score
        elif mode == "segment":
            score = best_segment_score
        else:
            score = global_score * global_weight + best_segment_score * segment_weight
        result = {
            "track_id": track["track_id"],
            "title": track["title"],
            "album": track["album"],
            "score": score,
            "global_score": global_score,
            "best_segment_score": best_segment_score,
            "best_segment": {
                "start": float(track["segment_starts"][best_index]),
                "end": float(track["segment_ends"][best_index]),
            },
        }
        ranked.append(result)

    ranked.sort(key=lambda item: (-item["score"], item["track_id"]))
    for rank, item in enumerate(ranked[:top_k], start=1):
        item["rank"] = rank
    return ranked[:top_k]
