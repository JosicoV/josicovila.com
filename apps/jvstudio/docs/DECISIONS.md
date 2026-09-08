# JV Studio — Architecture decisions

## ADR-001 — Keep JV Studio in the josicovila.com repository

**Status:** Accepted  
**Decision:** Keep the application source in `apps/jvstudio/` and serve its build at `/jvstudio/`.

This keeps the future homepage CTA and JV Studio release coordinated while preserving a clean boundary from the existing PHP application.

## ADR-002 — Generate deployable assets under app/jvstudio

**Status:** Accepted for the current deployment model  
**Decision:** Configure Vite to write its production output to `app/jvstudio/`.

The current Apache container bind-mounts `app/` over `/var/www/html`, including in the VPS reference configuration. Assets placed only in a Docker build stage would therefore be hidden by that mount. Generated files must never be edited by hand.

## ADR-003 — Audio processing remains client-side

**Status:** Accepted  
**Decision:** Use Tone.js over the Web Audio API and require a user gesture before starting the AudioContext.

The VPS serves static assets and does not synthesize, mix or render audio.

## ADR-004 — Keep the first milestone deliberately narrow

**Status:** Accepted  
**Decision:** Implement only the shell, one synth pattern, transport controls and BPM editing before any complete arranger or piano-roll editor.

This validates timing and browser audio behavior before building editing features on top.

## ADR-005 — Use an unlisted public URL for pre-launch testing

**Status:** Accepted  
**Decision:** Allow real-environment testing at `/jvstudio/` without adding the homepage CTA, and mark the application `noindex, nofollow` until launch.

The URL is intentionally unannounced, but it is not authentication and must not be treated as private access.

## ADR-006 — Validate a versioned domain model at every mutation boundary

**Status:** Accepted  
**Decision:** Represent projects as versioned JSON and route changes through an immutable `ProjectStore`. Validate loaded projects and every completed store mutation.

IDs remain stable and unique across the project. Store snapshots are cloned so UI code cannot mutate internal state accidentally, and semantic change events leave a clean seam for future Undo/Redo.

## ADR-007 — Express musical scheduling in beats and transport ticks

**Status:** Accepted  
**Decision:** Store note and clip positions in beats, converting them to Tone.js transport ticks only at the audio boundary.

This keeps project data independent of tempo and allows BPM changes to affect playback without rewriting note positions.

## ADR-008 — Render the arranger from store snapshots

**Status:** Accepted  
**Decision:** Build track lanes, clips, selection details and project timing from cloned `ProjectStore` snapshots rather than maintaining parallel UI data.

Clip creation snaps to a full bar in this first slice and refuses overlaps. Finer snap choices and drag editing remain separate follow-up work so their interaction rules can be tested explicitly.

## ADR-009 — Clip editing and playback agree

Clips play once at their displayed position; the global project range loops. The old hidden one-bar demo repeat is removed. Structural store changes stop playback and replace the schedule; Play starts the new arrangement. Live seamless rescheduling is deferred.

## ADR-010 — Help grows with the product

At the user's request, every added function or shortcut updates the in-app Help guide in the same change. Help describes shipped behavior, keyboard scope and present limitations. It is implemented as a native modal dialog with Escape dismissal and focus return to its launcher.

## ADR-011 — First piano roll uses a separate working panel

**Status:** Superseded by ADR-014  

Piano Roll temporarily covers the arranger while leaving the global transport available. It owns note selection and scoped shortcuts; the arranger retains clip selection. DOM notes use quarter-note beats, 20px semitone rows and pure geometry functions for snapping and boundary constraints. Pointer previews do not mutate the store until release. Changes are validated by ProjectStore, update the arrangement and stop playback. The playhead reads cached clip bounds instead of cloning the project every frame.

## ADR-012 — Audition notes without changing transport

Keyboard and note previews use a separate synth voice with the same current preset, avoiding note-off interference with arranged playback. Apply the selected track volume and a short fixed preview duration. Future instrument selection must update both playback and preview together. Key labels show only C octaves, while full pitches remain accessible via tooltips and aria labels.

