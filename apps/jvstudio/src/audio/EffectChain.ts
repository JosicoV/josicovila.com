import * as Tone from 'tone';

import type { EffectConfig } from '../project';
import { createEffectProcessor } from './effects/factory';
import type { EffectProcessor } from './effects/types';

/** Pass-through insert boundary. Effects can be rebuilt here without touching transport or UI code. */
export class EffectChain {
  readonly input = new Tone.Gain(1);
  readonly output = new Tone.Gain(1);
  private processors: EffectProcessor[] = [];
  private layout = '';

  constructor() {
    this.input.connect(this.output);
  }

  sync(configs: EffectConfig[], bpm: number): void {
    const layout = configs.map((config) => config.id).join('|');
    if (layout !== this.layout) this.rebuild(configs, bpm);
    else configs.forEach((config, index) => this.processors[index].sync(config, bpm));
  }

  async ready(): Promise<void> {
    await Promise.all(this.processors.map((processor) => processor.ready()));
  }

  dispose(): void {
    this.processors.forEach((processor) => processor.dispose());
    this.input.dispose();
    this.output.dispose();
  }

  private rebuild(configs: EffectConfig[], bpm: number): void {
    this.input.disconnect();
    this.processors.forEach((processor) => processor.dispose());
    this.processors = configs.map((config) => createEffectProcessor(config, bpm));
    this.layout = configs.map((config) => config.id).join('|');
    let previous: Tone.ToneAudioNode = this.input;
    for (const processor of this.processors) {
      previous.connect(processor.input);
      previous = processor.output;
    }
    previous.connect(this.output);
  }
}
