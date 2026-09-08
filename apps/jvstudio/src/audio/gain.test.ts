import { describe, expect, it } from 'vitest';

import { faderDbToGain, formatDecibels, gainToFaderDb, SILENCE_DB } from './gain';

describe('mixer fader mapping', () => {
  it('maps unity gain to zero dB and +6 dB to almost double gain', () => {
    expect(gainToFaderDb(1)).toBe(0);
    expect(faderDbToGain(0)).toBe(1);
    expect(faderDbToGain(6)).toBeCloseTo(1.995, 3);
  });

  it('keeps a dedicated silent position below -48 dB', () => {
    expect(gainToFaderDb(0)).toBe(SILENCE_DB);
    expect(faderDbToGain(SILENCE_DB)).toBe(0);
    expect(formatDecibels(SILENCE_DB)).toBe('-∞ dB');
  });
});
