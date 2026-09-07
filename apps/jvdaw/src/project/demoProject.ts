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
];

const demoClip = createClip({
  id: 'clip-demo-pattern',
  name: 'First Pattern',
  startBeat: 0,
  lengthBeats: 4,
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
  lengthBars: 4,
  tracks: [demoTrack],
});
