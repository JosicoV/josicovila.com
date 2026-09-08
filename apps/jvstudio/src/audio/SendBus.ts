import * as Tone from 'tone';

import type { EffectConfig } from '../project';
import { createEffectProcessor } from './effects/factory';
import type { EffectProcessor } from './effects/types';

/** Shared wet-effect boundary. Track taps feed input; output returns to the Master bus. */
export class SendBus {
  readonly input = new Tone.Gain(1);
  readonly output = new Tone.Gain(1);
  private readonly effect: EffectProcessor;

  constructor(config: EffectConfig, bpm: number, destination: Tone.Gain) {
    this.effect = createEffectProcessor(config, bpm);
    this.input.connect(this.effect.input);
    this.effect.output.connect(this.output);
    this.output.connect(destination);
  }

  createTap(level = 0): Tone.Gain {
    return new Tone.Gain(level).connect(this.input);
  }

  sync(config: EffectConfig, bpm: number): void {
    this.effect.sync(config, bpm);
  }

  ready(): Promise<void> {
    return this.effect.ready();
  }

  dispose(): void {
    this.input.dispose();
    this.effect.dispose();
    this.output.dispose();
  }
}
