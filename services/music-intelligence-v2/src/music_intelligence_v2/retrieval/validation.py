from __future__ import annotations

import numpy as np


def text_embedding_diversity(embeddings: np.ndarray, collapse_threshold: float = 0.995) -> dict[str, float | bool]:
    values = np.asarray(embeddings, dtype=np.float32)
    if values.ndim != 2 or values.shape[0] < 2:
        raise ValueError("At least two text embeddings are required")
    norms = np.linalg.norm(values, axis=1, keepdims=True)
    normalized = values / np.maximum(norms, 1e-8)
    similarities = normalized @ normalized.T
    off_diagonal = similarities[~np.eye(len(values), dtype=bool)]
    mean_similarity = float(off_diagonal.mean())
    max_similarity = float(off_diagonal.max())
    return {
        "mean_off_diagonal_cosine": mean_similarity,
        "max_off_diagonal_cosine": max_similarity,
        "collapse_threshold": collapse_threshold,
        "collapsed": mean_similarity >= collapse_threshold,
    }
