export const METER_FLOOR_DB = -60;
export const METER_CEILING_DB = 6;
export const CLIP_THRESHOLD_DB = 0;

const PEAK_HOLD_MS = 800;
const CLIP_HOLD_MS = 1_500;
const PEAK_FALL_DB_PER_SECOND = 24;

export interface MeterBallistics {
  peakDb: number;
  holdUntil: number;
  clipUntil: number;
  updatedAt: number;
}

export function initialMeterBallistics(now = 0): MeterBallistics {
  return { peakDb: METER_FLOOR_DB, holdUntil: now, clipUntil: now, updatedAt: now };
}

export function updateMeterBallistics(previous: MeterBallistics, levelDb: number, now: number): MeterBallistics {
  const level = clampMeterDb(levelDb);
  const elapsedSeconds = Math.max(0, now - previous.updatedAt) / 1_000;
  const fallingPeak = now < previous.holdUntil
    ? previous.peakDb
    : Math.max(METER_FLOOR_DB, previous.peakDb - PEAK_FALL_DB_PER_SECOND * elapsedSeconds);
  const rising = level >= fallingPeak;
  return {
    peakDb: rising ? level : Math.max(level, fallingPeak),
    holdUntil: rising ? now + PEAK_HOLD_MS : previous.holdUntil,
    clipUntil: level >= CLIP_THRESHOLD_DB ? now + CLIP_HOLD_MS : previous.clipUntil,
    updatedAt: now,
  };
}

export function meterPercent(decibels: number): number {
  return ((clampMeterDb(decibels) - METER_FLOOR_DB) / (METER_CEILING_DB - METER_FLOOR_DB)) * 100;
}

export function clampMeterDb(decibels: number): number {
  if (!Number.isFinite(decibels)) return METER_FLOOR_DB;
  return Math.min(METER_CEILING_DB, Math.max(METER_FLOOR_DB, decibels));
}