Drag uses pointer capture on the stable arranger container, a five-pixel threshold and a visual preview. A successful drop commits one store mutation. Escape/pointer cancellation leaves the model intact; collisions and project boundary violations are rejected. Keyboard shortcuts are scoped to the focused arranger.

## ADR-013 — Give every track an independent live audio chain

Each instrument track owns separate playback and preview synthesizers feeding independent gain and stereo-panner nodes. A shared preset factory keeps arranged playback and Piano Roll audition sonically consistent. Volume, pan, Mute and Solo update these nodes without stopping transport; structural clip/note changes still rebuild the schedule and return to the start.

All track events remain scheduled even while muted or excluded by Solo, so changing the mix during playback takes effect immediately. Preview deliberately bypasses Mute/Solo while retaining track volume and pan, allowing a muted track to be auditioned while editing.

## ADR-014 — Combine Arranger and Piano Roll after the mixer milestone

**Status:** Implemented  
The workspace keeps Arranger above an optional docked Piano Roll, sharing transport and clip selection, with controls to close, expand or restore the editor. Selecting another clip while docked changes the edited clip; selecting only a track or deleting the edited clip closes the editor cleanly.

Horizontal and vertical accessible separators resize Arranger/Piano Roll height and Tracks/Arranger width within safe viewport bounds. Pointer and arrow-key changes are stored in `sessionStorage`; unavailable storage does not disable resizing. Piano black-key rows use a subtle repeating background aligned to the 20px semitone grid.

## ADR-015 — Select the whole interface language from the browser locale

At startup, locales beginning with `es` use Spanish for the complete UI and Help, covering all regional Spanish variants. Every other locale uses English as the fallback. Stable project fields such as instrument IDs remain language-neutral while display names and descriptions are localized, so changing browser language never changes project compatibility.

Both language variants must be updated whenever a visible behavior or Help entry changes. The root document `lang` attribute is set to the resolved language for assistive technology.

## ADR-016 — Keep clip duration flexible and names editable

**Status:** Implemented
The one-bar duration belongs only to the current default creation gesture; it is not a project-model restriction. Arranger clips resize from their right edge in half-bar steps so they can span fractions of a bar, one bar or multiple bars, while remaining inside the project and avoiding same-track overlaps.

Track and clip names are editable in the track inspector. Shortening a clip never destroys notes: a resize is rejected when any note would fall outside the new end. Project validation also rejects overlapping clips below the UI layer.

## ADR-017 — Give Arranger a wide zoom range and Fit Project mode

**Status:** Implemented
Arranger zoom must cover both detailed editing and a complete-song overview. A Fit Project mode computes bar width from the available lane width so projects such as 40 bars remain visible without mandatory horizontal scrolling. It recalculates when project duration or the Tracks/Arranger divider changes.

Manual zoom uses a substantially wider pixels-per-bar range than Piano Roll and enables horizontal scrolling for precision. The ruler reduces label frequency as bars become narrow, while track labels remain fixed. Changing zoom should preserve a useful visual anchor rather than unexpectedly jumping to the beginning.

## ADR-018 — Separate panel focus from visibility and distinguish Pause from Stop

**Status:** Implemented  
Arranger and Piano Roll are adjacent workspace controls whose active state identifies the focused panel; switching focus does not hide either panel in the combined layout. Help belongs in the top bar beside project actions so workspace navigation stays grouped. Piano Roll remains unavailable until a clip is selected.

Pause releases active voices and preserves the transport position, Play resumes from that position, and Stop returns to the beginning. Space toggles Play/Pause only from the non-editable workspace; inputs, selectors, buttons, editable content and open dialogs retain their native keyboard behavior.

## ADR-019 — Start with a small editable musical idea in the combined view

**Status:** Implemented
The demo opens with a selected two-bar First Pattern on a synthesized instrument, including notes in both bars, and the Arranger + Piano Roll view already open. This gives first-time users an immediate sound and a safe place to experiment; experienced users can move, edit or delete the starter clip and continue from an empty lane.

The starter remains ordinary project data rather than a special tutorial mode, so every existing editing gesture, shortcut and validation rule applies to it. New-project templates can later offer the same starter or a blank alternative once project creation exists.

## ADR-020 — Grow project duration without destroying content

