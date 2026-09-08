import { describe, expect, it } from 'vitest';

import { demoProject } from './demoProject';
import { deserializeProject, serializeProject } from './serializer';
import { ProjectValidationError } from './validation';

describe('project serialization', () => {
  it('round-trips a valid project without losing data', () => {
    expect(deserializeProject(serializeProject(demoProject))).toEqual(demoProject);
  });

  it('rejects malformed JSON', () => {
    expect(() => deserializeProject('{broken')).toThrow(ProjectValidationError);
    expect(() => deserializeProject('null')).toThrow(ProjectValidationError);
    expect(() => deserializeProject('{"version":1}')).toThrow(ProjectValidationError);
  });

  it('rejects unsupported versions and invalid MIDI notes', () => {
    const unsupported = structuredClone(demoProject) as unknown as { version: number };
    unsupported.version = 3;
    expect(() => deserializeProject(JSON.stringify(unsupported))).toThrow(/version/);

    const invalidMidi = structuredClone(demoProject);
    invalidMidi.tracks[0].clips[0].notes[0].midi = 128;
    expect(() => deserializeProject(JSON.stringify(invalidMidi))).toThrow(/midi/);
  });

  it('migrates v0.1 projects with a safe default master level', () => {
    const legacy = structuredClone(demoProject) as unknown as Record<string, unknown>;
    legacy.version = 1;
    delete legacy.master;
    const migrated = deserializeProject(JSON.stringify(legacy));
    expect(migrated.version).toBe(2);
    expect(migrated.master).toEqual({ volume: 0.9 });
  });

  it('rejects duplicate stable IDs', () => {
    const duplicateIds = structuredClone(demoProject);
    duplicateIds.tracks[0].clips[0].notes[1].id = duplicateIds.tracks[0].clips[0].notes[0].id;
    expect(() => deserializeProject(JSON.stringify(duplicateIds))).toThrow(/unique/);
  });
});
