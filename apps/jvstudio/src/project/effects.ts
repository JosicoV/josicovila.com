import type { EffectConfig, EffectId, SendEffects } from './types';

export interface EffectParameterDefinition {
  key: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

export const EFFECT_PARAMETERS: Record<EffectId, readonly EffectParameterDefinition[]> = {
  'jv-eq': [
    { key: 'low', min: -12, max: 12, step: 0.5, defaultValue: 0 },
    { key: 'mid', min: -12, max: 12, step: 0.5, defaultValue: 0 },
    { key: 'high', min: -12, max: 12, step: 0.5, defaultValue: 0 },
  ],
  'jv-compressor': [
    { key: 'threshold', min: -60, max: 0, step: 1, defaultValue: -18 },
    { key: 'ratio', min: 1, max: 20, step: 0.5, defaultValue: 3 },
    { key: 'attack', min: 0.001, max: 1, step: 0.001, defaultValue: 0.01 },
    { key: 'release', min: 0.01, max: 1, step: 0.01, defaultValue: 0.25 },
    { key: 'makeup', min: 0, max: 18, step: 0.5, defaultValue: 0 },
  ],
  'jv-reverb': [
    { key: 'decay', min: 0.2, max: 8, step: 0.1, defaultValue: 2.2 },
    { key: 'preDelay', min: 0, max: 0.2, step: 0.005, defaultValue: 0.02 },
    { key: 'wet', min: 0, max: 1, step: 0.01, defaultValue: 0.7 },
  ],
  'jv-delay': [
    { key: 'time', min: 0.25, max: 1, step: 0.25, defaultValue: 0.5 },
    { key: 'feedback', min: 0, max: 0.85, step: 0.01, defaultValue: 0.3 },
    { key: 'wet', min: 0, max: 1, step: 0.01, defaultValue: 0.55 },
  ],
  'jv-limiter': [
    { key: 'threshold', min: -12, max: 0, step: 0.5, defaultValue: -1 },
  ],
};

export const TRACK_INSERT_EFFECTS = new Set<EffectId>(['jv-eq', 'jv-compressor']);
export const MASTER_INSERT_EFFECTS = new Set<EffectId>(['jv-eq', 'jv-compressor']);

export function createEffectConfig(id: EffectId, enabled = true): EffectConfig {
  return {
    id,
    enabled,
    parameters: Object.fromEntries(EFFECT_PARAMETERS[id].map((parameter) => [parameter.key, parameter.defaultValue])),
  };
}

export function createDefaultSendEffects(): SendEffects {
  return {
    reverb: createEffectConfig('jv-reverb'),
    delay: createEffectConfig('jv-delay'),
  };
}

export function parameterValue(config: EffectConfig, key: string): number {
  const definition = EFFECT_PARAMETERS[config.id].find((item) => item.key === key);
  if (!definition) throw new RangeError(`Unknown ${config.id} parameter "${key}".`);
  return config.parameters[key] ?? definition.defaultValue;
}