**Status:** Implemented
Projects start with 16 bars and expose an explicit 1–1024 bar duration control. Manual extension or safe shrinking is allowed, but validation rejects any length that would place an existing clip beyond the project end. Removing or moving content earlier never shrinks the project automatically.

When creating, moving or duplicating a clip reaches the current end, the project grows to the next four-bar block and keeps at least one bar of breathing room. Growth lives in `ProjectStore`, with project-bound validation below the UI, so future import, persistence and editing paths cannot silently create an inconsistent timeline.

## ADR-021 — Make file persistence explicit and hard to miss

**Status:** Implemented
Save downloads a portable `.jvstudio.json` project file and Open validates and restores it. The first visit shows a plain-language welcome explaining that users must save before leaving and can open the file when they return. A “do not show again” preference is local to the current browser.

After any project mutation, `beforeunload` asks the browser to warn before navigation or closing. Opening another project also requests confirmation when the current one has unsaved changes. Help repeats the rule, but the welcome is the primary onboarding surface.

## ADR-022 — Render WAV entirely in the browser

**Status:** Implemented
WAV export renders the whole project offline at 44.1 kHz stereo and encodes 16-bit PCM locally. It prepares the manifest-selected samples used by the project and applies the current track volume, pan, Mute and Solo state; no project or audio data is uploaded.

The render includes a short release tail and is capped at 20 minutes to avoid excessive browser memory use. Export does not mark the editable project as saved: users still need the `.jvstudio.json` file to continue composing later.

## ADR-023 — Use JV Studio as the public and internal product name

**Status:** Implemented
The canonical route is `/jvstudio/`, with source in `apps/jvstudio/` and deployable output in `app/jvstudio/`. The former `/jvdaw/` route redirects permanently so existing private links keep working.

JV Studio matches the established logo and remains accurate as the product grows. “DAW” is still a useful category description, but the public name does not imply that the current MIDI-focused release already provides conventional multitrack audio recording and editing.

## ADR-024 — Consume JV Instrument Library v1 through frozen manifests

**Status:** Implemented
JV Studio discovers the 13 definitive instruments through a small versioned catalog and builds every visible definition from each immutable `manifest.json`. The generic factory accepts only `schemaVersion: 1` and `engine: sampler`; unknown engines, missing mandatory attribution and invalid channel counts fail cleanly.

Sample selection uses only the manifest velocity intervals, `loNote`/`hiNote` and `rootMidi`. Audio keeps the decoded mono or stereo channel layout and applies manifest attack, release and gain. The former synthesized demonstration presets and the temporary `jv-grand-piano-light` package are removed.

Only manifests load at startup. Samples load and decode on first use or as preparation for MIDI notes already present in the project, then share an `AudioBuffer` cache. A progress bar reports the bytes being prepared. The exact required attribution for JV Grand Piano and JV Soft Piano is shown in their instrument descriptions.

OGG binaries are ignored by Git and by the Docker build context. A validated copy of the complete public library is deployed separately and mounted read-only from persistent VPS data; code, manifests, licences, catalogue and the frozen schema remain versioned. This prevents Git history and ordinary autodeploys from carrying sample payloads while keeping runtime URLs unchanged.

## ADR-025 — Centralize playback and offline routing in MixerEngine

**Status:** Implemented
Track and Master routing belongs to `MixerEngine`, never to individual UI controls. Each track exposes a playback input followed by an insert-chain boundary, pan, gain and meter. The post-fader signal feeds the dry Master path plus fixed Reverb and Delay send taps. Piano Roll preview retains its independent Mute/Solo bypass while joining the same track meter and Master path.

Reverb and Delay use one shared `SendBus` each, initially with zero-level track taps. `MasterBus` owns the Master insert boundary, volume and output meter. Playback and offline WAV rendering instantiate the same routing graph so future effects have one integration point and parity does not depend on duplicated connection code.

Project schema v3 introduces two insert slots, fixed send levels and Master limiter state. Versions 1 and 2 migrate with empty inserts, zero sends and the limiter enabled, preserving the sound of existing projects. Concrete effect processors remain a separate phase; the routing boundaries are intentionally pass-through until then.
