# Phase 1 benchmark report

## A. Environment

- Windows 10 build 26200.
- Python 3.11.9 in an isolated `.venv`.
- PyTorch / torchaudio 2.10.0 + CUDA 13.0.
- Transformers 4.57.6.
- NVIDIA GeForce RTX 4060, 8,188 MiB, driver 610.88.
- System RAM: 15.86 GiB; available at final run start: 7.00 GiB.
- All checkpoints and package versions are pinned.

## B. Models successfully running

- FIGMA, revision `18b215fa5b6e5e7bc7f5807a7a51f50890c0a10a`.
- MuQ-MuLan, revision `2e01c796b71dca71b45251384c04cd7b237c9020`.
- LAION-CLAP HTSAT unfused baseline, revision `8fa0f1c6d0433df6e97c127f64b2a1d6c0dcda8a`.

All three completed the 15 tracks, 20 queries and three retrieval modes. Their
text embedding diversity passed the automatic collapse guard.

## C. Models unavailable or failed

- TP-CLAP: no official public checkpoint or reproducible inference repository.
- `laion/larger_clap_music`: technically loaded, but rejected as an invalid
  baseline. Four unrelated prompts had pairwise cosine similarities between
  0.999009 and 0.999474, and one track ranked first for every query and mode.
  It was replaced by the official HTSAT unfused checkpoint.

## D. Track subset

1. Quest for Avalon
2. Let the Wolf Out
3. Alone In the Crowd
4. Dawn in Istoccar
5. The Edge of the Unknown
6. Classical Is So Metal
7. Ancient Ritual
8. Raven Lullaby
9. Marching Through City Gates
10. A Night at the Tavern
11. Icebreaker Into the Storm
12. Healing Wind
13. Galloping to Kugrant
14. The Cry of the Elves
15. Dark Blue Horizon

The subset references the original MP3 paths; no audio was copied or modified.

## E. Segmentation strategy

- Six 25-second regions distributed evenly from the start to the end of each track.
- Short tracks reduce their segment count automatically.
- MuQ-MuLan consumes the complete 25-second region.
- FIGMA and LAION consume a deterministic centered 10-second excerpt inside each
  region, matching their official input expectation.
- The global vector is the L2-normalized mean of all six segment embeddings.
- Every match preserves the original 25-second region start/end as provenance.

## F. Retrieval modes implemented

- Global: cosine similarity against the pooled track vector.
- Segment: best individual segment cosine.
- Hybrid: 0.5 global + 0.5 best segment, configurable from the CLI.

## G. Benchmark execution status

- 20 English Phase 1 queries executed.
- Top 8 saved for every query/model/mode.
- 1,440 combined result rows generated.
- 1,440 CSV rows generated with all human judgment fields blank.
- Text embedding collapse guard: passed for all final models.
- Quick human relevance review: completed (45/45 unique judgments representing
  80 top-1 candidate rows from FIGMA and MuQ-MuLan segment/hybrid).

## H. Performance observations

Final run with all audio embeddings recomputed:

| Model | Load | 15-track embedding | Avg/track | Avg text query | Avg retrieval | Peak VRAM |
|---|---:|---:|---:|---:|---:|---:|
| FIGMA | 17.98 s | 16.54 s | 1.10 s | 34.86 ms | 0.116 ms | 3.61 GiB |
| MuQ-MuLan | 8.72 s | 22.83 s | 1.52 s | 125.12 ms | 0.098 ms | 2.72 GiB |
| LAION-CLAP | 14.24 s | 12.77 s | 0.85 s | 14.68 ms | 0.100 ms | 0.65 GiB |

Embedding cache files are approximately 0.21 MiB per valid model for this subset.
The LAION cache directory is approximately 0.41 MiB because it also retains the
discarded `larger_clap_music` diagnostic attempt under a different cache key.

Top-1 diversity over 20 queries (global / segment / hybrid distinct tracks):

- FIGMA: 4 / 4 / 4.
- MuQ-MuLan: 8 / 10 / 10.
- LAION-CLAP: 7 / 8 / 7.

This measures diversity, not relevance. Only human scoring can decide quality.

## I. Files generated

- `track_subset.json` and `benchmark_phase1.json`.
- `MODEL_RESEARCH.md` and `MODEL_STATUS.md`.
- Nine per-model/mode result JSON files.
- `results/combined_results.json` with 1,440 flattened rows.
- `results/performance*.json` and `results/environment.json`.
- `human_review_phase1.csv` with blank human fields.
- Ignored `.npz` embedding caches under `data/music-intelligence-v2/embeddings/`.

## J. Model-specific caveats

- FIGMA and MuQ-MuLan weights are CC BY-NC 4.0. They can be benchmarked locally,
  but must not be assumed suitable for a commercial production deployment.
- FIGMA is English-centric despite its multilingual E5 text encoder.
- MuQ-MuLan officially supports English and Chinese and recommends fp32; this
  benchmark uses fp32.
- LAION-CLAP is a historical general-audio baseline, not a modern music-specific
  winner. The music-specialized Transformers checkpoint was rejected for collapse.
- TP-CLAP remains paper-only for this benchmark.
- Segment ranking samples six regions; it does not exhaustively scan every second.

## K. Human-review decision and next step

The completed quick review selects **MuQ-MuLan with segment retrieval** for the
next isolated phase: mean human relevance 2.750/3, 20/20 top-1 results rated at
least good, no weak results and 10 distinct top-1 tracks. Detailed evidence is
in `PHASE1_HUMAN_REVIEW_REPORT.md` and
`results/human_review_quick_analysis.json`.

The next step is to validate this candidate offline against the complete
115-track catalog before designing or modifying any production integration.
The CC BY-NC 4.0 checkpoint-license caveat remains unresolved and must be
reviewed before any commercial use.

> **Phase 1 human evaluation complete: MuQ-MuLan · Segmento selected**
