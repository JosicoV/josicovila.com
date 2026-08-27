from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import numpy as np


def cache_key(audio_path: Path, model_info: dict[str, Any], preprocessing: dict[str, Any]) -> str:
    stat = audio_path.stat()
    payload = {
        "audio_path": audio_path.resolve().as_posix(),
        "audio_size": stat.st_size,
        "audio_mtime_ns": stat.st_mtime_ns,
        "model": model_info,
        "preprocessing": preprocessing,
    }
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()[:20]


class EmbeddingCache:
    def __init__(self, root: Path) -> None:
        self.root = root

    def path_for(self, model_key: str, track_id: str, key: str) -> Path:
        return self.root / model_key / f"{track_id}-{key}.npz"

    def load(self, model_key: str, track_id: str, key: str) -> dict[str, np.ndarray] | None:
        path = self.path_for(model_key, track_id, key)
        if not path.exists():
            return None
        with np.load(path, allow_pickle=False) as values:
            return {name: values[name] for name in values.files}

    def save(self, model_key: str, track_id: str, key: str, **arrays: np.ndarray) -> Path:
        path = self.path_for(model_key, track_id, key)
        path.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(path, **arrays)
        return path
