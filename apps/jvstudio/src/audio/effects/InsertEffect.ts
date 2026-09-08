import * as Tone from 'tone';

import type { EffectConfig } from '../../project';
import type { EffectProcessor } from './types';

export abstract class InsertEffect implements EffectProcessor {
  readonly input = new Tone.Gain(1);
  readonly output = new Tone.Gain(1);
  protected readonly dry = new Tone.Gain(0);
  protected readonly wet = new Tone.Gain(1);

  protected constructor(protected readonly processor: Tone.ToneAudioNode) {
    this.input.connect(this.dry);
    this.dry.connect(this.output);
    this.input.connect(processor);
    processor.connect(this.wet);
    this.wet.connect(this.output);
  }

  abstract sync(config: EffectConfig, bpm: number): void;

  ready(): Promise<void> {
    return Promise.resolve();
  }

  protected setEnabled(enabled: boolean): void {
    this.dry.gain.value = enabled ? 0 : 1;
    this.wet.gain.value = enabled ? 1 : 0;
  }

  dispose(): void {
    this.input.dispose();
    this.dry.dispose();
    this.processor.dispose();
    this.wet.dispose();
    this.output.dispose();
  }
}
