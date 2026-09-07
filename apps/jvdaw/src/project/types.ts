export const PROJECT_VERSION = 1 as const;

export type ProjectVersion = typeof PROJECT_VERSION;
export type TimeSignature = [number, number];

export interface MidiNote {
  id: string;
  midi: number;
  startBeat: number;
  durationBeats: number;
  velocity: number;
}

export interface MidiClip {
  id: string;
  name: string;
  startBeat: number;
  lengthBeats: number;
  notes: MidiNote[];
}

export interface InstrumentTrack {
  id: string;
  name: string;
  type: 'instrument';
  instrumentId: string;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  color: string;
  clips: MidiClip[];
}

export interface Project {
  version: ProjectVersion;
  id: string;
  name: string;
  bpm: number;
  timeSignature: TimeSignature;
  lengthBars: number;
  tracks: InstrumentTrack[];
}
