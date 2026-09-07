import { describe, expect, it } from 'vitest';
import { ProjectStore } from '../project';
import { demoProject } from '../project/demoProject';
import { projectEvents } from './projectEvents';

describe('arranger playback follows edits', () => {
  it('moves, duplicates and deletes the audible notes at clip positions', () => {
    const store = new ProjectStore(demoProject);
    const track = demoProject.tracks[0];
    const clip = track.clips[0];
    store.moveClip(track.id, clip.id, 4);
    expect(projectEvents(store.getSnapshot())[0].startBeat).toBe(4);
    const copy = store.duplicateClip(track.id, clip.id, 8);
    const notes = projectEvents(store.getSnapshot());
    expect(notes).toHaveLength(32);
    expect(notes[8].startBeat).toBe(8);
    expect(new Set(notes.map((note) => note.id)).size).toBe(32);
    store.removeClip(track.id, clip.id);
    expect(projectEvents(store.getSnapshot())[0].startBeat).toBe(8);
    store.removeClip(track.id, copy.id);
    expect(projectEvents(store.getSnapshot())).toEqual([]);
  });
  it('plays a two-bar starter clip only once within the four-bar project', () => {
    const notes = projectEvents(demoProject);
    expect(notes).toHaveLength(16);
    expect(notes.every((note) => note.startBeat < 8)).toBe(true);
  });
});
