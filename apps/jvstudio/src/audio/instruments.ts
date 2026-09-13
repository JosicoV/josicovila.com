import * as Tone from 'tone';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import schema from '../../public/instruments/delivery/schema/instrument-manifest-v1.schema.json';

const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
const validateSchema = ajv.compile(schema);
const LIBRARY_ROOT = 'instruments/delivery/';

export type InstrumentRange = { lowestMidi: number; highestMidi: number };
type VelocityLayer = { name: string; velocityMin: number; velocityMax: number };
type SampleDescriptor = {
  file: string;
  root: string;
  rootMidi: number;
  layer?: string;
  velocityMin: number;
  velocityMax: number;
  loNote?: number | null;
  hiNote?: number | null;
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
type Catalog = { schemaVersion: number; instruments: Array<{ id: string; path: string }> };

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
const audioBufferCache = new Map<string, AudioBuffer>();
const pendingBuffers = new Map<string, Promise<AudioBuffer>>();
const CACHE_LIMIT_BYTES = 128 * 1024 * 1024;
let cacheBytes = 0;
export function instrumentCacheStats() { return { buffers: audioBufferCache.size, bytes: cacheBytes, limitBytes: CACHE_LIMIT_BYTES, pending: pendingBuffers.size }; }
export function clearInstrumentCache(): void { audioBufferCache.clear(); cacheBytes = 0; }
let catalogPromise: Promise<void> | null = null;

export function initializeInstrumentCatalog(): Promise<void> {
  catalogPromise ??= fetch(assetUrl(`${LIBRARY_ROOT}index.json`))
    .then(requireJsonResponse)
    .then((value) => validateCatalog(value))
    .then(async (catalog) => {
      const loaded = await Promise.all(catalog.instruments.map(async (entry) => {
        const manifestPath = `${LIBRARY_ROOT}${entry.path}manifest.json`;
        const manifest = validateInstrumentManifest(await fetch(assetUrl(manifestPath)).then(requireJsonResponse), manifestPath);
        if (manifest.id !== entry.id) throw new Error(`Catalog/manifest ID mismatch: ${manifestPath}`);
        return definitionFromManifest(manifest, manifestPath);
      }));
      instruments.splice(0, instruments.length, ...loaded);
    }).catch((error) => { catalogPromise = null; throw error; });
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
  private readonly sources = new Set<Tone.ToneBufferSource>();
  private readonly loaded = new Map<string, AudioBuffer>();
  private generation = 0;
  private protectedFiles = new Set<string | undefined>();
  private readonly context: Tone.BaseContext;
  private readonly pending = new Map<string, Promise<void>>();
  private disposed = false;

  constructor(
    private readonly output: Tone.ToneAudioNode,
    private readonly manifest: InstrumentManifest,
    private readonly manifestPath: string,
  ) { this.context = output.context; }

  async prepare(notes: Array<{ midi: number; velocity: number }>): Promise<void> {
    const needed = new Set(notes.map(note => selectSample(this.manifest, note.midi, note.velocity)?.sample.file));
    this.protectedFiles = needed;
    for (const file of this.loaded.keys()) if (!needed.has(file)) this.loaded.delete(file);
    await this.prepareWithProgress(notes);
  }

  triggerAttackRelease(note: string, duration: any, time: any, velocity: number): void {
    const midi = Math.round(Tone.Frequency(note).toMidi());
    const selected = selectSample(this.manifest, midi, velocity);
    if (!selected || this.disposed) return;
    const generation = this.generation;
    const play = () => {
      if (this.disposed || generation !== this.generation) return;
      const buffer = this.loaded.get(selected.sample.file);
      if (!buffer) return;
      const source = new Tone.ToneBufferSource({
        context: this.context,
        url: buffer,
        playbackRate: 2 ** ((midi - selected.sample.rootMidi) / 12),
        fadeIn: this.manifest.playback.attack,
        fadeOut: this.manifest.playback.release,
        curve: 'linear',
        loop: this.manifest.playback.loop ?? false,
        onended: () => {
          // Tone advances offline timers before native rendering; keep nodes connected until it completes.
          if (!this.context.isOffline) { this.sources.delete(source); source.dispose(); }
        },
      }).connect(this.output);
      this.sources.add(source);
      const start = Math.max(Tone.Time(time).toSeconds(), this.context.currentTime);
      source.start(start, 0, Tone.Time(duration).toSeconds(), velocity * 10 ** (this.manifest.playback.gainDb / 20));
    };
    // Prepared transport/offline notes must be scheduled synchronously.
    if (this.loaded.has(selected.sample.file)) play();
    else void this.prepareWithProgress([{ midi, velocity }]).then(play).catch((error) => {
      console.error('JV instrument sample could not be played.', error);
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
    let cursor = 0;
    const results = await Promise.allSettled(Array.from({ length: Math.min(4, unique.length) }, async () => {
      while (cursor < unique.length && !this.disposed) {
        const item = unique[cursor++];
        await this.ensureSelectedSample(item);
        loadedBytes += item.sample.bytes ?? 1;
        this.emitProgress(loadedBytes, totalBytes, true);
      }
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
    this.generation++;
    for (const source of this.sources) source.stop(this.context.currentTime);
  }

  dispose(): void {
    this.disposed = true;
    this.generation++;
    for (const source of this.sources) source.dispose();
    this.sources.clear();
    this.loaded.clear();
    this.protectedFiles.clear();
    this.pending.clear();
  }

  private async ensureSelectedSample(selected: { sample: SampleDescriptor; layer: string }): Promise<void> {
    if (this.disposed) return;
    if (this.loaded.has(selected.sample.file)) return;
    const existing = this.pending.get(selected.sample.file);
    if (existing) { await existing; return; }
    const pending = loadSample(this.manifestPath, selected.sample, this.manifest.audio.channels, this.context).then((buffer) => {
      if (this.disposed) return;
      this.loaded.set(selected.sample.file, buffer);
      let bytes = Array.from(this.loaded.values()).reduce((sum, item) => sum + item.length * item.numberOfChannels * 4, 0);
      for (const [file, item] of this.loaded) {
        if (bytes <= 32 * 1024 * 1024) break;
        if (file !== selected.sample.file && !this.protectedFiles.has(file)) {
          bytes -= item.length * item.numberOfChannels * 4;
          this.loaded.delete(file);
        }
      }
    }).finally(() => this.pending.delete(selected.sample.file));
    this.pending.set(selected.sample.file, pending);
    await pending;
  }
}

export function selectSample(manifest: InstrumentManifest, midi: number, velocity: number): { sample: SampleDescriptor; layer: string } | null {
  if (!Number.isFinite(velocity) || velocity <= 0 || !Number.isInteger(midi)) return null;
  if (midi < manifest.range.lowestMidi || midi > manifest.range.highestMidi) return null;
  const midiVelocity = Math.max(1, Math.min(127, Math.round(velocity * 127)));
  const velocityLayer = manifest.velocityLayers.find((layer) => midiVelocity >= layer.velocityMin && midiVelocity <= layer.velocityMax);
  if (!velocityLayer) return null;
  const sample = manifest.samples.find((item) => midi >= (item.loNote ?? item.rootMidi) && midi <= (item.hiNote ?? item.rootMidi)
    && midiVelocity >= item.velocityMin && midiVelocity <= item.velocityMax);
  if (!sample) return null;
  return { sample, layer: sample.layer ?? velocityLayer.name };
}

function loadSample(manifestPath: string, sample: SampleDescriptor, expectedChannels: number, context: Tone.BaseContext): Promise<AudioBuffer> {
  const url = assetUrl(manifestPath.replace(/manifest\.json$/, '') + sample.file);
  const cached = audioBufferCache.get(url);
  if (cached) { audioBufferCache.delete(url); audioBufferCache.set(url, cached); return Promise.resolve(cached); }
  const pending = pendingBuffers.get(url);
  if (pending) return pending;
  const promise = fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load instrument sample (${response.status}): ${sample.file}`);
      return response.arrayBuffer();
    })
    .then((encoded) => context.rawContext.decodeAudioData(encoded))
    .then((buffer) => {
      if (buffer.numberOfChannels !== expectedChannels) throw new Error(`Instrument sample channel mismatch: ${sample.file}`);
      const bytes = buffer.length * buffer.numberOfChannels * 4;
      if (bytes <= CACHE_LIMIT_BYTES) {
        audioBufferCache.set(url, buffer);
        cacheBytes += bytes;
        while (cacheBytes > CACHE_LIMIT_BYTES) {
          const [key, oldest] = audioBufferCache.entries().next().value!;
          cacheBytes -= oldest.length * oldest.numberOfChannels * 4;
          audioBufferCache.delete(key);
        }
      }
      return buffer;
    }).finally(() => pendingBuffers.delete(url));
  pendingBuffers.set(url, promise);
  return promise;
}

function definitionFromManifest(manifest: InstrumentManifest, manifestPath: string): InstrumentDefinition {
  const credit = manifest.source.attributionRequired && manifest.source.attribution ? ` ${manifest.source.attribution}` : '';
  const description = `${manifest.description ?? manifest.name}${credit}`.trim();
  return { id: manifest.id, nameEs: manifest.name, nameEn: manifest.name, descriptionEs: description, descriptionEn: description, manifestPath, manifest };
}

function validateCatalog(value: unknown): Catalog {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.instruments)
    || !value.instruments.length || !value.instruments.every((item) => isRecord(item)
      && typeof item.id === 'string' && typeof item.path === 'string'
      && /^dist\/[a-z0-9-]+\/v[1-9][0-9]*\/$/.test(item.path))
    || new Set(value.instruments.map((item) => item.id)).size !== value.instruments.length) {
    throw new Error('Invalid JV Instrument Library catalog.');
  }
  return value as Catalog;
}

export function validateInstrumentManifest(value: unknown, path = 'manifest.json'): InstrumentManifest {
  if (!isRecord(value) || value.schemaVersion !== 1) throw new Error(`Unsupported instrument manifest schema: ${path}`);
  if (value.engine !== 'sampler') throw new Error(`Unsupported instrument engine: ${String(value.engine)}`);
  if (isRecord(value.source) && value.source.attributionRequired && !value.source.attribution) throw new Error(`Missing required attribution: ${path}`);
  if (!validateSchema(value)) throw new Error(`Invalid instrument manifest: ${path}: ${ajv.errorsText(validateSchema.errors)}`);
  const manifest = value as unknown as InstrumentManifest;
  if (manifest.range.lowestMidi > manifest.range.highestMidi) throw new Error(`Invalid instrument range: ${path}`);
  for (let velocity = 1; velocity <= 127; velocity++) {
    const layers = manifest.velocityLayers.filter((layer) => velocity >= layer.velocityMin && velocity <= layer.velocityMax);
    if (layers.length !== 1) throw new Error(`Invalid velocity coverage: ${path}`);
    for (let midi = manifest.range.lowestMidi; midi <= manifest.range.highestMidi; midi++) {
      const matches = manifest.samples.filter((sample) => velocity >= sample.velocityMin && velocity <= sample.velocityMax
        && midi >= (sample.loNote ?? sample.rootMidi) && midi <= (sample.hiNote ?? sample.rootMidi));
      if (matches.length !== 1) throw new Error(`Invalid sample mapping: ${path}`);
    }
  }
  for (const sample of manifest.samples) {
    if (sample.file.startsWith('/') || sample.file.split('/').some((part) => part === '..' || part === '.')) throw new Error(`Unsafe sample path: ${path}`);
    if (!manifest.velocityLayers.some((layer) => layer.velocityMin === sample.velocityMin && layer.velocityMax === sample.velocityMax
      && (sample.layer === undefined || sample.layer === layer.name))) throw new Error(`Invalid sample layer: ${path}`);
  }
  return manifest;
}

function requireJsonResponse(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error(`Could not load instrument data (${response.status}).`);
  return response.json() as Promise<unknown>;
}

function assetUrl(path: string): string { return `${import.meta.env.BASE_URL}${path}`; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null; }
