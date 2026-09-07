# JV Studio — Status

## Implemented

- Vite + TypeScript application at `/jvdaw/`, desktop-first navy/cyan interface and local build output in `app/jvdaw/`.
- Versioned Project/Track/Clip/Note model, validation, serialization and immutable `ProjectStore`.
- Arranger with track/clip selection, creation, bar-snapped drag, duplicate/delete, overlap protection, playhead and scoped keyboard shortcuts.
- Piano Roll with MIDI 0–127 keyboard, octave-C labels, Draw/Select/Erase, drag/resize, 1/4–1/32 snap, zoom, numeric editing and clip-relative playhead.
- Track-aware note audition from keys, drawing, selection and every semitone crossed during vertical drag.
- Nine original synthesized presets with one playback and one preview voice per track.
- Live per-track volume, stereo pan, Mute and multi-Solo controls; structural edits still stop and rebuild playback.
- Browser-language UI: every `es-*` locale receives Spanish; every other locale falls back to English. Instrument IDs and project data remain locale-neutral.
- Bilingual in-app Help covering every shipped function, shortcut and current limitation.
- Combined workspace with Arranger above a docked Piano Roll; close, expand and restore modes.
- Horizontal and vertical keyboard-accessible drag separators with safe bounds and session persistence.
- Piano black-key rows extend across the timeline with subtle aligned shading.
- Adjacent Arranger/Piano Roll controls show the focused panel without hiding the combined workspace; Help sits with the project actions in the top bar.
- Play, Pause and Stop have distinct transport semantics: Pause preserves position, Play resumes and Stop returns to the beginning. Space toggles Play/Pause from the non-editable workspace.
- The demo opens with a selected two-bar First Pattern starter idea and the combined Arranger + Piano Roll view ready for immediate listening and editing.
- Projects start at 16 bars, expose a 1–1024 bar duration control, reject destructive shrinking and auto-grow in four-bar blocks when content reaches the end.
- Arranger zoom spans 25–400%, while Fit Project keeps the complete timeline visible and adapts ruler labels to long songs.
- Tracks and clips can be renamed; clips resize from the right edge in half-bar steps without clipping notes or crossing another clip.
- 46 automated tests pass; TypeScript and Vite production build pass.

## Manual validation

- The user approved the visual direction and heard/approved the initial synth and later piano-roll audition behavior.
- Current instrument/mixer and bilingual UI build has been visually reviewed in the local in-app browser in Spanish.
- The user manually validated two simultaneous tracks across Arranger and Piano Roll with different instruments, volume and stereo pan changes.
- The combined layout, both drag separators, black-key shading and expand/restore/close modes were visually verified in the local browser.
- Active-panel switching and Play/Pause/Space/Stop behavior were visually and audibly verified in the local browser.
- The two-bar starter pattern and combined view were visually verified locally; the starter remains easy to delete for experienced users.

## Pending

- Arranger clip edge-resizing with musical snap: creation remains one bar by default, while clips may be shortened to fractions of a bar or extended across multiple bars.
- Rename tracks and clips from the interface.
- Wide-range Arranger zoom plus an automatic Fit Project mode that shows the complete song without mandatory horizontal scrolling and adapts ruler-label density.
- Piano-roll multi-selection, copy/paste and draw-by-drag.
- IndexedDB persistence and `.jvdaw` import/export.
- Undo/Redo and offline WAV rendering.
- Homepage CTA and removal of `noindex, nofollow`, intentionally deferred until launch approval.

## Known limitations

- Open, Save and Export WAV remain disabled placeholders.
- The application is desktop-only below 780px.
- Project edits exist only in memory; refreshing resets the demo.
- Drum Synth is tonal synthesized percussion, not a mapped sample-based drum kit.

## Next milestone

Add persistence for saving and reopening project data, then prepare WAV export.
