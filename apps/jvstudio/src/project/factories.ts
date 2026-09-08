import { PROJECT_VERSION, type InstrumentTrack, type MasterMix, type MidiClip, type MidiNote, type Project } from './types';

export type EntityKind = 'project' | 'track' | 'clip' | 'note';
export type IdFactory = (kind: EntityKind) => string;

export const defaultIdFactory: IdFactory = (kind) => {
  const uuid = globalThis.crypto?.randomUUID?.();
  const fallback = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${kind}-${uuid ?? fallback}`;
};

export function createProject(
  values: Partial<Omit<Project, 'version' | 'tracks' | 'master'>> & { tracks?: InstrumentTrack[]; master?: Partial<MasterMix> } = {},
  createId: IdFactory = defaultIdFactory,
): Project {
  return {
    version: PROJECT_VERSION,
    id: values.id ?? createId('project'),
    name: values.name ?? 'Untitled Project',
    bpm: values.bpm ?? 120,
    timeSignature: values.timeSignature ?? [4, 4],
    lengthBars: values.lengthBars ?? 16,
    tracks: values.tracks ?? [],
    master: {
      volume: values.master?.volume ?? 0.9,
    },
  };
}

export function createTrack(
  values: Partial<Omit<InstrumentTrack, 'type' | 'clips'>> & { clips?: MidiClip[] } = {},
  createId: IdFactory = defaultIdFactory,
): InstrumentTrack {
  return {
    id: values.id ?? createId('track'),
    name: values.name ?? 'New Track',
    type: 'instrument',
    instrumentId: values.instrumentId ?? 'jv-grand-piano',
    volume: values.volume ?? 0.8,
    pan: values.pan ?? 0,
    muted: values.muted ?? false,
    solo: values.solo ?? false,
    color: values.color ?? '#06b6d4',
    clips: values.clips ?? [],
  };
}

export function createClip(
  values: Partial<Omit<MidiClip, 'notes'>> & { notes?: MidiNote[] } = {},
  createId: IdFactory = defaultIdFactory,
): MidiClip {
  return {
    id: values.id ?? createId('clip'),
    name: values.name ?? 'New Clip',
    startBeat: values.startBeat ?? 0,
    lengthBeats: values.lengthBeats ?? 4,
    notes: values.notes ?? [],
  };
}

export function createNote(
  values: Partial<MidiNote> = {},
  createId: IdFactory = defaultIdFactory,
): MidiNote {
  return {
    id: values.id ?? createId('note'),
    midi: values.midi ?? 60,
    startBeat: values.startBeat ?? 0,
    durationBeats: values.durationBeats ?? 1,
    velocity: values.velocity ?? 0.8,
  };
}
