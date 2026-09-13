# JV Studio integration — definitive delivery (2026-09-13)

The complete, byte-identical delivery lives in `../../public/instruments/delivery/`.
Read its LEEME.md, docs/integration.md, index.json, schema/ and NOTA-TECNICA.md.
The delivery integration document contains historical references to 13 instruments;
the definitive index discovers 17. Instrument manifests govern every playback value.

The app fetches delivery/index.json and its listed manifests, validates the frozen
JSON Schema 2020-12 plus mapping coverage, then builds the UI from manifest metadata.
No sample audio is requested at startup. Legacy instrument IDs remain unchanged.
New asset URLs contain delivery/dist/, avoiding stale cached assets from the previous
13-instrument integration without modifying delivered v1 manifests or samples.

Playback uses one ToneBufferSource per note with the exact mapped sample and
2 ** ((midi - rootMidi) / 12). Attack and release use linear ramps in seconds;
gain is velocity * 10 ** (gainDb / 20), identically for all instruments. No extra
normalization, channel compensation, automatic pan, loops or round robin are added.
The existing track pan remains available for mono and stereo sources alike.

Loading is lazy, with up to four concurrent decodes per voice preparation. A shared
128 MiB PCM LRU reuses buffers; prepared track samples remain protected by voice
references even if evicted from the shared cache. This is not a total RAM cap:
active MIDI ranges and offline output also consume memory. Preview-only voice
buffers are bounded to 32 MiB (apart from a single larger sample). Disposal clears
voice references and cancels pending-note playback; failed fetches can be retried.

Offline WAV uses the same loader and preserves nodes until rendering completes,
then disposes voices and mixer in finally. The render includes manifest release.
Credits are visible in instrument descriptions and docs/licenses/instruments.md;
the original LICENSE.txt files and delivery/licenses/ accompany the assets.

Run `npm test`, `npm run build`, and open `/jvstudio/tests/library-qa.html` under
the Vite development server for real Web Audio regression tests. This QA page is
not a production build entry. See VALIDATION-2026-09-13.md for measured results.

Sample binaries remain excluded from Git. The deployment helper validates every
manifest-declared file and SHA-256 from delivery/index.json before copying the
complete library to the existing instrument volume. Upload samples before releasing
the app build; no production deployment is performed by these local changes.
