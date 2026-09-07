import { describe, expect, it } from 'vitest';

import { instruments, resolveInstrument } from './instruments';

describe('instrument presets', () => {
  it('has stable unique IDs and resolves every preset', () => {
    expect(new Set(instruments.map((preset) => preset.id)).size).toBe(instruments.length);
    expect(instruments.every((preset) => preset.nameEs && preset.nameEn)).toBe(true);
    for (const preset of instruments) expect(resolveInstrument(preset.id)).toBe(preset);
  });

  it('falls back safely when an imported project references an unknown preset', () => {
    expect(resolveInstrument('future-or-missing-instrument')).toBe(instruments[0]);
  });
});
