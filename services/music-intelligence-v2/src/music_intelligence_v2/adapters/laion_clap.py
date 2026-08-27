from __future__ import annotations

import numpy as np

from .base import MusicTextModelAdapter, l2_normalize


class LaionClapAdapter(MusicTextModelAdapter):
    def load(self) -> None:
        import torch
        from transformers import AutoProcessor, ClapModel

        self._torch = torch
        self.processor = AutoProcessor.from_pretrained(
            self.config["checkpoint"], revision=self.config["revision"]
        )
        self.model = ClapModel.from_pretrained(
            self.config["checkpoint"], revision=self.config["revision"]
        ).to(self.device).eval()

    def embed_audio(self, waveform: np.ndarray, sample_rate: int) -> np.ndarray:
        if sample_rate != self.sample_rate:
            raise ValueError(f"Expected {self.sample_rate} Hz, got {sample_rate} Hz")
        inputs = self.processor(
            audio=[np.asarray(waveform, dtype=np.float32)],
            sampling_rate=sample_rate,
            return_tensors="pt",
        )
        inputs = {key: value.to(self.device) for key, value in inputs.items()}
        with self._torch.inference_mode():
            embedding = self.model.get_audio_features(**inputs)
        result = embedding.detach().float().cpu().numpy()[0]
        self.embedding_dimension = int(result.shape[-1])
        return l2_normalize(result)

    def embed_texts(self, texts: list[str]) -> np.ndarray:
        inputs = self.processor(text=texts, padding=True, return_tensors="pt")
        text_inputs = {
            key: value.to(self.device)
            for key, value in inputs.items()
            if key in {"input_ids", "attention_mask"}
        }
        with self._torch.inference_mode():
            embedding = self.model.get_text_features(**text_inputs)
        result = embedding.detach().float().cpu().numpy()
        self.embedding_dimension = int(result.shape[-1])
        return l2_normalize(result)
