export const ARRANGER_TRACK_LABEL_WIDTH = 136;
export const ARRANGER_MANUAL_BAR_WIDTHS = [12, 24, 48, 96, 192] as const;

export type ArrangerManualBarWidth = (typeof ARRANGER_MANUAL_BAR_WIDTHS)[number];
export type ArrangerZoom = 'fit' | ArrangerManualBarWidth;

export function arrangerLaneWidth(zoom: ArrangerZoom, viewportWidth: number, bars: number): number {
  if (zoom !== 'fit') return zoom * bars;
  return Math.max(0.5, (viewportWidth - ARRANGER_TRACK_LABEL_WIDTH) / bars) * bars;
}

export function arrangerBarWidth(zoom: ArrangerZoom, viewportWidth: number, bars: number): number {
  return arrangerLaneWidth(zoom, viewportWidth, bars) / bars;
}

export function arrangerRulerStep(barWidth: number): number {
  const steps = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1_024];
  return steps.find((step) => step * barWidth >= 34) ?? 1_024;
}

export function isArrangerZoom(value: string): value is `${ArrangerManualBarWidth}` {
  return ARRANGER_MANUAL_BAR_WIDTHS.includes(Number(value) as ArrangerManualBarWidth);
}
