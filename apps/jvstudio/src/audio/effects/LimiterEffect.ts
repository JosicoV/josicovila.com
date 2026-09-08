import * as Tone from 'tone';

import type { EffectConfig } from '../../project';
import { InsertEffect } from './InsertEffect';

export class LimiterEffect extends InsertEffect {
  private readonly limiter: Tone.Limiter;

  constructor(enabled: boolean, threshold: number) {
    const limiter = new Tone.Limiter(threshold);
    super(limiter);
    this.limiter = limiter;
    this.syncLimiter(enabled, threshold);
  }

  sync(config: EffectConfig): void {
    this.syncLimiter(config.enabled, config.parameters.threshold ?? -1);
  }

  syncLimiter(enabled: boolean, threshold: number): void {
    this.limiter.threshold.value = threshold;
    this.setEnabled(enabled);
  }
}
