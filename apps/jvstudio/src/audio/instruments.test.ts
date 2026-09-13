import { beforeAll, describe, expect, it, vi } from 'vitest';

import { initializeInstrumentCatalog, instruments, resolveInstrument, selectSample, validateInstrumentManifest } from './instruments';

const manifest = {
  schemaVersion: 1,
  id: 'jv-test-instrument',
  name: 'JV Test Instrument',
  version: '1.0.0',
  category: 'other',
  engine: 'sampler',
  source: { name: 'Test', license: 'CC0-1.0', attributionRequired: false },
  audio: { format: 'ogg', codec: 'vorbis', sampleRate: 44100, channels: 1 },
  playback: { attack: 0.01, release: 0.4, gainDb: -6 },
  range: { lowestMidi: 60, highestMidi: 62 },
  velocityLayers: [{ name: 'mf', velocityMin: 1, velocityMax: 127 }],
  samples: [{ file: 'samples/C4.ogg', root: 'C4', rootMidi: 60, layer: 'mf', velocityMin: 1, velocityMax: 127, loNote: 60, hiNote: 62, sha256: '0'.repeat(64) }],
};

beforeAll(async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    ok: true,
    json: async () => url.endsWith('index.json')
      ? { schemaVersion: 1, instruments: [{ id: manifest.id, path: 'dist/jv-test-instrument/v1/' }] }
      : manifest,
  })));
  await initializeInstrumentCatalog();
});

describe('manifest instrument catalog', () => {
  it('loads names and stable IDs from manifests', () => {
    expect(instruments).toHaveLength(1);
    expect(resolveInstrument('jv-test-instrument').nameEn).toBe('JV Test Instrument');
  });

  it('rejects unknown engines cleanly', () => {
    expect(() => validateInstrumentManifest({ ...manifest, engine: 'drumkit' })).toThrow('Unsupported instrument engine: drumkit');
  });

  it('requires attribution text when the manifest says it is mandatory', () => {
    expect(() => validateInstrumentManifest({ ...manifest, source: { ...manifest.source, attributionRequired: true } })).toThrow('Missing required attribution');
  });
});

const delivered = import.meta.glob('../../public/instruments/delivery/dist/*/v*/manifest.json', { eager: true, import: 'default' });
describe('definitive delivery contract', () => {
  it('validates all 17 frozen manifests unchanged', () => {
    expect(Object.keys(delivered)).toHaveLength(17);
    for (const [path, value] of Object.entries(delivered)) expect(validateInstrumentManifest(value, path)).toBe(value);
  });
  it('obeys every sample mapping at both note and velocity boundaries', () => {
    for (const value of Object.values(delivered)) {
      const m = validateInstrumentManifest(value);
      for (const sample of m.samples) {
        for (const midi of [Math.max(m.range.lowestMidi, sample.loNote ?? sample.rootMidi), Math.min(m.range.highestMidi, sample.hiNote ?? sample.rootMidi)]) {
          for (const velocity of [sample.velocityMin, sample.velocityMax]) expect(selectSample(m, midi, velocity / 127)?.sample).toBe(sample);
        }
      }
      expect(selectSample(m, m.range.lowestMidi - 1, 1)).toBeNull();
      expect(selectSample(m, m.range.highestMidi + 1, 1)).toBeNull();
      expect(selectSample(m, m.range.lowestMidi, 0)).toBeNull();
    }
  });
  it('rejects bad gains, additional fields and ambiguous mappings', () => {
    expect(() => validateInstrumentManifest({ ...manifest, playback: { ...manifest.playback, gainDb: 99 } })).toThrow('Invalid instrument manifest');
    expect(() => validateInstrumentManifest({ ...manifest, unexpected: true })).toThrow('Invalid instrument manifest');
    expect(() => validateInstrumentManifest({ ...manifest, samples: [...manifest.samples, ...manifest.samples] })).toThrow('Invalid sample mapping');
    expect(() => validateInstrumentManifest({ ...manifest, schemaVersion: 2 })).toThrow('Unsupported instrument manifest schema');
  });
});
