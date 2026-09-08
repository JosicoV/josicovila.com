import type { TimeSignature } from './types';

export type QuantizeDivision = 'bar' | '1/2' | '1/4' | '1/8' | '1/16' | '1/32';

export interface MusicalPosition {
  bar: number;
  beat: number;
  beatOffset: number;
}

export function normalizeBpm(value: number): number {
  if (!Number.isFinite(value)) return 120;
  return Math.min(240, Math.max(40, Math.round(value)));
}

export function beatsPerBar([numerator, denominator]: TimeSignature): number {
  return numerator * (4 / denominator);
}

export function barsToBeats(bars: number, signature: TimeSignature): number {
  return bars * beatsPerBar(signature);
}

export function beatsToSeconds(beats: number, bpm: number): number {
  return beats * (60 / bpm);
}

export function secondsToBeats(seconds: number, bpm: number): number {
  return seconds * (bpm / 60);
}

export function divisionToBeats(division: QuantizeDivision, signature: TimeSignature): number {
  if (division === 'bar') return beatsPerBar(signature);
  const denominator = Number.parseInt(division.slice(2), 10);
  return 4 / denominator;
}

export function quantizeBeat(beat: number, division: QuantizeDivision, signature: TimeSignature): number {
  const grid = divisionToBeats(division, signature);
  return roundBeat(Math.max(0, Math.round(beat / grid) * grid));
}

export function beatToMusicalPosition(absoluteBeat: number, signature: TimeSignature): MusicalPosition {
  const barLength = beatsPerBar(signature);
  const zeroBasedBar = Math.floor(absoluteBeat / barLength);
  const beatInBar = absoluteBeat - zeroBasedBar * barLength;
  const wholeBeat = Math.floor(beatInBar);
  return {
    bar: zeroBasedBar + 1,
    beat: wholeBeat + 1,
    beatOffset: roundBeat(beatInBar - wholeBeat),
  };
}

function roundBeat(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
