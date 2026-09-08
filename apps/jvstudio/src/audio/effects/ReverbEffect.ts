import * as Tone from 'tone';

import { parameterValue, type EffectConfig } from '../../project';
import type { EffectProcessor } from './types';

export class ReverbEffect implements EffectProcessor {
  readonly input = new Tone.Gain(1);
  readonly output = new Tone.Gain(1);
  private readonly reverb: Tone.Reverb;

  constructor(config: EffectConfig, _bpm: number) {
    const reverb = new Tone.Reverb({
      decay: parameterValue(config, 'decay'),
      preDelay: parameterValue(config, 'preDelay'),
      wet: 1,
    });
    this.reverb = reverb;
    this.input.connect(this.reverb);
    this.reverb.connect(this.output);
    this.sync(config);
  }

  sync(config: EffectConfig): void {
    const decay = parameterValue(config, 'decay');
    const preDelay = parameterValue(config, 'preDelay');
    if (this.reverb.decay !== decay) this.reverb.decay = decay;
    if (this.reverb.preDelay !== preDelay) this.reverb.preDelay = preDelay;
    this.output.gain.value = config.enabled ? parameterValue(config, 'wet') : 0;
  }

  async ready(): Promise<void> {
    await this.reverb.ready;
  }

  dispose(): void {
    this.input.dispose();
    this.reverb.dispose();
    this.output.dispose();
  }
}
