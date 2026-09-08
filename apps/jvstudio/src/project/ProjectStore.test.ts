import { describe, expect, it } from 'vitest';

import { createProject } from './factories';
import { ProjectStore } from './ProjectStore';

function sequentialIds() {
  let next = 0;
  return (kind: 'project' | 'track' | 'clip' | 'note') => `${kind}-test-${++next}`;
}

describe('ProjectStore', () => {
  it('adds, updates, duplicates and removes entities while preserving source IDs', () => {
    const ids = sequentialIds();
    const store = new ProjectStore(createProject({ id: 'project-test-base' }), ids);
    const track = store.addTrack({ name: 'Piano' });
    const clip = store.addClip(track.id, { name: 'Intro', lengthBeats: 4 });
    const note = store.addNote(track.id, clip.id, { midi: 64, durationBeats: 0.5 });

    store.updateNote(track.id, clip.id, note.id, { startBeat: 1, velocity: 0.6 });
    store.updateTrack(track.id, { name: 'Grand Piano' });
    store.updateClip(track.id, clip.id, { name: 'Verse', lengthBeats: 6 });
    store.moveClip(track.id, clip.id, 4);
    const duplicate = store.duplicateClip(track.id, clip.id);

    const snapshot = store.getSnapshot();
    expect(snapshot.tracks[0].id).toBe(track.id);
    expect(snapshot.tracks[0]).toMatchObject({ id: track.id, name: 'Grand Piano' });
    expect(snapshot.tracks[0].clips[0]).toMatchObject({ id: clip.id, name: 'Verse', lengthBeats: 6 });
    expect(snapshot.tracks[0].clips[0].notes[0]).toMatchObject({ id: note.id, startBeat: 1, velocity: 0.6 });
    expect(duplicate.id).not.toBe(clip.id);
    expect(duplicate.notes[0].id).not.toBe(note.id);

    store.removeNote(track.id, duplicate.id, duplicate.notes[0].id);
    store.removeClip(track.id, duplicate.id);
    store.removeTrack(track.id);
    expect(store.getSnapshot().tracks).toEqual([]);
  });

  it('does not expose mutable internal state', () => {
    const store = new ProjectStore(createProject({ id: 'project-test-clone' }));
    const snapshot = store.getSnapshot();
    snapshot.name = 'Mutated outside';
    expect(store.getSnapshot().name).toBe('Untitled Project');
  });

  it('emits semantic changes that can back future undo history', () => {
    const store = new ProjectStore(createProject({ id: 'project-test-events' }), sequentialIds());
    const events: string[] = [];
    const unsubscribe = store.subscribe((change) => events.push(change.type));
    store.addTrack({ name: 'Strings' });
    store.updateProject({ bpm: 96 });
    unsubscribe();
    store.addTrack({ name: 'Bass' });
    expect(events).toEqual(['track:add', 'project:update']);
  });

  it('grows by four bars when a clip reaches the project end', () => {
    const store = new ProjectStore(createProject({ id: 'project-test-growth', lengthBars: 4 }), sequentialIds());
    const track = store.addTrack({ name: 'Piano' });
    store.addClip(track.id, { name: 'Last bar', startBeat: 12, lengthBeats: 4 });
    expect(store.getSnapshot().lengthBars).toBe(8);
  });

  it('rejects a manual shrink that would cut existing clips', () => {
    const store = new ProjectStore(createProject({ id: 'project-test-shrink', lengthBars: 8 }), sequentialIds());
    const track = store.addTrack({ name: 'Piano' });
    store.addClip(track.id, { name: 'Ending', startBeat: 20, lengthBeats: 4 });
    expect(() => store.updateProject({ lengthBars: 5 })).toThrow(/must end within the project/);
    expect(store.getSnapshot().lengthBars).toBe(8);
  });

  it('rejects clip shrinking across notes and growth across another clip', () => {
    const store = new ProjectStore(createProject({ id: 'project-test-resize', lengthBars: 8 }), sequentialIds());
    const track = store.addTrack({ name: 'Piano' });
    const clip = store.addClip(track.id, { name: 'Verse', lengthBeats: 4 });
    store.addNote(track.id, clip.id, { startBeat: 3, durationBeats: 1 });
    store.addClip(track.id, { name: 'Next', startBeat: 6, lengthBeats: 2 });
    expect(() => store.updateClip(track.id, clip.id, { lengthBeats: 3 })).toThrow(/must end within its clip/);
    expect(() => store.updateClip(track.id, clip.id, { lengthBeats: 7 })).toThrow(/cannot overlap/);
    expect(store.getSnapshot().tracks[0].clips[0].lengthBeats).toBe(4);
  });
});
