import * as Tone from 'tone';

type SampleDescriptor = { file: string; rootMidi: number; layer: string; velocityMin: number; velocityMax: number; loNote: number; hiNote: number };
type SampleManifest = { schemaVersion: number; id: string; name: string; engine: 'sampler'; range: { lowestMidi: number; highestMidi: number }; velocityLayers: Array<{ name: string; velocityMin: number; velocityMax: number }>; samples: SampleDescriptor[] };

export type InstrumentVoice = {
  prepare(notes: Array<{ midi: number; velocity: number }>): Promise<void>;
  triggerAttackRelease(note: string, duration: any, time: any, velocity: number): void;
  releaseAll(): void;
  dispose(): void;
};

export const instruments = [
  { id: 'jv-poly-synth', nameEs: 'Sintetizador polifónico JV', nameEn: 'JV Poly Synth', descriptionEs: 'El sonido original de First Light.', descriptionEn: 'The original sound of First Light.', wave: 'triangle8', attack: .015, decay: .16, sustain: .34, release: .8, level: -10 },
  { id: 'basic-piano', nameEs: 'Piano básico', nameEn: 'Basic Piano', descriptionEs: 'Teclado sintetizado brillante, con caída percutiva.', descriptionEn: 'Bright synthesized keyboard with a percussive decay.', wave: 'triangle', attack: .003, decay: 1.1, sustain: .06, release: .35, level: -9 },
  { id: 'soft-piano', nameEs: 'Piano suave', nameEn: 'Soft Piano', descriptionEs: 'Teclado suave de onda senoidal; no sampleado.', descriptionEn: 'Soft sine-wave keyboard; no samples.', wave: 'sine', attack: .008, decay: 1.6, sustain: .03, release: .6, level: -8 },
  { id: 'strings', nameEs: 'Cuerdas', nameEn: 'Strings', descriptionEs: 'Cuerdas sintéticas con entrada y salida suaves.', descriptionEn: 'Synthetic strings with a gentle attack and release.', wave: 'sawtooth', attack: .24, decay: .4, sustain: .6, release: .9, level: -17 },
  { id: 'bass', nameEs: 'Bajo', nameEn: 'Bass', descriptionEs: 'Bajo redondo, con ataque rápido.', descriptionEn: 'Rounded bass with a fast attack.', wave: 'triangle', attack: .005, decay: .18, sustain: .55, release: .12, level: -10 },
  { id: 'synth-pad', nameEs: 'Pad de sintetizador', nameEn: 'Synth Pad', descriptionEs: 'Capa sostenida de ataque lento para acordes.', descriptionEn: 'Slow-attack sustained layer for chords.', wave: 'triangle8', attack: .65, decay: .6, sustain: .75, release: 1.2, level: -14 },
  { id: 'lead-synth', nameEs: 'Sintetizador solista', nameEn: 'Lead Synth', descriptionEs: 'Onda cuadrada para melodías destacadas.', descriptionEn: 'Square-wave lead for prominent melodies.', wave: 'square8', attack: .012, decay: .12, sustain: .5, release: .18, level: -18 },
  { id: 'choir-pad', nameEs: 'Pad coral', nameEn: 'Choir Pad', descriptionEs: 'Pad armónico suave inspirado en coros, sin voces grabadas.', descriptionEn: 'Gentle choir-inspired harmonic pad with no recorded voices.', wave: 'sine8', attack: .35, decay: .5, sustain: .65, release: 1, level: -12 },
  { id: 'drum-kit', nameEs: 'Sintetizador de percusión', nameEn: 'Drum Synth', descriptionEs: 'Percusión tonal sintetizada de envolvente muy corta.', descriptionEn: 'Synthesized tonal percussion with a very short envelope.', wave: 'sine', attack: .001, decay: .09, sustain: .01, release: .05, level: -5 },
  { id: 'jv-grand-piano-light', nameEs: 'JV Grand Piano', nameEn: 'JV Grand Piano', descriptionEs: 'Piano de cola muestreado · variante Light.', descriptionEn: 'Sampled grand piano · Light variant.', sampleManifest: 'instruments/jv-grand-piano-light/v1/manifest.json', level: -4 },
] as const;

export function resolveInstrument(id: string) { return instruments.find((preset) => preset.id === id) ?? instruments[0]; }

const audioBufferCache = new Map<string, Promise<AudioBuffer>>();
let manifestPromise: Promise<SampleManifest> | null = null;

