# Phase 2 — canonical diversification and Spanish benchmark

## Canonical grouping

- Confirmed composition groups: 3.
- Grouped catalogue entries: 6.
- English queries affected by duplicate versions in raw top 10: 29/60.
- Duplicate result slots removed: 29.
- Rule: same normalized title, duration delta <= 1 s and global embedding cosine >= 0.90.

## Spanish to English

- Translator: `Helsinki-NLP/opus-mt-es-en` at `c96e2c5399ebfae4fc43d9669556b9afa74bb69d`.
- License: `Apache-2.0`.
- Language detection: 100% on 10/10 benchmark queries.
- Translation model load plus 10 translations: 1.49 s on CPU.
- Exact reference translations: 6/10.
- Mean translated/reference MuQ text cosine: 0.9861.
- Translated top-1 agreement with English reference: 90%.
- Direct-Spanish top-1 agreement: 20%.
- Translated mean top-5 overlap: 90%.
- Direct-Spanish mean top-5 overlap: 52%.
- Recommended strategy: `local_translation`.

## Caveats

- The language detector is deliberately bounded to Spanish/English music-search phrases; it is not a general-purpose detector.
- The only translated top-1 mismatch was `música tranquila y melancólica`: OPUS produced `quiet and melancholy music` instead of the reference `calm and melancholic music`; 4/5 and 9/10 results still overlapped.
- Validate broader free-form Spanish input before using this pipeline in a public endpoint.

## Boundary

This benchmark is offline and isolated. It does not modify PHP, Docker, frontend code or production services.
