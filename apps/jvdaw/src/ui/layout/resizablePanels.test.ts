import { describe, expect, it } from 'vitest';

import { clampPanelSize } from './resizablePanels';

describe('resizable panel bounds', () => {
  it('rounds sizes and keeps them inside the available range', () => {
    expect(clampPanelSize(321.6, 230, 480)).toBe(322);
    expect(clampPanelSize(100, 230, 480)).toBe(230);
    expect(clampPanelSize(900, 230, 480)).toBe(480);
  });

  it('uses the minimum when the viewport cannot provide a larger maximum', () => {
    expect(clampPanelSize(400, 260, 200)).toBe(260);
  });
});
