export const PROJECT_VERSION = 3 as const;

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
  insertFx: EffectConfig[];
  sends: TrackSends;
  color: string;
  clips: MidiClip[];
}

export type EffectId = 'jv-eq' | 'jv-compressor' | 'jv-reverb' | 'jv-delay' | 'jv-limiter';

export interface EffectConfig {
  id: EffectId;
  enabled: boolean;
  parameters: Record<string, number>;
}

export interface TrackSends {
  reverb: number;
  delay: number;
}

export interface SendEffects {
  reverb: EffectConfig;
  delay: EffectConfig;
}

export interface MasterMix {
  volume: number;
  insertFx: EffectConfig[];
  limiterEnabled: boolean;
  limiterThreshold: number;
}

export interface Project {
  version: ProjectVersion;
  id: string;
  name: string;
  bpm: number;
  timeSignature: TimeSignature;
  lengthBars: number;
  tracks: InstrumentTrack[];
  sendFx: SendEffects;
  master: MasterMix;
}
