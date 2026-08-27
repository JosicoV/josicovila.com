# Phase 3 — search service latency

- Measured: 2026-08-27T21:40:53+00:00
- Device: `cuda`
- Index: `muq-segment-20260827T213721+0000` (115 tracks, 1429 segments)

## Startup

- Total service startup: 25.21 s
- Index load: 0.024 s
- Translator load: 8.26 s
- Retrieval model load: 13.17 s
- Peak VRAM: 2.50 GiB

## Warm request latency

| Path | Stage | Mean | Median | p95 | Max |
| --- | --- | --- | --- | --- | --- |
| English | text embedding | 20.29 ms | 19.83 ms | 24.02 ms | 28.23 ms |
| English | retrieval and ranking | 0.50 ms | 0.48 ms | 0.59 ms | 0.73 ms |
| English | translation | 0.00 ms | 0.00 ms | 0.00 ms | 0.00 ms |
| English | total | 20.85 ms | 20.42 ms | 24.57 ms | 28.85 ms |
| Spanish | text embedding | 27.15 ms | 26.85 ms | 30.33 ms | 32.52 ms |
| Spanish | retrieval and ranking | 0.70 ms | 0.67 ms | 0.86 ms | 0.87 ms |
| Spanish | translation | 162.57 ms | 157.21 ms | 208.30 ms | 216.57 ms |
| Spanish | total | 190.52 ms | 188.05 ms | 237.78 ms | 249.82 ms |
| HTTP | search round trip | 26.42 ms | 24.20 ms | 43.51 ms | 51.35 ms |
| HTTP | health round trip | 1.11 ms | 1.07 ms | 1.33 ms | 1.33 ms |

## Boundary

Loopback only. No production port, PHP file, Docker service or deployment was touched.
