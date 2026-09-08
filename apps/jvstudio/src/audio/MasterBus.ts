import * as Tone from 'tone';

import type { MasterMix } from '../project';
import { EffectChain } from './EffectChain';
import { LimiterEffect } from './effects/LimiterEffect';

export class MasterBus {
  readonly input = new Tone.Gain(1);
  readonly effects = new EffectChain();
  readonly volume: Tone.Gain;
  readonly meter: Tone.Meter;
  readonly limiter: LimiterEffect;

  constructor(master: MasterMix, bpm: number) {
    this.volume = new Tone.Gain(master.volume);
    this.limiter = new LimiterEffect(master.limiterEnabled, master.limiterThreshold);
    this.meter = new Tone.Meter({ channelCount: 2, smoothing: 0.78, normalRange: false }).toDestination();
    this.input.connect(this.effects.input);
    this.effects.output.connect(this.volume);
    this.volume.connect(this.limiter.input);
    this.limiter.output.connect(this.meter);
    this.sync(master, bpm);
  }

  sync(master: MasterMix, bpm: number): void {
    this.volume.gain.value = master.volume;
    this.effects.sync(master.insertFx, bpm);
    this.limiter.syncLimiter(master.limiterEnabled, master.limiterThreshold);
  }

  ready(): Promise<void> {
    return this.effects.ready();
  }

  dispose(): void {
    this.input.dispose();
    this.effects.dispose();
    this.volume.dispose();
    this.limiter.dispose();
    this.meter.dispose();
  }
}
