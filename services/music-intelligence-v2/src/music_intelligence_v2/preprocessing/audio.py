from __future__ import annotations

from pathlib import Path

import librosa
import numpy as np
from mutagen import File as MutagenFile


def probe_duration(path: Path) -> float:
    metadata = MutagenFile(path)
    if metadata is None or metadata.info is None:
        raise ValueError(f"Unable to read audio duration: {path}")
    return float(metadata.info.length)


def load_audio(path: Path, sample_rate: int) -> np.ndarray:
    waveform, _ = librosa.load(path, sr=sample_rate, mono=True, dtype=np.float32)
    return np.nan_to_num(waveform, nan=0.0, posinf=0.0, neginf=0.0).astype(np.float32)


def segment_bounds(duration: float, segment_seconds: float, segment_count: int) -> list[tuple[float, float]]:
    if duration <= 0 or segment_seconds <= 0 or segment_count <= 0:
        raise ValueError("Duration, segment length and segment count must be positive")
    if duration <= segment_seconds:
        return [(0.0, round(duration, 6))]
    starts = np.linspace(0.0, duration - segment_seconds, num=segment_count)
    unique_starts = sorted({round(float(start), 6) for start in starts})
    return [(start, round(min(duration, start + segment_seconds), 6)) for start in unique_starts]


def sliding_segment_bounds(
    duration: float,
    segment_seconds: float,
    stride_seconds: float,
) -> list[tuple[float, float]]:
    if duration <= 0 or segment_seconds <= 0 or stride_seconds <= 0:
        raise ValueError("Duration, segment length and stride must be positive")
    if stride_seconds > segment_seconds:
        raise ValueError("Stride must not exceed segment length")
    if duration <= segment_seconds:
        return [(0.0, round(duration, 6))]

    final_start = duration - segment_seconds
    starts = []
    current = 0.0
    while current < final_start:
        starts.append(round(current, 6))
        current += stride_seconds
    starts.append(round(final_start, 6))
    unique_starts = sorted(set(starts))
    return [
        (start, round(min(duration, start + segment_seconds), 6))
        for start in unique_starts
    ]


def extract_excerpt(
    waveform: np.ndarray,
    sample_rate: int,
    start: float,
    end: float,
    model_input_seconds: float,
) -> np.ndarray:
    start_sample = max(0, int(round(start * sample_rate)))
    end_sample = min(len(waveform), int(round(end * sample_rate)))
    segment = waveform[start_sample:end_sample]
    target_samples = max(1, int(round(model_input_seconds * sample_rate)))
    if len(segment) > target_samples:
        offset = (len(segment) - target_samples) // 2
        segment = segment[offset : offset + target_samples]
    elif len(segment) < target_samples:
        segment = np.pad(segment, (0, target_samples - len(segment)))
    return np.asarray(segment, dtype=np.float32)
