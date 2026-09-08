import * as Tone from 'tone';

import { EffectChain } from './EffectChain';

/** Shared wet-effect boundary. Track taps feed input; output returns to the Master bus. */
export class SendBus {
  readonly input = new Tone.Gain(1);
  readonly effects = new EffectChain();
  readonly output = new Tone.Gain(1);

  constructor(destination: Tone.Gain) {
    this.input.connect(this.effects.input);
    this.effects.output.connect(this.output);
    this.output.connect(destination);
  }

  createTap(level = 0): Tone.Gain {
    return new Tone.Gain(level).connect(this.input);
  }

  dispose(): void {
    this.input.dispose();
    this.effects.dispose();
    this.output.dispose();
  }
}
