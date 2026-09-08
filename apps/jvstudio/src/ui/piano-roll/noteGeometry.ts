import type { MidiNote } from '../../project';

export const ROW_HEIGHT = 20;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const snapBeat = (beat: number, snap: number) => Math.round(beat / snap) * snap;
export const pitchAt = (y: number) => clamp(127 - Math.floor(y / ROW_HEIGHT), 0, 127);

export function drawNote(x: number, y: number, pixelsPerBeat: number, snap: number, length: number) {
  const startBeat = clamp(Math.floor(x / pixelsPerBeat / snap) * snap, 0, Math.max(0, length - snap));
  return { midi: pitchAt(y), startBeat, durationBeats: Math.min(snap, length - startBeat), velocity: 0.8 };
}

export function dragNote(note: MidiNote, dx: number, dy: number, pixelsPerBeat: number,
  snap: number, length: number, resize: boolean): Pick<MidiNote, 'midi' | 'startBeat' | 'durationBeats'> {
  if (resize) return {
    midi: note.midi, startBeat: note.startBeat,
    durationBeats: clamp(snapBeat(note.durationBeats + dx / pixelsPerBeat, snap), Math.min(snap, length - note.startBeat), length - note.startBeat),
  };
  return {
    midi: clamp(note.midi - Math.round(dy / ROW_HEIGHT), 0, 127),
    startBeat: clamp(snapBeat(note.startBeat + dx / pixelsPerBeat, snap), 0, length - note.durationBeats),
    durationBeats: note.durationBeats,
  };
}
