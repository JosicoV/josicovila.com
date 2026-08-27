from __future__ import annotations

from typing import Any

from .base import MusicTextModelAdapter


def create_adapter(key: str, config: dict[str, Any], device: str) -> MusicTextModelAdapter:
    if key == "muq_mulan":
        from .muq_mulan import MuQMuLanAdapter

        return MuQMuLanAdapter(key, config, device)
    if key == "figma":
        from .figma import FigmaAdapter

        return FigmaAdapter(key, config, device)
    if key == "laion_clap":
        from .laion_clap import LaionClapAdapter

        return LaionClapAdapter(key, config, device)
    raise ValueError(f"Unsupported model adapter: {key}")
