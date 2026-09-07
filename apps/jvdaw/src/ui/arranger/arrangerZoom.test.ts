import { describe, expect, it } from 'vitest';

import { arrangerBarWidth, arrangerLaneWidth, arrangerRulerStep, isArrangerZoom } from './arrangerZoom';

describe('Arranger zoom', () => {
  it('fits the entire project into the lane viewport', () => {
    expect(arrangerLaneWidth('fit', 936, 40)).toBe(800);
    expect(arrangerBarWidth('fit', 936, 40)).toBe(20);
  });

  it('supports a broad fixed scale and reduces ruler label density', () => {
    expect(arrangerLaneWidth(192, 936, 40)).toBe(7_680);
    expect(arrangerRulerStep(12)).toBe(4);
    expect(arrangerRulerStep(48)).toBe(1);
    expect(isArrangerZoom('96')).toBe(true);
    expect(isArrangerZoom('30')).toBe(false);
  });
});
