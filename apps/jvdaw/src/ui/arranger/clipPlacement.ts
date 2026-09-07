import type { InstrumentTrack } from '../../project';

export function rangesOverlap(startA: number, lengthA: number, startB: number, lengthB: number): boolean {
  return startA < startB + lengthB && startB < startA + lengthA;
}

export function isClipRangeAvailable(
  track: InstrumentTrack,
  startBeat: number,
  lengthBeats: number,
  projectLengthBeats: number,
  ignoreClipId?: string,
): boolean {
  if (startBeat < 0 || lengthBeats <= 0 || startBeat + lengthBeats > projectLengthBeats) return false;
  return track.clips.every((clip) => clip.id === ignoreClipId || !rangesOverlap(startBeat, lengthBeats, clip.startBeat, clip.lengthBeats));
}

export function findFirstAvailableClipStart(
  track: InstrumentTrack,
  lengthBeats: number,
  projectLengthBeats: number,
  snapBeats: number,
): number | null {
  for (let startBeat = 0; startBeat + lengthBeats <= projectLengthBeats; startBeat += snapBeats) {
    if (isClipRangeAvailable(track, startBeat, lengthBeats, projectLengthBeats)) return startBeat;
  }
  return null;
}

export function clipStartFromPointer(
  pointerOffset: number,
  laneWidth: number,
  clipLengthBeats: number,
  projectLengthBeats: number,
  snapBeats: number,
): number {
  const ratio = laneWidth > 0 ? Math.min(1, Math.max(0, pointerOffset / laneWidth)) : 0;
  const rawBeat = ratio * projectLengthBeats;
  const snappedBeat = Math.round(rawBeat / snapBeats) * snapBeats;
  return Math.min(projectLengthBeats - clipLengthBeats, Math.max(0, snappedBeat));
}
