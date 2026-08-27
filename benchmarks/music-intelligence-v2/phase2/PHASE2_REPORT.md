# Phase 2 — full-catalog MuQ-MuLan segment validation

## Configuration

- Model: `MuQ-MuLan`.
- Checkpoint: `OpenMuQ/MuQ-MuLan-large` at `2e01c796b71dca71b45251384c04cd7b237c9020`.
- License: `CC-BY-NC-4.0`.
- Device: `cuda` (NVIDIA GeForce RTX 4060, 610.88, 8188, 2058, 5899).
- Tracks: 115.
- Segments: 1429 windows of 25 s with 12.5 s stride.
- Retrieval mode: best segment cosine similarity.

## Performance

- Model load: 12.50 s.
- Catalog embedding/cache load: 0.45 s.
- Fresh inference time: 0.00 s.
- Cache hits: 115/115.
- Peak allocated VRAM: 2.49 GiB.
- Initial catalog build: 544.32 s (495.65 s fresh inference, 5/115 prior cache hits).
- Initial peak allocated VRAM: 2.69 GiB.

## Automated retrieval checks

- English queries: 60.
- Distinct top-1 tracks: 28.
- Catalog coverage in top 5: 65/115.
- Catalog coverage in top 10: 83/115.
- Maximum repetition of one top-1 track: 11/60 queries.
- Maximum repeated identical top-5 ranking: 1.
- Text embedding collapse guard: passed (mean off-diagonal cosine 0.3217).

## Interpretation and next guardrails

- The rankings are technically valid, but automated diversity does not replace semantic human review.
- Top-1 concentration remains visible: one track leads 11/60 queries.
- Alternate recordings or versions of one composition can occupy several positions in the same top 10.
- Before UI integration, add canonical-track grouping/diversification and validate Spanish-to-English consistency.

## Boundary

This run creates an offline index and validation report only. It does not modify or connect to the PHP frontend, API, Docker configuration or production deployment.
