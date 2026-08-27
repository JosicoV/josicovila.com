from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np

from ..adapters import create_adapter
from .errors import ModelUnavailable, TranslationFailed


def resolve_device(requested: str) -> str:
    import torch

    if requested == "auto":
        return "cuda" if torch.cuda.is_available() else "cpu"
    if requested == "cuda" and not torch.cuda.is_available():
        raise ModelUnavailable("CUDA requested but unavailable")
    return requested


class MuQTextEncoder:
    """Text side of the validated MuQ-MuLan retriever."""

    def __init__(self, config: dict[str, Any], device: str) -> None:
        self.config = config
        self.device = device
        self.adapter = None

    def load(self) -> None:
        try:
            adapter = create_adapter("muq_mulan", self.config, self.device)
            adapter.load()
            # Warm the lazy tokenizer so the first real query does not pay for it.
            adapter.embed_texts(["warmup"])
        except Exception as error:  # noqa: BLE001 - startup failure must be a stable service error
            raise ModelUnavailable(f"{type(error).__name__}: {error}") from error
        self.adapter = adapter

    def embed_query(self, text: str) -> np.ndarray:
        if self.adapter is None:
            raise ModelUnavailable("Retrieval model was not loaded")
        return np.asarray(self.adapter.embed_texts([text])[0], dtype=np.float32)

    def info(self) -> dict[str, Any]:
        if self.adapter is None:
            return {"key": "muq_mulan", "loaded": False}
        return {**self.adapter.info().to_dict(), "loaded": True}

    def close(self) -> None:
        if self.adapter is not None:
            self.adapter.close()
            self.adapter = None


class OpusTranslator:
    """Local, pinned OPUS-MT es→en. No network access at runtime."""

    def __init__(self, config: dict[str, Any], local_path: Path, *, max_new_tokens: int = 64) -> None:
        self.config = config
        self.local_path = local_path
        self.max_new_tokens = max_new_tokens
        self.tokenizer = None
        self.model = None

    def load(self) -> None:
        if not self.local_path.is_dir():
            raise TranslationFailed(f"Local translation model not found: {self.local_path}")
        try:
            from transformers import MarianMTModel, MarianTokenizer

            tokenizer = MarianTokenizer.from_pretrained(self.local_path, local_files_only=True)
            model = MarianMTModel.from_pretrained(self.local_path, local_files_only=True).eval()
        except Exception as error:  # noqa: BLE001 - startup failure must be a stable service error
            raise TranslationFailed(f"{type(error).__name__}: {error}") from error
        self.tokenizer = tokenizer
        self.model = model
        self.translate("hola")

    def translate(self, text: str) -> str:
        if self.tokenizer is None or self.model is None:
            raise TranslationFailed("Translation model was not loaded")
        encoded = self.tokenizer([text], return_tensors="pt", padding=True)
        generated = self.model.generate(**encoded, max_new_tokens=self.max_new_tokens)
        return self.tokenizer.batch_decode(generated, skip_special_tokens=True)[0].strip()

    def info(self) -> dict[str, Any]:
        return {
            "checkpoint": self.config.get("checkpoint"),
            "revision": self.config.get("revision"),
            "license": self.config.get("license"),
            "loaded": self.model is not None,
        }
