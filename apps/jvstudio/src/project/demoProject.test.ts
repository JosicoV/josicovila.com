import { describe, expect, it } from 'vitest';

import { demoProject } from './demoProject';
import { validateProject } from './validation';

describe('demoProject', () => {
  it('starts new visitors with an editable two-bar musical idea', () => {
    expect(() => validateProject(demoProject)).not.toThrow();

    const track = demoProject.tracks[0];
    const clip = track.clips[0];
    expect(track.instrumentId).toBeTruthy();
    expect(clip.lengthBeats).toBe(8);
    expect(clip.notes).toHaveLength(16);
    expect(clip.notes.some((note) => note.startBeat >= 4)).toBe(true);
  });
});
