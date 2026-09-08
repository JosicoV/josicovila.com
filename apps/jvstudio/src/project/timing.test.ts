import { describe, expect, it } from 'vitest';

import { beatToMusicalPosition, beatsPerBar, beatsToSeconds, normalizeBpm, quantizeBeat, secondsToBeats } from './timing';

describe('timing conversions', () => {
  it('supports signatures other than 4/4', () => {
    expect(beatsPerBar([4, 4])).toBe(4);
    expect(beatsPerBar([6, 8])).toBe(3);
    expect(beatToMusicalPosition(3.5, [6, 8])).toEqual({ bar: 2, beat: 1, beatOffset: 0.5 });
  });

  it('converts beats and seconds symmetrically', () => {
    expect(beatsToSeconds(8, 120)).toBe(4);
    expect(secondsToBeats(4, 120)).toBe(8);
  });

  it('quantizes without floating-point drift', () => {
    expect(quantizeBeat(1.13, '1/16', [4, 4])).toBe(1.25);
    expect(quantizeBeat(6.1, 'bar', [6, 8])).toBe(6);
  });

  it('normalizes tempo to the supported range', () => {
    expect(normalizeBpm(119.6)).toBe(120);
    expect(normalizeBpm(10)).toBe(40);
    expect(normalizeBpm(400)).toBe(240);
    expect(normalizeBpm(Number.NaN)).toBe(120);
  });
});
