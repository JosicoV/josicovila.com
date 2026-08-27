# Official model availability — 2026-08-27

Only official repositories, model cards and papers were used for this inventory.

## FIGMA

- Code: https://github.com/nishitanand/FIGMA
- Checkpoint: https://huggingface.co/nishitanand/FIGMA
- Locked revision: `18b215fa5b6e5e7bc7f5807a7a51f50890c0a10a`
- Checkpoint file: `figma.ckpt`, 3,838,497,572 bytes.
- Audio encoder: MuQ, locked at `0562a57814f6f8bbd9fdea0a25921a2fce1a841a`.
- Text encoder: multilingual E5 large instruct, locked at `274baa43b0e13e37fafa6428dbc7938e62e5c439`.
- Sample rate: 24 kHz; official clip expectation: 10 seconds.
- Embedding dimension: 512.
- Audio and text embeddings are L2-normalized; similarity is their dot product.
- Code license: MIT. Composite checkpoint: CC BY-NC 4.0, non-commercial research.

## MuQ-MuLan

- Code: https://github.com/tencent-ailab/MuQ
- Checkpoint: https://huggingface.co/OpenMuQ/MuQ-MuLan-large
- Locked revision: `2e01c796b71dca71b45251384c04cd7b237c9020`.
- Checkpoint size: 2,653,954,401 bytes.
- Sample rate: strictly 24 kHz; official recommendation is fp32 inference.
- Public model size: approximately 700M parameters.
- Supports English and Chinese text.
- Code license: MIT. Weights: CC BY-NC 4.0, non-commercial use.

## TP-CLAP

- Paper: https://arxiv.org/abs/2607.25085
- Paper version checked: v1, 2026-07-27.
- Status: unavailable for reproducible local evaluation.
- No official public checkpoint, inference repository or model card was found.
- The benchmark does not reconstruct or imitate the model from the paper.

## LAION-CLAP baseline

- Code: https://github.com/LAION-AI/CLAP
- Transformers checkpoint: https://huggingface.co/laion/clap-htsat-unfused
- Locked revision: `8fa0f1c6d0433df6e97c127f64b2a1d6c0dcda8a`.
- Checkpoint size: 614,525,833 bytes.
- Sample rate: 48 kHz; processor input window: 10 seconds.
- Embedding dimension: 512.
- Model card license: Apache 2.0.

The music-specialized `laion/larger_clap_music` revision
`a0b4534a14f58e20944452dff00a22a06ce629d1` was run first but rejected as an
invalid baseline. Four unrelated test prompts produced pairwise cosine
similarities from 0.999009 to 0.999474, and the same track ranked first for all
20 benchmark queries in every retrieval mode. This reproduces the collapsed
text-tower behavior reported at
https://github.com/embeddings-benchmark/mteb/issues/5069. Its raw attempt remains
documented, but it is excluded from the final comparison.

## MuQ for MIR

The official `OpenMuQ/MuQ-large-msd-iter` checkpoint is available, but it is an
audio-only representation model rather than a text–music retrieval model. It is
not included in the Phase 1 retrieval ranking. It can be evaluated later as a
complementary MIR feature source without conflating it with text retrieval.
