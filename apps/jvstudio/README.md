# JV Studio

Browser-based MIDI composition workspace for `https://josicovila.com/jvstudio/`.

## Local development

```bash
npm install
npm run dev
```

Vite serves the application at `http://127.0.0.1:5173/jvstudio/` by default.

## Validation

```bash
npm test
npm run build
```

## Instrument sample deployment

Instrument manifests, licences and the frozen schema are versioned in Git. The
OGG sample binaries are deliberately ignored. Production receives a verified
copy of the complete public instrument library in
`/opt/containers/josicovila-com/data/jvstudio-instruments`, mounted read-only at
`/var/www/html/jvstudio/instruments`, so it survives Git pulls and container
rebuilds without inflating ordinary code deploys.

Before deploying code that refers to a new library version, upload and verify
the samples from the repository root:

```powershell
.\scripts\deploy_jvstudio_samples.ps1 -HostName HOST -UserName USER
```

Use `-ValidateOnly` to run the complete local manifest check without opening an
SSH connection.

The script validates every local sample against the SHA-256 and byte size in
its manifest, creates one temporary TAR archive, transfers it over SCP and
extracts it into `/opt/containers/josicovila-com/data/jvstudio-instruments`.
The VPS compose must contain this mount before the first Git deployment:

```yaml
- ./data/jvstudio-instruments:/var/www/html/jvstudio/instruments:ro
```

Upload the library and edit the compose first. The compose change only takes
effect when the subsequent code deployment recreates the container, avoiding a
period in which the previous application sees the new incompatible catalogue.

The production build is generated in `../../app/jvstudio/` because the current Apache deployment serves the repository's `app/` directory directly. Do not edit generated files there by hand.

The pre-launch build is deliberately marked `noindex, nofollow`. Remove both the HTML meta directive and the Apache `X-Robots-Tag` header when the public CTA is launched.

No push or production deployment should be made without explicit approval: pushes to this repository are treated as production-affecting.

## Keeping Help current

Every shipped feature, shortcut or changed behavior must update both language variants in the user-facing guide in
`src/ui/help/HelpDialog.ts` in the same change. Document actual availability, scope of
shortcuts, playback side effects and storage limitations. Do not describe planned
features as available. Verify that the guide agrees with the controls before release.

The UI resolves Spanish for every browser locale beginning with `es`; all other locales fall back to English. Keep stable project data and instrument IDs language-neutral.

## Architecture

- `src/project/` owns the versioned domain model, validation, serialization, timing and state transitions.
- `src/audio/` translates beat-based project data into Tone.js transport events. `MixerEngine` owns track inserts, pan, gain, meters, fixed send buses and the Master path for both live playback and offline WAV rendering; `src/audio/effects/` contains the five built-in JV processors.
- UI code consumes project snapshots and does not call Tone.js directly.
