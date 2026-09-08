import { describe, expect, it } from 'vitest';

import { createClip, createNote, createProject, createTrack } from '../project';
import { trackGain } from './mix';
import { projectEvents, scheduleEvents } from './projectEvents';

const note = createNote({ id: 'note-a', midi: 60, startBeat: 0, durationBeats: 1, velocity: .8 });
const first = createTrack({
  id: 'track-a', name: 'A', volume: .5,
  clips: [createClip({ id: 'clip-a', startBeat: 0, lengthBeats: 4, notes: [note] })],
});
const second = createTrack({
  id: 'track-b', name: 'B', volume: .75,
  clips: [createClip({ id: 'clip-b', startBeat: 4, lengthBeats: 4, notes: [{ ...note, id: 'note-b' }] })],
});

describe('track mixer', () => {
  it('applies volume unless mute or another track solo excludes it', () => {
    expect(trackGain(first, [first, second])).toBe(.5);
    expect(trackGain({ ...first, muted: true }, [{ ...first, muted: true }, second])).toBe(0);
    expect(trackGain(first, [first, { ...second, solo: true }])).toBe(0);
    expect(trackGain({ ...first, solo: true }, [{ ...first, solo: true }, { ...second, solo: true }])).toBe(.5);
  });

  it('keeps every track scheduled so live mute and solo changes need no rebuild', () => {
    const project = createProject({ lengthBars: 2, tracks: [{ ...first, muted: true }, { ...second, solo: true }] });
    const scheduled = scheduleEvents(project);
    expect(scheduled.map((event) => event.trackId)).toEqual(['track-a', 'track-b']);
    expect(scheduled.map((event) => event.velocity)).toEqual([.8, .8]);
    expect(projectEvents(project).map((event) => event.id)).toEqual(['note-b']);
    expect(projectEvents(project)[0].velocity).toBeCloseTo(.6);
  });
});
