import { describe, expect, it } from 'vitest';
import { createNote, ProjectStore } from '../../project';
import { demoProject } from '../../project/demoProject';
import { projectEvents } from '../../audio/projectEvents';
import { drawNote, dragNote, pitchAt } from './noteGeometry';

describe('piano roll geometry', () => {
  const note = createNote({ midi: 60, startBeat: 1, durationBeats: .5 });
  it('draws snapped notes including the right edge and full MIDI range', () => {
    expect(drawNote(639, 1340, 160, .25, 4)).toEqual({ midi: 60, startBeat: 3.75, durationBeats: .25, velocity: .8 });
    expect(pitchAt(-10)).toBe(127);
    expect(pitchAt(3000)).toBe(0);
  });
  it('moves without allowing notes outside the clip', () => {
    expect(dragNote(note, -1000, 0, 160, .25, 4, false).startBeat).toBe(0);
    expect(dragNote(note, 1000, 0, 160, .25, 4, false).startBeat).toBe(3.5);
    expect(dragNote(note, 40, -20, 160, .25, 4, false)).toEqual({ midi: 61, startBeat: 1.25, durationBeats: .5 });
  });
  it('resizes to a positive snap and clips to the right edge', () => {
    expect(dragNote(note, -1000, 0, 160, .125, 4, true).durationBeats).toBe(.125);
    expect(dragNote(note, 1000, 0, 160, .25, 4, true).durationBeats).toBe(3);
  });
  it('keeps geometry valid for a clip shorter than snap', () => {
    expect(drawNote(30, 1340, 160, 1, .5).durationBeats).toBe(.5);
  });
});

it('routes drawn and edited notes through the store into audible project events', () => {
  const store = new ProjectStore(demoProject);
  const track = demoProject.tracks[0];
  const clip = store.addClip(track.id, { startBeat: 8, lengthBeats: 4 });
  const note = store.addNote(track.id, clip.id, drawNote(160, 1340, 160, .25, 4));
  store.updateNote(track.id, clip.id, note.id, { ...dragNote(note, 80, -40, 160, .25, 4, false), velocity: .4 });
  expect(projectEvents(store.getSnapshot()).find((event) => event.id === note.id))
    .toMatchObject({ midi: 62, startBeat: 9.5, durationBeats: .25, velocity: .4 * track.volume });
  const before = store.getSnapshot();
  expect(() => store.updateNote(track.id, clip.id, note.id, { durationBeats: 10 })).toThrow();
  expect(store.getSnapshot()).toEqual(before);
  store.removeNote(track.id, clip.id, note.id);
  expect(projectEvents(store.getSnapshot()).some((event) => event.id === note.id)).toBe(false);
});
