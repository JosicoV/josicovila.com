# Definitive library validation — 2026-09-13

## Delivery integrity

Source: sibling JVDAW-INSTRUMENTS/delivery. Destination: public/instruments/delivery.
All 853 files match byte-for-byte. The deployment validator checked SHA-256 and
byte sizes for all 789 samples (74,927,820 bytes). No manifest, gain or audio edits.
All 17 manifests validate against the delivered frozen schema and coverage rules.

## Staged real-browser validation

Run tests/library-qa.html with the Vite development server.
Pilot: JV Grand Piano (stereo) and JV Solo Cello (mono), six velocity-boundary
renders each, passed before running the complete library.

All 17 instruments then passed 96 renders covering the minimum and maximum
velocity of every layer at a middle-range note. Each render was compared against
an independent native OfflineAudioContext reference using the manifest's selected
file, rootMidi, gainDb, attack, release and channel count. Relative waveform error
energy was below 0.0001. Each instrument also produced a non-silent stereo PCM WAV
through renderProjectWav, exercising the full mixer/export path.

These are objective signal-level checks; they do not constitute a subjective
listening approval or a fresh integrated-LUFS calibration of the library. The
producer's calibrated gains and audio are preserved exactly. Known flute register
dispersion, mono recordings, transposition and finite sample tails are retained.

| Instrument | Velocity-boundary renders | Source channels | Native reference / WAV |
| --- | ---: | ---: | --- |
| JV Chamber Strings | 4 | 2 | PASS |
| JV Clarinet | 6 | 2 | PASS |
| JV Concert Flute | 4 | 2 | PASS |
| JV Concert Flute (Vibrato) | 2 | 2 | PASS |
| JV Double Bass | 10 | 1 | PASS |
| JV Electric Bass | 8 | 1 | PASS |
| JV Electric Guitar | 8 | 1 | PASS |
| JV French Horn | 6 | 2 | PASS |
| JV Glockenspiel | 6 | 2 | PASS |
| JV Grand Piano | 6 | 2 | PASS |
| JV Marimba | 6 | 2 | PASS |
| JV Oboe | 4 | 2 | PASS |
| JV Soft Piano | 6 | 2 | PASS |
| JV Solo Cello | 6 | 1 | PASS |
| JV Solo Violin | 4 | 2 | PASS |
| JV Trombone | 6 | 2 | PASS |
| JV Trumpet | 4 | 2 | PASS |

## Lifecycle and UI

- Catalog initialization decoded zero samples.
- All-instrument run ended with 117.5 MiB shared PCM cache, then cleared to zero.
- A separate 40-piano-sample pressure test ended with 124.0 MiB (128 MiB limit).
  The protected first sample still rendered after shared-cache eviction.
- Disposing the old voice while its first sample was downloading prevented the
  delayed note from playing; the new voice rendered successfully.
- Active MIDI buffers are retained separately from the bounded reusable cache.
  The cap is not a claim about total browser process memory or offline WAV memory.
- UI showed all 17 entries, Grand Piano and Soft Piano attribution text, and
  switching from piano to Electric Guitar retained running transport. No browser
  error/warning logs were observed during this UI check.

## Automated checks and build

70 tests passed in 19 files. Boundary checks cover every delivered sample's
mapping inside the declared instrument range; notes outside the range and
velocity zero are silent. Unknown engines/schema versions, invalid gains,
additional schema fields and overlapping mappings are rejected.
TypeScript and production Vite build passed. Vite reports a non-fatal main-chunk
size warning (526.40 kB minified, 143.66 kB gzip).

Build output is local in app/jvstudio. No commit, push or deployment performed.
Sample binaries remain excluded from Git and require the existing separate upload
before any future production release.
