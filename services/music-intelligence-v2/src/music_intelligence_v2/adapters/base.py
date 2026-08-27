from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass
from typing import Any

import numpy as np


@dataclass(frozen=True)
class AdapterInfo:
    key: str
    name: str
    checkpoint: str
    revision: str
    device: str
    sample_rate: int
    audio_input_seconds: float
    embedding_dimension: int | None
    license: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def l2_normalize(values: np.ndarray) -> np.ndarray:
    array = np.asarray(values, dtype=np.float32)
    norm = np.linalg.norm(array, axis=-1, keepdims=True)
    return array / np.maximum(norm, 1e-8)


class MusicTextModelAdapter(ABC):
    def __init__(self, key: str, config: dict[str, Any], device: str) -> None:
        self.key = key
        self.config = config
        self.device = device
        self.model: Any = None
        self.embedding_dimension: int | None = None

    @property
    def sample_rate(self) -> int:
        return int(self.config["sample_rate"])

    @property
    def audio_input_seconds(self) -> float:
        return float(self.config["audio_input_seconds"])

    @abstractmethod
    def load(self) -> None:
        """Load model weights and processors."""

    @abstractmethod
    def embed_audio(self, waveform: np.ndarray, sample_rate: int) -> np.ndarray:
        """Return one normalized embedding for a mono waveform."""

    @abstractmethod
    def embed_texts(self, texts: list[str]) -> np.ndarray:
        """Return one normalized embedding per query."""

    def info(self) -> AdapterInfo:
        return AdapterInfo(
            key=self.key,
            name=self.config["display_name"],
            checkpoint=str(self.config["checkpoint"]),
            revision=str(self.config["revision"]),
            device=self.device,
            sample_rate=self.sample_rate,
            audio_input_seconds=self.audio_input_seconds,
            embedding_dimension=self.embedding_dimension,
            license=str(self.config["license"]),
        )

    def close(self) -> None:
        self.model = None
        try:
            import torch

            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        except ImportError:
            pass
