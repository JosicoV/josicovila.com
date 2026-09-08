import * as Tone from 'tone';

import type { EffectConfig } from '../../project';

export interface EffectProcessor {
  readonly input: Tone.ToneAudioNode;
  readonly output: Tone.ToneAudioNode;
  sync(config: EffectConfig, bpm: number): void;
  ready(): Promise<void>;
  dispose(): void;
}

export function dbToGain(decibels: number): number {
  return 10 ** (decibels / 20);
}
