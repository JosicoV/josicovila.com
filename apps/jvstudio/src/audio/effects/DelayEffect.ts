import * as Tone from 'tone';

import { parameterValue, type EffectConfig } from '../../project';
import type { EffectProcessor } from './types';

export class DelayEffect implements EffectProcessor {
  readonly input = new Tone.Gain(1);
  readonly output = new Tone.Gain(1);
  private readonly delay = new Tone.FeedbackDelay({ wet: 1, maxDelay: 2 });

  constructor(config: EffectConfig, bpm: number) {
    this.input.connect(this.delay);
    this.delay.connect(this.output);
    this.sync(config, bpm);
  }

  sync(config: EffectConfig, bpm: number): void {
    this.delay.delayTime.value = parameterValue(config, 'time') * 60 / bpm;
    this.delay.feedback.value = parameterValue(config, 'feedback');
    this.output.gain.value = config.enabled ? parameterValue(config, 'wet') : 0;
  }

  ready(): Promise<void> {
    return Promise.resolve();
  }

  dispose(): void {
    this.input.dispose();
    this.delay.dispose();
    this.output.dispose();
  }
}
