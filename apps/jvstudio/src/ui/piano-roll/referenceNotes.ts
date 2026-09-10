import type { MidiClip, Project } from '../../project';

export interface PianoReferenceNote {
  color: string;
  durationBeats: number;
  id: string;
  midi: number;
  startBeat: number;
  trackId: string;
  trackName: string;
}

export function collectReferenceNotes(
  project: Project,
  activeTrackId: string,
  activeClip: MidiClip,
): PianoReferenceNote[] {
  const windowStart = activeClip.startBeat;
  const windowEnd = windowStart + activeClip.lengthBeats;
  const notes: PianoReferenceNote[] = [];

  for (const track of project.tracks) {
    if (track.id === activeTrackId) continue;
    for (const clip of track.clips) {
      for (const note of clip.notes) {
        const noteStart = clip.startBeat + note.startBeat;
        const noteEnd = noteStart + note.durationBeats;
        const overlapStart = Math.max(windowStart, noteStart);
        const overlapEnd = Math.min(windowEnd, noteEnd);
        if (overlapEnd <= overlapStart) continue;
        notes.push({
          color: track.color,
          durationBeats: overlapEnd - overlapStart,
          id: `${track.id}:${clip.id}:${note.id}`,
          midi: note.midi,
          startBeat: overlapStart - windowStart,
          trackId: track.id,
          trackName: track.name,
        });
      }
    }
  }

  return notes;
}
