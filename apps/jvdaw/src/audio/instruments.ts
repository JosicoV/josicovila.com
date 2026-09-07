import * as Tone from 'tone';

// Original synthesized presets: no samples, SoundFonts or external audio assets.
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
] as const;

export function resolveInstrument(id: string) {
  return instruments.find((preset) => preset.id === id) ?? instruments[0];
}

export function createInstrument(id: string, output: Tone.ToneAudioNode): Tone.PolySynth {
  const preset = resolveInstrument(id);
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: preset.wave },
    envelope: { attack: preset.attack, decay: preset.decay, sustain: preset.sustain, release: preset.release },
  });
  synth.maxPolyphony = 32;
  synth.volume.value = preset.level;
  synth.connect(output);
  return synth;
}
