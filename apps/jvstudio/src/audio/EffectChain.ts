import * as Tone from 'tone';

/** Pass-through insert boundary. Effects can be rebuilt here without touching transport or UI code. */
export class EffectChain {
  readonly input = new Tone.Gain(1);
  readonly output = new Tone.Gain(1);

  constructor() {
    this.input.connect(this.output);
  }

  dispose(): void {
    this.input.dispose();
    this.output.dispose();
  }
}
