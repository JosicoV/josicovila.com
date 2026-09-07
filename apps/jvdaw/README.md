# JV Studio

Browser-based MIDI composition workspace for `https://josicovila.com/jvdaw/`.

## Local development

```bash
npm install
npm run dev
```

Vite serves the application at `http://127.0.0.1:5173/jvdaw/` by default.

## Validation

```bash
npm test
npm run build
```

The production build is generated in `../../app/jvdaw/` because the current Apache deployment serves the repository's `app/` directory directly. Do not edit generated files there by hand.

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
- `src/audio/` translates beat-based project data into Tone.js transport events and owns one instrument, gain and panner chain per track.
- UI code consumes project snapshots and does not call Tone.js directly.
