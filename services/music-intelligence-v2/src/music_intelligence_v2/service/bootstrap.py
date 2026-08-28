from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .encoders import MuQTextEncoder, OpusTranslator, resolve_device
from .index import SearchIndex
from .pipeline import SearchService

DEFAULT_RETRIEVAL_KEY = "muq_mulan"
DEFAULT_TRANSLATION_KEY = "opus_es_en"


@dataclass
class BootstrapResult:
    service: SearchService
    device: str
    timings: dict[str, float] = field(default_factory=dict)


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def build_service(
    *,
    index_dir: Path,
    model_registry: Path,
    translation_registry: Path,
    repository_root: Path,
    device: str = "auto",
    load_models: bool = True,
    telemetry_dir: Path | None = None,
    store_raw_query: bool = False,
) -> BootstrapResult:
    """Load index, retriever and translator eagerly so /health is truthful."""
    timings: dict[str, float] = {}
    retrieval_config = read_json(model_registry)[DEFAULT_RETRIEVAL_KEY]
    translation_config = read_json(translation_registry)[DEFAULT_TRANSLATION_KEY]

    started = time.perf_counter()
    index = SearchIndex.load(index_dir, expected_model=retrieval_config)
    timings["index_load_seconds"] = time.perf_counter() - started

    encoder: MuQTextEncoder | None = None
    translator: OpusTranslator | None = None
    resolved_device = "none"
    if load_models:
        resolved_device = resolve_device(device)

        started = time.perf_counter()
        translator = OpusTranslator(
            translation_config,
            (repository_root / translation_config["local_path"]).resolve(),
        )
        translator.load()
        timings["translator_load_seconds"] = time.perf_counter() - started

        started = time.perf_counter()
        encoder = MuQTextEncoder(retrieval_config, resolved_device)
        encoder.load()
        timings["model_load_seconds"] = time.perf_counter() - started

    collector = None
    if telemetry_dir is not None:
        from .collector import TelemetryCollector

        collector = TelemetryCollector(telemetry_dir, store_raw_query=store_raw_query)

    return BootstrapResult(
        service=SearchService(index, encoder, translator, telemetry=collector),
        device=resolved_device,
        timings=timings,
    )
