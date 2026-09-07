import { expect, it } from 'vitest';
import { createTrack, createClip } from '../../project';
import { isClipRangeAvailable, clipStartFromPointer, findFirstAvailableClipStart } from './clipPlacement';

const track = createTrack({ clips: [
  createClip({ id: 'moving-clip', startBeat: 0, lengthBeats: 4 }),
  createClip({ id: 'obstacle-clip', startBeat: 8, lengthBeats: 4 }),
] });

it('ignores the moving clip but rejects collisions and project boundaries', () => {
  expect(isClipRangeAvailable(track, 0, 4, 16, 'moving-clip')).toBe(true);
  expect(isClipRangeAvailable(track, 4, 4, 16, 'moving-clip')).toBe(true);
  expect(isClipRangeAvailable(track, 8, 4, 16, 'moving-clip')).toBe(false);
  expect(isClipRangeAvailable(track, -4, 4, 16, 'moving-clip')).toBe(false);
  expect(isClipRangeAvailable(track, 16, 4, 16, 'moving-clip')).toBe(false);
});
it('clamps dragging at both ends and uses the original grab offset', () => {
  expect(clipStartFromPointer(-100, 400, 4, 16, 4)).toBe(0);
  expect(clipStartFromPointer(600, 400, 4, 16, 4)).toBe(12);
  expect(clipStartFromPointer(100 + 96, 400, 4, 16, 4)).toBe(8);
});
it('reports a full track without attempting an overlapping duplicate', () => {
  const full = createTrack({ clips: [createClip({ lengthBeats: 16 })] });
  expect(findFirstAvailableClipStart(full, 4, 16, 4)).toBeNull();
});
