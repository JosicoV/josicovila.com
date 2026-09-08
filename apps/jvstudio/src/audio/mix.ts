import type { InstrumentTrack } from '../project';

export function trackGain(track: InstrumentTrack, tracks: InstrumentTrack[]): number {
  const hasSolo = tracks.some((item) => item.solo);
  return track.muted || (hasSolo && !track.solo) ? 0 : track.volume;
}
