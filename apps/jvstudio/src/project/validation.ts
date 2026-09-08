import { PROJECT_VERSION, type Project, type TimeSignature } from './types';
import { barsToBeats } from './timing';

const MAX_NAME_LENGTH = 120;
const MAX_TRACKS = 64;
const MAX_CLIPS_PER_TRACK = 1_000;
const MAX_NOTES_PER_CLIP = 50_000;
const VALID_DENOMINATORS = new Set([1, 2, 4, 8, 16]);
const VALID_EFFECTS = new Set(['jv-eq', 'jv-compressor', 'jv-reverb', 'jv-delay', 'jv-limiter']);

type UnknownRecord = Record<string, unknown>;

export class ProjectValidationError extends Error {
  constructor(
    message: string,
    readonly path: string,
  ) {
    super(`${path}: ${message}`);
    this.name = 'ProjectValidationError';
  }
}

export function validateProject(value: unknown): asserts value is Project {
  assertRecord(value, 'project');
  const ids = new Set<string>();

  assertExactInteger(value.version, PROJECT_VERSION, 'version');
  assertId(value.id, 'id', ids);
  assertName(value.name, 'name');
  assertNumberInRange(value.bpm, 40, 240, 'bpm');
  assertTimeSignature(value.timeSignature, 'timeSignature');
  assertIntegerInRange(value.lengthBars, 1, 1_024, 'lengthBars');
  assertArrayLimit(value.tracks, MAX_TRACKS, 'tracks');
  validateMaster(value.master, 'master');
  const projectLengthBeats = barsToBeats(value.lengthBars, value.timeSignature);
  value.tracks.forEach((track, trackIndex) => validateTrack(track, `tracks[${trackIndex}]`, ids, projectLengthBeats));
}

function validateTrack(value: unknown, path: string, ids: Set<string>, projectLengthBeats: number): void {
  assertRecord(value, path);
  assertId(value.id, `${path}.id`, ids);
  assertName(value.name, `${path}.name`);
  if (value.type !== 'instrument') throw new ProjectValidationError('must be "instrument"', `${path}.type`);
  assertName(value.instrumentId, `${path}.instrumentId`);
  assertNumberInRange(value.volume, 0, 2, `${path}.volume`);
  assertNumberInRange(value.pan, -1, 1, `${path}.pan`);
  assertBoolean(value.muted, `${path}.muted`);
  assertBoolean(value.solo, `${path}.solo`);
  validateEffects(value.insertFx, `${path}.insertFx`);
  assertRecord(value.sends, `${path}.sends`);
  assertNumberInRange(value.sends.reverb, 0, 1, `${path}.sends.reverb`);
  assertNumberInRange(value.sends.delay, 0, 1, `${path}.sends.delay`);
  if (typeof value.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(value.color)) {
    throw new ProjectValidationError('must be a six-digit hex colour', `${path}.color`);
  }
  assertArrayLimit(value.clips, MAX_CLIPS_PER_TRACK, `${path}.clips`);
  value.clips.forEach((clip, clipIndex) => validateClip(clip, `${path}.clips[${clipIndex}]`, ids, projectLengthBeats));
  const orderedClips = value.clips
    .map((clip) => clip as { startBeat: number; lengthBeats: number })
    .sort((left, right) => left.startBeat - right.startBeat);
  for (let index = 1; index < orderedClips.length; index += 1) {
    const previous = orderedClips[index - 1];
    const current = orderedClips[index];
    if (current.startBeat < previous.startBeat + previous.lengthBeats) {
      throw new ProjectValidationError('clips cannot overlap', `${path}.clips`);
    }
  }
}

function validateMaster(value: unknown, path: string): void {
  assertRecord(value, path);
  assertNumberInRange(value.volume, 0, 2, `${path}.volume`);
  validateEffects(value.insertFx, `${path}.insertFx`);
  assertBoolean(value.limiterEnabled, `${path}.limiterEnabled`);
}

