import { describe, expect, it } from 'vitest';

import { createClip, createProject, createTrack } from './factories';
import { autoGrowProjectLength, minimumProjectLengthBars, projectContentEndBeat } from './duration';

describe('project duration', () => {
  it('measures content and never suggests shrinking the project', () => {
    const project = createProject({
      lengthBars: 16,
      tracks: [createTrack({ clips: [createClip({ startBeat: 40, lengthBeats: 8 })] })],
    });
    expect(projectContentEndBeat(project)).toBe(48);
    expect(minimumProjectLengthBars(project)).toBe(12);
    expect(autoGrowProjectLength(project)).toBe(16);
  });

  it('grows in four-bar blocks when content reaches the current end', () => {
    const project = createProject({
      lengthBars: 16,
      tracks: [createTrack({ clips: [createClip({ startBeat: 60, lengthBeats: 4 })] })],
    });
    expect(autoGrowProjectLength(project)).toBe(20);
    expect(autoGrowProjectLength(project, 81)).toBe(24);
  });

  it('adds four bars relative to a manually chosen non-block length', () => {
    const project = createProject({ lengthBars: 2 });
    expect(autoGrowProjectLength(project, 8)).toBe(6);
  });
});
