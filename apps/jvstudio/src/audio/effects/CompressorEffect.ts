import * as Tone from 'tone';

import { parameterValue, type EffectConfig } from '../../project';
import { InsertEffect } from './InsertEffect';
import { dbToGain } from './types';

export class CompressorEffect extends InsertEffect {
  private readonly compressor: Tone.Compressor;
  private readonly makeup = new Tone.Gain(1);

  constructor(config: EffectConfig, _bpm: number) {
    const compressor = new Tone.Compressor();
    const makeup = new Tone.Gain(1);
    compressor.connect(makeup);
    super(makeup);
    this.compressor = compressor;
    this.makeup = makeup;
    this.input.disconnect(makeup);
    this.input.connect(compressor);
    this.sync(config);
  }

  sync(config: EffectConfig): void {
    this.compressor.threshold.value = parameterValue(config, 'threshold');
    this.compressor.ratio.value = parameterValue(config, 'ratio');
    this.compressor.attack.value = parameterValue(config, 'attack');
    this.compressor.release.value = parameterValue(config, 'release');
    this.makeup.gain.value = dbToGain(parameterValue(config, 'makeup'));
    this.setEnabled(config.enabled);
  }

  override dispose(): void {
    super.dispose();
    this.compressor.dispose();
  }
}
