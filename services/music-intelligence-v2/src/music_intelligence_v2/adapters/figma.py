from __future__ import annotations

import numpy as np

from .base import MusicTextModelAdapter, l2_normalize


class FigmaAdapter(MusicTextModelAdapter):
    """Inference adapter following the official nishitanand/FIGMA implementation."""

    def load(self) -> None:
        import torch
        import torch.nn as nn
        import torch.nn.functional as functional
        from huggingface_hub import hf_hub_download
        from muq import MuQ
        from transformers import AutoModel, AutoTokenizer

        checkpoint_repo, checkpoint_file = self.config["checkpoint"].split(":", 1)
        checkpoint_path = hf_hub_download(
            repo_id=checkpoint_repo,
            filename=checkpoint_file,
            revision=self.config["revision"],
        )
        text_encoder_name = "intfloat/multilingual-e5-large-instruct"
        audio_encoder_name = "OpenMuQ/MuQ-large-msd-iter"

        class ProjectionHead(nn.Module):
            def __init__(self, input_dim: int, hidden_dim: int = 512, output_dim: int = 512):
                super().__init__()
                layer = nn.TransformerEncoderLayer(
                    d_model=input_dim,
                    nhead=8,
                    dim_feedforward=hidden_dim,
                    dropout=0.1,
                    batch_first=True,
                )
                self.transformer = nn.TransformerEncoder(layer, num_layers=2)
                self.output_proj = nn.Linear(input_dim, output_dim)

            def forward(self, values):
                if values.dim() == 2:
                    values = values.unsqueeze(1)
                    values = self.transformer(values).squeeze(1)
                else:
                    values = self.transformer(values)
                return self.output_proj(values)

        class FigmaModel(nn.Module):
            def __init__(self):
                super().__init__()
                self.muq = MuQ.from_pretrained(
                    audio_encoder_name,
                    revision=self_config["audio_encoder_revision"],
                ).eval().requires_grad_(False)
                self.text_encoder = AutoModel.from_pretrained(
                    text_encoder_name,
                    revision=self_config["text_encoder_revision"],
                )
                self.text_encoder.requires_grad_(False)
                self.audio_proj = ProjectionHead(1024)
                self.text_proj = ProjectionHead(self.text_encoder.config.hidden_size)

            @torch.no_grad()
            def encode_audio(self, wavs):
                wavs = torch.nan_to_num(wavs, nan=0.0, posinf=0.0, neginf=0.0)
                with torch.amp.autocast("cuda", enabled=False):
                    sequence = self.muq(wavs).last_hidden_state
                return functional.normalize(self.audio_proj(sequence.mean(dim=1)), dim=-1, eps=1e-8)

            @torch.no_grad()
            def encode_text(self, text_inputs):
                sequence = self.text_encoder(**text_inputs).last_hidden_state
                return functional.normalize(self.text_proj(sequence[:, 0, :]), dim=-1, eps=1e-8)

        self_config = self.config
        self._torch = torch
        self.tokenizer = AutoTokenizer.from_pretrained(
            text_encoder_name,
            revision=self.config["text_encoder_revision"],
        )
        model = FigmaModel()
        checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
        state = checkpoint.get("state_dict", checkpoint)
        missing, _ = model.load_state_dict(state, strict=False)
        bad = [key for key in missing if key.startswith(("audio_proj", "text_proj"))]
        if bad:
            raise RuntimeError(f"FIGMA projection weights missing: {bad}")
        self.model = model.to(self.device).eval()

    def embed_audio(self, waveform: np.ndarray, sample_rate: int) -> np.ndarray:
        if sample_rate != self.sample_rate:
            raise ValueError(f"Expected {self.sample_rate} Hz, got {sample_rate} Hz")
        tensor = self._torch.from_numpy(np.asarray(waveform, dtype=np.float32))[None, None]
        tensor = tensor.to(self.device)
        result = self.model.encode_audio(tensor).detach().float().cpu().numpy()[0]
        self.embedding_dimension = int(result.shape[-1])
        return l2_normalize(result)

    def embed_texts(self, texts: list[str]) -> np.ndarray:
        inputs = self.tokenizer(
            texts,
            return_tensors="pt",
            padding="max_length",
            truncation=True,
            max_length=128,
        ).to(self.device)
        result = self.model.encode_text(inputs).detach().float().cpu().numpy()
        self.embedding_dimension = int(result.shape[-1])
        return l2_normalize(result)
