import * as Tone from 'tone';

export type InstrumentRange = { lowestMidi: number; highestMidi: number };
type VelocityLayer = { name: string; velocityMin: number; velocityMax: number };
type SampleDescriptor = {
  file: string;
  root: string;
  rootMidi: number;
  layer?: string;
  velocityMin: number;
  velocityMax: number;
  loNote: number | null;
  hiNote: number | null;
  bytes?: number;
};
type InstrumentManifest = {
  schemaVersion: number;
  id: string;
  name: string;
  version: string;
  category: string;
  engine: string;
  description?: string;
  source: { attributionRequired: boolean; attribution?: string | null; license: string };
  audio: { format: string; sampleRate: number; channels: number };
  playback: { attack: number; release: number; gainDb: number; loop?: boolean };
  range: InstrumentRange & { lowest?: string; highest?: string };
  velocityLayers: VelocityLayer[];
  samples: SampleDescriptor[];
};
type Catalog = { schemaVersion: number; manifests: string[] };

export type InstrumentDefinition = {
  id: string;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  manifestPath: string;
  manifest: InstrumentManifest;
};

export type InstrumentVoice = {
  prepare(notes: Array<{ midi: number; velocity: number }>): Promise<void>;
  triggerAttackRelease(note: string, duration: any, time: any, velocity: number): void;
  releaseAll(): void;
  dispose(): void;
};

export type InstrumentLoadProgress = { instrumentId: string; instrumentName: string; loadedBytes: number; totalBytes: number; active: boolean; error?: boolean };
const progressListeners = new Set<(progress: InstrumentLoadProgress) => void>();
export function onInstrumentLoadProgress(listener: (progress: InstrumentLoadProgress) => void): () => void {
  progressListeners.add(listener);
  return () => progressListeners.delete(listener);
}

export const instruments: InstrumentDefinition[] = [];
const audioBufferCache = new Map<string, Promise<AudioBuffer>>();
let catalogPromise: Promise<void> | null = null;

export function initializeInstrumentCatalog(): Promise<void> {
  catalogPromise ??= fetch(assetUrl('instruments/catalog.json'))
    .then(requireJsonResponse)
    .then((value) => validateCatalog(value))
    .then(async (catalog) => {
      const loaded = await Promise.all(catalog.manifests.map(async (relativePath) => {
        const manifestPath = `instruments/${relativePath}`;
        const manifest = validateInstrumentManifest(await fetch(assetUrl(manifestPath)).then(requireJsonResponse), manifestPath);
        return definitionFromManifest(manifest, manifestPath);
      }));
      instruments.splice(0, instruments.length, ...loaded);
    });
  return catalogPromise;
}

export function resolveInstrument(id: string): InstrumentDefinition {
  const definition = instruments.find((item) => item.id === id);
  if (definition) return definition;
  if (!instruments[0]) throw new Error('The JV Instrument Library is not initialized.');
  return instruments[0];
}

export async function instrumentPlayableRange(id: string): Promise<InstrumentRange> {
  await initializeInstrumentCatalog();
  return resolveInstrument(id).manifest.range;
}

export function createInstrument(id: string, output: Tone.ToneAudioNode): InstrumentVoice {
  const definition = resolveInstrument(id);
  if (definition.manifest.engine !== 'sampler') throw new Error(`Unsupported instrument engine: ${definition.manifest.engine}`);
  return new LazySamplerVoice(output, definition.manifest, definition.manifestPath);
}

class LazySamplerVoice implements InstrumentVoice {
  private readonly samplers = new Map<string, Tone.Sampler>();
  private readonly loaded = new Set<string>();
  private readonly pending = new Map<string, Promise<void>>();
  private disposed = false;

  constructor(
    private readonly output: Tone.ToneAudioNode,
    private readonly manifest: InstrumentManifest,
    private readonly manifestPath: string,
  ) {}

  async prepare(notes: Array<{ midi: number; velocity: number }>): Promise<void> {
    await this.prepareWithProgress(notes);
  }

  triggerAttackRelease(note: string, duration: any, time: any, velocity: number): void {
    const midi = Math.round(Tone.Frequency(note).toMidi());
    void this.prepareWithProgress([{ midi, velocity }]).then(() => {
      const selected = selectSample(this.manifest, midi, velocity);
      if (!selected || this.disposed) return;
      this.samplers.get(selected.layer)?.triggerAttackRelease(note, duration, time, velocity);
    });
  }

  private async prepareWithProgress(notes: Array<{ midi: number; velocity: number }>): Promise<void> {
    const selected = notes.map((note) => selectSample(this.manifest, note.midi, note.velocity)).filter((item): item is NonNullable<typeof item> => item !== null);
    const unique = Array.from(new Map(selected.map((item) => [item.sample.file, item])).values())
      .filter((item) => !this.loaded.has(item.sample.file));
    if (!unique.length) return;
    const totalBytes = unique.reduce((sum, item) => sum + (item.sample.bytes ?? 1), 0);
    let loadedBytes = 0;
    this.emitProgress(loadedBytes, totalBytes, true);
    const results = await Promise.allSettled(unique.map(async (item) => {
      await this.ensureSelectedSample(item);
      loadedBytes += item.sample.bytes ?? 1;
      this.emitProgress(loadedBytes, totalBytes, true);
    }));
    const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    this.emitProgress(loadedBytes, totalBytes, false, Boolean(failure));
    if (failure) throw failure.reason;
  }

