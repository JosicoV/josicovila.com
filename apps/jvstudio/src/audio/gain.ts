export const FADER_MIN_DB = -49;
export const FADER_MAX_DB = 6;
export const SILENCE_DB = FADER_MIN_DB;

export function gainToFaderDb(gain: number): number {
  if (gain <= 0) return SILENCE_DB;
  return clamp(20 * Math.log10(gain), -48, FADER_MAX_DB);
}

export function faderDbToGain(decibels: number): number {
  if (decibels <= SILENCE_DB) return 0;
  return 10 ** (clamp(decibels, -48, FADER_MAX_DB) / 20);
}

export function formatDecibels(decibels: number): string {
  if (decibels <= SILENCE_DB) return '-∞ dB';
  const rounded = Math.round(decibels * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded} dB`;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