function validateEffects(value: unknown, path: string): void {
  assertArrayLimit(value, 2, path);
  value.forEach((effect, index) => {
    const effectPath = `${path}[${index}]`;
    assertRecord(effect, effectPath);
    if (typeof effect.id !== 'string' || !VALID_EFFECTS.has(effect.id)) {
      throw new ProjectValidationError('has an unsupported effect', `${effectPath}.id`);
    }
    assertBoolean(effect.enabled, `${effectPath}.enabled`);
    assertRecord(effect.parameters, `${effectPath}.parameters`);
    for (const [name, parameter] of Object.entries(effect.parameters)) {
      if (typeof parameter !== 'number' || !Number.isFinite(parameter)) {
        throw new ProjectValidationError('must be a finite number', `${effectPath}.parameters.${name}`);
      }
    }
  });
}

function validateClip(value: unknown, path: string, ids: Set<string>, projectLengthBeats: number): void {
  assertRecord(value, path);
  assertId(value.id, `${path}.id`, ids);
  assertName(value.name, `${path}.name`);
  assertNumberInRange(value.startBeat, 0, Number.MAX_SAFE_INTEGER, `${path}.startBeat`);
  assertNumberInRange(value.lengthBeats, Number.EPSILON, Number.MAX_SAFE_INTEGER, `${path}.lengthBeats`);
  const clipLength = value.lengthBeats;
  if (value.startBeat + clipLength > projectLengthBeats + Number.EPSILON) {
    throw new ProjectValidationError('must end within the project', path);
  }
  assertArrayLimit(value.notes, MAX_NOTES_PER_CLIP, `${path}.notes`);
  value.notes.forEach((note, noteIndex) => validateNote(note, clipLength, `${path}.notes[${noteIndex}]`, ids));
}

function validateNote(value: unknown, clipLength: number, path: string, ids: Set<string>): void {
  assertRecord(value, path);
  assertId(value.id, `${path}.id`, ids);
  assertIntegerInRange(value.midi, 0, 127, `${path}.midi`);
  assertNumberInRange(value.startBeat, 0, clipLength, `${path}.startBeat`);
  assertNumberInRange(value.durationBeats, Number.EPSILON, clipLength, `${path}.durationBeats`);
  if (value.startBeat + value.durationBeats > clipLength + Number.EPSILON) {
    throw new ProjectValidationError('must end within its clip', path);
  }
  assertNumberInRange(value.velocity, 0, 1, `${path}.velocity`);
}

function assertRecord(value: unknown, path: string): asserts value is UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ProjectValidationError('must be an object', path);
  }
}

function assertTimeSignature(value: unknown, path: string): asserts value is TimeSignature {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new ProjectValidationError('must contain numerator and denominator', path);
  }
  assertIntegerInRange(value[0], 1, 32, `${path}[0]`);
  assertIntegerInRange(value[1], 1, 16, `${path}[1]`);
  if (!VALID_DENOMINATORS.has(value[1])) {
    throw new ProjectValidationError('has an unsupported denominator', `${path}[1]`);
  }
}

function assertId(value: unknown, path: string, ids: Set<string>): asserts value is string {
  if (typeof value !== 'string' || value.length < 3 || value.length > 160) {
    throw new ProjectValidationError('must be a stable non-empty ID', path);
  }
  if (ids.has(value)) throw new ProjectValidationError('must be unique within the project', path);
  ids.add(value);
}

function assertName(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > MAX_NAME_LENGTH) {
    throw new ProjectValidationError(`must contain 1–${MAX_NAME_LENGTH} characters`, path);
  }
}

function assertBoolean(value: unknown, path: string): asserts value is boolean {
  if (typeof value !== 'boolean') throw new ProjectValidationError('must be a boolean', path);
}

function assertExactInteger(value: unknown, expected: number, path: string): asserts value is number {
  if (!Number.isInteger(value) || value !== expected) throw new ProjectValidationError(`must be ${expected}`, path);
}

function assertIntegerInRange(value: unknown, minimum: number, maximum: number, path: string): asserts value is number {
  if (!Number.isInteger(value)) throw new ProjectValidationError('must be an integer', path);
  assertNumberInRange(value, minimum, maximum, path);
}

function assertNumberInRange(value: unknown, minimum: number, maximum: number, path: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new ProjectValidationError(`must be between ${minimum} and ${maximum}`, path);
  }
}

function assertArrayLimit(value: unknown, maximum: number, path: string): asserts value is unknown[] {
  if (!Array.isArray(value)) throw new ProjectValidationError('must be an array', path);
  if (value.length > maximum) throw new ProjectValidationError(`cannot contain more than ${maximum} items`, path);
}