  private emitProgress(loadedBytes: number, totalBytes: number, active: boolean, error = false): void {
    const progress = { instrumentId: this.manifest.id, instrumentName: this.manifest.name, loadedBytes, totalBytes, active, error };
    for (const listener of progressListeners) listener(progress);
  }

  releaseAll(): void {
    for (const sampler of this.samplers.values()) sampler.releaseAll();
  }

  dispose(): void {
    this.disposed = true;
    for (const sampler of this.samplers.values()) sampler.dispose();
    this.samplers.clear();
  }

  private async ensureSelectedSample(selected: { sample: SampleDescriptor; layer: string }): Promise<void> {
    if (this.disposed) return;
    if (this.loaded.has(selected.sample.file)) return;
    const existing = this.pending.get(selected.sample.file);
    if (existing) { await existing; return; }
    const pending = loadSample(this.manifestPath, selected.sample, this.manifest.audio.channels).then((buffer) => {
      if (this.disposed) return;
      let sampler = this.samplers.get(selected.layer);
      if (!sampler) {
        sampler = new Tone.Sampler({
          attack: this.manifest.playback.attack,
          release: this.manifest.playback.release,
          volume: this.manifest.playback.gainDb,
          urls: {},
        }).connect(this.output);
        this.samplers.set(selected.layer, sampler);
      }
      sampler.add(selected.sample.rootMidi as never, buffer);
      this.loaded.add(selected.sample.file);
    }).finally(() => this.pending.delete(selected.sample.file));
    this.pending.set(selected.sample.file, pending);
    await pending;
  }
}

function selectSample(manifest: InstrumentManifest, midi: number, velocity: number): { sample: SampleDescriptor; layer: string } | null {
  if (midi < manifest.range.lowestMidi || midi > manifest.range.highestMidi) return null;
  const midiVelocity = Math.max(1, Math.min(127, Math.round(velocity * 127)));
  const velocityLayer = manifest.velocityLayers.find((layer) => midiVelocity >= layer.velocityMin && midiVelocity <= layer.velocityMax);
  if (!velocityLayer) return null;
  const sample = manifest.samples.find((item) => item.loNote !== null && item.hiNote !== null
    && midi >= item.loNote && midi <= item.hiNote
    && midiVelocity >= item.velocityMin && midiVelocity <= item.velocityMax);
  if (!sample) return null;
  return { sample, layer: sample.layer ?? velocityLayer.name };
}

function loadSample(manifestPath: string, sample: SampleDescriptor, expectedChannels: number): Promise<AudioBuffer> {
  const url = assetUrl(manifestPath.replace(/manifest\.json$/, '') + sample.file);
  const cached = audioBufferCache.get(url);
  if (cached) return cached;
  const promise = fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load instrument sample (${response.status}): ${sample.file}`);
      return response.arrayBuffer();
    })
    .then((encoded) => Tone.getContext().rawContext.decodeAudioData(encoded))
    .then((buffer) => {
      if (buffer.numberOfChannels !== expectedChannels) throw new Error(`Instrument sample channel mismatch: ${sample.file}`);
      return buffer;
    });
  audioBufferCache.set(url, promise);
  return promise;
}

function definitionFromManifest(manifest: InstrumentManifest, manifestPath: string): InstrumentDefinition {
  const credit = manifest.source.attributionRequired && manifest.source.attribution ? ` ${manifest.source.attribution}` : '';
  const description = `${manifest.description ?? manifest.name}.${credit}`.trim();
  return { id: manifest.id, nameEs: manifest.name, nameEn: manifest.name, descriptionEs: description, descriptionEn: description, manifestPath, manifest };
}

function validateCatalog(value: unknown): Catalog {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.manifests)
    || !value.manifests.every((item) => typeof item === 'string' && /^[a-z0-9-]+\/v1\/manifest\.json$/.test(item))) {
    throw new Error('Invalid JV Instrument Library catalog.');
  }
  return value as Catalog;
}

export function validateInstrumentManifest(value: unknown, path = 'manifest.json'): InstrumentManifest {
  if (!isRecord(value) || value.schemaVersion !== 1) throw new Error(`Unsupported instrument manifest schema: ${path}`);
  if (value.engine !== 'sampler') throw new Error(`Unsupported instrument engine: ${String(value.engine)}`);
  const manifest = value as unknown as InstrumentManifest;
  if (!manifest.id || !manifest.name || !manifest.source || !manifest.audio || !manifest.playback || !manifest.range
    || !Array.isArray(manifest.velocityLayers) || !Array.isArray(manifest.samples)
    || ![1, 2].includes(manifest.audio.channels)) throw new Error(`Invalid instrument manifest: ${path}`);
  if (manifest.source.attributionRequired && !manifest.source.attribution) throw new Error(`Missing required attribution: ${path}`);
  return manifest;
}

function requireJsonResponse(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error(`Could not load instrument data (${response.status}).`);
  return response.json() as Promise<unknown>;
}

function assetUrl(path: string): string { return `${import.meta.env.BASE_URL}${path}`; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null; }
