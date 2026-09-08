import * as Tone from 'tone';

import { parameterValue, type EffectConfig } from '../../project';
import { InsertEffect } from './InsertEffect';

export class EqEffect extends InsertEffect {
  private readonly eq: Tone.EQ3;

  constructor(config: EffectConfig, _bpm: number) {
    const eq = new Tone.EQ3();
    super(eq);
    this.eq = eq;
    this.sync(config);
  }

  sync(config: EffectConfig): void {
    this.eq.low.value = parameterValue(config, 'low');
    this.eq.mid.value = parameterValue(config, 'mid');
    this.eq.high.value = parameterValue(config, 'high');
    this.setEnabled(config.enabled);
  }
}
