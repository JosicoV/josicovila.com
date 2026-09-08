import { barsToBeats, type MidiNote, type Project } from '../project';
import { trackGain } from './mix';

export interface TrackNote extends MidiNote { trackId: string }

// Keep muted/soloed events scheduled so mixer changes can take effect live.
export function scheduleEvents(project: Project): TrackNote[] {
  const end = barsToBeats(project.lengthBars, project.timeSignature);
  return project.tracks.flatMap((track) => track.clips.flatMap((clip) => clip.notes.map((note) => ({
    ...note, trackId: track.id,
    startBeat: clip.startBeat + note.startBeat,
    durationBeats: Math.min(note.durationBeats, end - clip.startBeat - note.startBeat),
  })))).filter((note) => note.startBeat < end && note.durationBeats > 0)
    .sort((a, b) => a.startBeat - b.startBeat);
}

// Absolute quarter-note beats; clips are played once, exactly where displayed.
export function projectEvents(project: Project): MidiNote[] {
  const gains = new Map(project.tracks.map((track) => [track.id, trackGain(track, project.tracks)]));
  return scheduleEvents(project).filter((note) => gains.get(note.trackId)! > 0)
    .map((note) => ({ ...note, velocity: note.velocity * gains.get(note.trackId)! }));
}