function loadManifest(): Promise<SampleManifest> {
  manifestPromise ??= fetch(`${import.meta.env.BASE_URL}instruments/jv-grand-piano-light/v1/manifest.json`).then((response) => { if (!response.ok) throw new Error(`Could not load JV Grand Piano manifest (${response.status}).`); return response.json() as Promise<SampleManifest>; });
  return manifestPromise;
}

function loadSample(sample: SampleDescriptor): Promise<AudioBuffer> {
  const url = `${import.meta.env.BASE_URL}instruments/jv-grand-piano-light/v1/${sample.file}`;
  const cached = audioBufferCache.get(url);
  if (cached) return cached;
  const promise = fetch(url).then((response) => { if (!response.ok) throw new Error(`Could not load piano sample ${sample.file}.`); return response.arrayBuffer(); }).then((encoded) => Tone.getContext().rawContext.decodeAudioData(encoded));
  audioBufferCache.set(url, promise);
  return promise;
}

class LazySampleVoice implements InstrumentVoice {
  private readonly samplers = new Map<string, Tone.Sampler>();
  private readonly loaded = new Set<string>();
  private readonly pending = new Map<string, Promise<void>>();
  private readonly manifest = loadManifest();
  private disposed = false;
  constructor(private readonly output: Tone.ToneAudioNode, private readonly level: number) {}
  async prepare(notes: Array<{ midi: number; velocity: number }>): Promise<void> { const manifest = await this.manifest; await Promise.all(notes.map((note) => this.ensureSample(manifest, note.midi, note.velocity))); }
  triggerAttackRelease(note: string, duration: any, time: any, velocity: number): void {
    const midi = Math.round(Tone.Frequency(note).toMidi());
    void this.manifest.then((manifest) => this.ensureSample(manifest, midi, velocity).then(() => this.samplers.get(this.layerFor(manifest, velocity))?.triggerAttackRelease(note, duration, time, velocity)));
  }
  releaseAll(): void { for (const sampler of this.samplers.values()) sampler.releaseAll(); }
  dispose(): void { this.disposed = true; for (const sampler of this.samplers.values()) sampler.dispose(); this.samplers.clear(); }
  private async ensureSample(manifest: SampleManifest, midi: number, velocity: number): Promise<void> {
    if (this.disposed || midi < manifest.range.lowestMidi || midi > manifest.range.highestMidi) return;
    const sample = manifest.samples.find((item) => midi >= item.loNote && midi <= item.hiNote && velocity >= item.velocityMin && velocity <= item.velocityMax);
    if (!sample) return;
    if (this.loaded.has(sample.file)) return;
    const existing = this.pending.get(sample.file); if (existing) return existing;
    const pending = loadSample(sample).then((buffer) => { let sampler = this.samplers.get(sample.layer); if (!sampler) { sampler = new Tone.Sampler({ attack: 0.002, release: 1.2, volume: this.level, urls: {} }).connect(this.output); this.samplers.set(sample.layer, sampler); } sampler.add(sample.rootMidi as never, buffer); this.loaded.add(sample.file); }).finally(() => this.pending.delete(sample.file));
    this.pending.set(sample.file, pending); return pending;
  }
  private layerFor(manifest: SampleManifest, velocity: number): string { return manifest.velocityLayers.find((layer) => velocity >= layer.velocityMin && velocity <= layer.velocityMax)?.name ?? manifest.velocityLayers[manifest.velocityLayers.length - 1].name; }
}

class SynthVoice implements InstrumentVoice {
  constructor(private readonly synth: Tone.PolySynth) {}
  async prepare(): Promise<void> {}
  triggerAttackRelease(note: string, duration: any, time: any, velocity: number): void { this.synth.triggerAttackRelease(note, duration, time, velocity); }
  releaseAll(): void { this.synth.releaseAll(); }
  dispose(): void { this.synth.dispose(); }
}

export function createInstrument(id: string, output: Tone.ToneAudioNode): InstrumentVoice {
  const preset = resolveInstrument(id);
  if ('sampleManifest' in preset) return new LazySampleVoice(output, preset.level);
  const synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: preset.wave }, envelope: { attack: preset.attack, decay: preset.decay, sustain: preset.sustain, release: preset.release } });
  synth.maxPolyphony = 32; synth.volume.value = preset.level; synth.connect(output); return new SynthVoice(synth);
}
