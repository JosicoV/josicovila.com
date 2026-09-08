import { describe, expect, it } from 'vitest';

import { createClip, createTrack } from '../../project';
import { clipLengthFromPointer, clipStartFromPointer, findFirstAvailableClipStart, isClipRangeAvailable, rangesOverlap } from './clipPlacement';

describe('arranger clip placement', () => {
  const track = createTrack({
    id: 'track-placement',
    clips: [
      createClip({ id: 'clip-a', startBeat: 0, lengthBeats: 4 }),
      createClip({ id: 'clip-b', startBeat: 8, lengthBeats: 4 }),
    ],
  });

  it('treats touching clip edges as non-overlapping', () => {
    expect(rangesOverlap(0, 4, 4, 4)).toBe(false);
    expect(rangesOverlap(0, 4, 3.99, 4)).toBe(true);
  });

  it('finds the first free snapped range', () => {
    expect(findFirstAvailableClipStart(track, 4, 16, 4)).toBe(4);
    expect(isClipRangeAvailable(track, 8, 4, 16)).toBe(false);
  });

  it('maps a pointer position to a clamped snapped start', () => {
    expect(clipStartFromPointer(260, 1_000, 4, 16, 4)).toBe(4);
    expect(clipStartFromPointer(999, 1_000, 4, 16, 4)).toBe(12);
  });

  it('resizes in half-bar steps without crossing the project edges', () => {
    expect(clipLengthFromPointer(300, 400, 4, 16, 2)).toBe(8);
    expect(clipLengthFromPointer(20, 400, 4, 16, 2)).toBe(2);
    expect(clipLengthFromPointer(600, 400, 4, 16, 2)).toBe(12);
  });
});
