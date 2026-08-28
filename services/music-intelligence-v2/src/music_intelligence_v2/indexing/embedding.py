from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np

from ..adapters.base import l2_normalize
from ..preprocessing import extract_excerpt, load_audio, probe_duration, sliding_segment_bounds


def preprocessing_config(adapter, segment_seconds: float, stride_seconds: float) -> dict[str, Any]:
    """Configuración de segmentación, idéntica a la que grabó la Fase 2.

    Se mantiene bit a bit igual porque los embeddings nuevos conviven en el
    mismo índice con los de entonces: cualquier diferencia de ventana o de
    solape haría incomparables unos vectores con otros.
    """
    return {
        "strategy": "sliding-window",
        "segment_seconds": segment_seconds,
        "stride_seconds": stride_seconds,
        "overlap_fraction": 1.0 - (stride_seconds / segment_seconds),
        "sample_rate": adapter.sample_rate,
        "audio_input_seconds": adapter.audio_input_seconds,
        "global_strategy": "l2-normalized mean of all segment embeddings",
    }


def expected_segment_count(audio_path: Path, segment_seconds: float, stride_seconds: float) -> int:
    """Cuántos segmentos daría este audio, sin decodificarlo.

    `probe_duration` lee la cabecera con mutagen, así que es instantáneo. Sirve
    para detectar que un índice heredado ya no corresponde con su audio antes
    de reutilizar sus embeddings.
    """
    duracion = probe_duration(audio_path)
    return len(sliding_segment_bounds(duracion, segment_seconds, stride_seconds))


def embed_track(
    adapter,
    audio_path: Path,
    *,
    segment_seconds: float,
    stride_seconds: float,
) -> dict[str, np.ndarray | float]:
    """Segmenta y embebe una pista. Es la operación cara que se quiere evitar."""
    duracion = probe_duration(audio_path)
    waveform = load_audio(audio_path, adapter.sample_rate)
    bordes = sliding_segment_bounds(duracion, segment_seconds, stride_seconds)

    vectores = []
    for inicio, fin in bordes:
        fragmento = extract_excerpt(
            waveform, adapter.sample_rate, inicio, fin, adapter.audio_input_seconds
        )
        vectores.append(adapter.embed_audio(fragmento, adapter.sample_rate))

    segmentos = np.stack(vectores).astype(np.float32)
    return {
        "segment_embeddings": segmentos,
        "global_embedding": l2_normalize(segmentos.mean(axis=0)).astype(np.float32),
        "segment_starts": np.asarray([b[0] for b in bordes], dtype=np.float32),
        "segment_ends": np.asarray([b[1] for b in bordes], dtype=np.float32),
        "duration_seconds": float(duracion),
    }
