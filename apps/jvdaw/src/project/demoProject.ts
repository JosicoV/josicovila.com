import { createClip, createNote, createProject, createTrack } from './factories';

const demoNotes = [
  createNote({ id: 'note-demo-01', midi: 60, startBeat: 0, durationBeats: 0.5, velocity: 0.72 }),
  createNote({ id: 'note-demo-02', midi: 64, startBeat: 0.5, durationBeats: 0.5, velocity: 0.72 }),
  createNote({ id: 'note-demo-03', midi: 67, startBeat: 1, durationBeats: 0.5, velocity: 0.72 }),
  createNote({ id: 'note-demo-04', midi: 71, startBeat: 1.5, durationBeats: 0.5, velocity: 0.72 }),
  createNote({ id: 'note-demo-05', midi: 67, startBeat: 2, durationBeats: 0.5, velocity: 0.72 }),
  createNote({ id: 'note-demo-06', midi: 64, startBeat: 2.5, durationBeats: 0.5, velocity: 0.72 }),
  createNote({ id: 'note-demo-07', midi: 62, startBeat: 3, durationBeats: 0.5, velocity: 0.72 }),
  createNote({ id: 'note-demo-08', midi: 67, startBeat: 3.5, durationBeats: 0.5, velocity: 0.72 }),
  createNote({ id: 'note-demo-09', midi: 60, startBeat: 4, durationBeats: 0.5, velocity: 0.72 }),
  createNote({ id: 'note-demo-10', midi: 64, startBeat: 4.5, durationBeats: 0.5, velocity: 0.72 }),
  createNote({ id: 'note-demo-11', midi: 67, startBeat: 5, durationBeats: 0.5, velocity: 0.72 }),
  createNote({ id: 'note-demo-12', midi: 72, startBeat: 5.5, durationBeats: 0.5, velocity: 0.78 }),
  createNote({ id: 'note-demo-13', midi: 71, startBeat: 6, durationBeats: 0.5, velocity: 0.72 }),
  createNote({ id: 'note-demo-14', midi: 67, startBeat: 6.5, durationBeats: 0.5, velocity: 0.72 }),
  createNote({ id: 'note-demo-15', midi: 64, startBeat: 7, durationBeats: 0.5, velocity: 0.72 }),
  createNote({ id: 'note-demo-16', midi: 60, startBeat: 7.5, durationBeats: 0.5, velocity: 0.76 }),
];

const demoClip = createClip({
  id: 'clip-demo-pattern',
  name: 'First Pattern',
  startBeat: 0,
  lengthBeats: 8,
  notes: demoNotes,
});

const demoTrack = createTrack({
  id: 'track-demo-synth',
  name: 'Pulse Synth',
  instrumentId: 'jv-poly-synth',
  color: '#11b9f2',
  clips: [demoClip],
});

export const demoProject = createProject({
  id: 'project-first-light',
  name: 'First Light',
  bpm: 120,
  timeSignature: [4, 4],
  lengthBars: 16,
  tracks: [demoTrack],
});
