import { describe, expect, it } from 'vitest';
import { createClip, createNote, createProject, createTrack } from '../../project';
import { collectReferenceNotes } from './referenceNotes';

describe('Piano Roll reference notes', () => {
  it('aligns notes from other tracks to the active clip timeline', () => {
    const activeClip = createClip({ id: 'active-clip', startBeat: 8, lengthBeats: 4 });
    const project = createProject({
      tracks: [
        createTrack({ id: 'active', clips: [activeClip] }),
        createTrack({
          id: 'reference',
          name: 'Violin',
          color: '#ff8a3d',
          clips: [createClip({
            id: 'reference-clip',
            startBeat: 6,
            lengthBeats: 8,
            notes: [createNote({ id: 'reference-note', midi: 67, startBeat: 3, durationBeats: 1.5 })],
          })],
        }),
      ],
    });

    expect(collectReferenceNotes(project, 'active', activeClip)).toEqual([expect.objectContaining({
      trackId: 'reference',
      trackName: 'Violin',
      midi: 67,
      startBeat: 1,
      durationBeats: 1.5,
    })]);
  });

  it('clips sustained reference notes to the visible clip window', () => {
    const activeClip = createClip({ id: 'active-clip', startBeat: 8, lengthBeats: 4 });
    const project = createProject({
      tracks: [
        createTrack({ id: 'active', clips: [activeClip] }),
        createTrack({
          id: 'reference',
          clips: [createClip({
            id: 'reference-clip',
            startBeat: 4,
            lengthBeats: 12,
            notes: [
              createNote({ id: 'crosses-start', midi: 60, startBeat: 3, durationBeats: 2 }),
              createNote({ id: 'crosses-end', midi: 64, startBeat: 7, durationBeats: 2 }),
              createNote({ id: 'outside', midi: 72, startBeat: 10, durationBeats: 1 }),
            ],
          })],
        }),
      ],
    });

    expect(collectReferenceNotes(project, 'active', activeClip).map(({ midi, startBeat, durationBeats }) => ({ midi, startBeat, durationBeats }))).toEqual([
      { midi: 60, startBeat: 0, durationBeats: 1 },
      { midi: 64, startBeat: 3, durationBeats: 1 },
    ]);
  });

  it('never includes notes from the active track', () => {
    const activeClip = createClip({ id: 'active-clip', startBeat: 0, notes: [createNote({ id: 'active-note' })] });
    const project = createProject({ tracks: [createTrack({ id: 'active', clips: [activeClip] })] });

    expect(collectReferenceNotes(project, 'active', activeClip)).toEqual([]);
  });
});
