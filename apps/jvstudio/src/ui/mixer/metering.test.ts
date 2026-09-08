import { describe, expect, it } from 'vitest';

import { initialMeterBallistics, meterPercent, updateMeterBallistics } from './metering';

describe('mixer meter ballistics', () => {
  it('maps the visible dB range to meter height', () => {
    expect(meterPercent(-60)).toBe(0);
    expect(meterPercent(6)).toBe(100);
    expect(meterPercent(-27)).toBe(50);
  });

  it('holds peaks briefly, then lets them fall', () => {
    const peak = updateMeterBallistics(initialMeterBallistics(), -3, 100);
    expect(peak.peakDb).toBe(-3);
    expect(updateMeterBallistics(peak, -30, 500).peakDb).toBe(-3);
    expect(updateMeterBallistics(peak, -30, 1_100).peakDb).toBeLessThan(-3);
  });

  it('holds the clip warning after a zero dB crossing', () => {
    const clipped = updateMeterBallistics(initialMeterBallistics(), 0.5, 200);
    expect(clipped.clipUntil).toBe(1_700);
    expect(clipped.clipUntil).toBeGreaterThan(1_000);
  });
});
