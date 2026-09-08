import type { EffectConfig } from '../../project';
import { CompressorEffect } from './CompressorEffect';
import { DelayEffect } from './DelayEffect';
import { EqEffect } from './EqEffect';
import { ReverbEffect } from './ReverbEffect';
import type { EffectProcessor } from './types';

export function createEffectProcessor(config: EffectConfig, bpm: number): EffectProcessor {
  switch (config.id) {
    case 'jv-eq': return new EqEffect(config, bpm);
    case 'jv-compressor': return new CompressorEffect(config, bpm);
    case 'jv-reverb': return new ReverbEffect(config, bpm);
    case 'jv-delay': return new DelayEffect(config, bpm);
    default: throw new RangeError(`Effect "${config.id}" is not valid in this signal chain.`);
  }
}
