from __future__ import annotations

import numpy as np

from .base import MusicTextModelAdapter, l2_normalize


class MuQMuLanAdapter(MusicTextModelAdapter):
    def load(self) -> None:
        import torch
        from muq import MuQMuLan

        self._torch = torch
        self.model = MuQMuLan.from_pretrained(
            self.config["checkpoint"],
            revision=self.config["revision"],
        )
        self.model = self.model.to(self.device).eval()

    def embed_audio(self, waveform: np.ndarray, sample_rate: int) -> np.ndarray:
        if sample_rate != self.sample_rate:
            raise ValueError(f"Expected {self.sample_rate} Hz, got {sample_rate} Hz")
        tensor = self._torch.from_numpy(np.asarray(waveform, dtype=np.float32)).unsqueeze(0)
        tensor = tensor.to(self.device)
        with self._torch.inference_mode():
            embedding = self.model(wavs=tensor)
        result = embedding.detach().float().cpu().numpy()[0]
        self.embedding_dimension = int(result.shape[-1])
        return l2_normalize(result)

    def embed_texts(self, texts: list[str]) -> np.ndarray:
        # MuQ lazily creates its XLM-R tokenizer.  Recent Transformers releases
        # may perform a Hub metadata request during that first construction even
        # when every tokenizer file is already cached.  Phase 2 must be runnable
        # without network access, so initialise the tokenizer explicitly from the
        # local cache before MuQ reaches its lazy property.
        text_encoder = self.model.mulan_module.text
        if getattr(text_encoder, "_tokenizer", None) is None:
            from transformers import AutoTokenizer

            text_encoder._tokenizer = AutoTokenizer.from_pretrained(
                text_encoder.model_name,
                trust_remote_code=True,
                cache_dir=text_encoder.hf_hub_cache_dir,
                local_files_only=True,
            )
        with self._torch.inference_mode():
            embedding = self.model(texts=texts)
        result = embedding.detach().float().cpu().numpy()
        self.embedding_dimension = int(result.shape[-1])
        return l2_normalize(result)
