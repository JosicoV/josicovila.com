import { beforeAll, describe, expect, it, vi } from 'vitest';

import { initializeInstrumentCatalog, instruments, resolveInstrument, validateInstrumentManifest } from './instruments';

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
    json: async () => url.endsWith('catalog.json')
      ? { schemaVersion: 1, manifests: ['jv-test-instrument/v1/manifest.json'] }
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
