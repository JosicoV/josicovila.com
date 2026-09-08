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
    unsupported.version = 4;
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
    expect(migrated.version).toBe(3);
    expect(migrated.master).toEqual({ volume: 0.9, insertFx: [], limiterEnabled: true });
    expect(migrated.tracks[0]).toMatchObject({ insertFx: [], sends: { reverb: 0, delay: 0 } });
  });

  it('migrates v0.2 mixer projects to the routing schema', () => {
    const previous = structuredClone(demoProject) as unknown as Record<string, unknown>;
    previous.version = 2;
    const tracks = previous.tracks as Array<Record<string, unknown>>;
    delete tracks[0].insertFx;
    delete tracks[0].sends;
    const master = previous.master as Record<string, unknown>;
    delete master.insertFx;
    delete master.limiterEnabled;
    const migrated = deserializeProject(JSON.stringify(previous));
    expect(migrated.version).toBe(3);
    expect(migrated.tracks[0].sends).toEqual({ reverb: 0, delay: 0 });
  });

  it('rejects duplicate stable IDs', () => {
    const duplicateIds = structuredClone(demoProject);
    duplicateIds.tracks[0].clips[0].notes[1].id = duplicateIds.tracks[0].clips[0].notes[0].id;
    expect(() => deserializeProject(JSON.stringify(duplicateIds))).toThrow(/unique/);
  });

  it('rejects unsupported effects and more than two inserts', () => {
    const unsupported = structuredClone(demoProject) as unknown as { tracks: Array<{ insertFx: unknown[] }> };
    unsupported.tracks[0].insertFx = [{ id: 'external-plugin', enabled: true, parameters: {} }];
    expect(() => deserializeProject(JSON.stringify(unsupported))).toThrow(/unsupported effect/);

    const tooMany = structuredClone(demoProject);
    tooMany.tracks[0].insertFx = Array.from({ length: 3 }, () => ({ id: 'jv-eq' as const, enabled: true, parameters: {} }));
    expect(() => deserializeProject(JSON.stringify(tooMany))).toThrow(/more than 2/);
  });
});
