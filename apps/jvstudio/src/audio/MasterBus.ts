import * as Tone from 'tone';

import { EffectChain } from './EffectChain';

export class MasterBus {
  readonly input = new Tone.Gain(1);
  readonly effects = new EffectChain();
  readonly volume: Tone.Gain;
  readonly meter: Tone.Meter;

  constructor(volume: number) {
    this.volume = new Tone.Gain(volume);
    this.meter = new Tone.Meter({ channelCount: 2, smoothing: 0.78, normalRange: false }).toDestination();
    this.input.connect(this.effects.input);
    this.effects.output.connect(this.volume);
    this.volume.connect(this.meter);
  }

  setVolume(volume: number): void {
    this.volume.gain.value = volume;
  }

  dispose(): void {
    this.input.dispose();
    this.effects.dispose();
    this.volume.dispose();
    this.meter.dispose();
  }
}
