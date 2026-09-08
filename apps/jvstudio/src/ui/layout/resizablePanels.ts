export type SeparatorOrientation = 'vertical' | 'horizontal';

interface ResizableSeparatorOptions {
  element: HTMLElement;
  orientation: SeparatorOrientation;
  getSize: () => number;
  setSize: (pixels: number) => void;
  limits: () => { min: number; max: number };
  storageKey: string;
  step?: number;
}

export function clampPanelSize(value: number, min: number, max: number): number {
  return Math.round(Math.min(Math.max(min, max), Math.max(min, value)));
}

export function installResizableSeparator({
  element, orientation, getSize, setSize, limits, storageKey, step = 24,
}: ResizableSeparatorOptions): void {
  element.setAttribute('aria-orientation', orientation);
  let current = readStoredSize(storageKey);

  function apply(value: number, persist = true): void {
    const range = limits();
    current = clampPanelSize(value, range.min, range.max);
    setSize(current);
    element.setAttribute('aria-valuemin', String(Math.round(range.min)));
    element.setAttribute('aria-valuemax', String(Math.round(range.max)));
    element.setAttribute('aria-valuenow', String(current));
    if (persist) storeSize(storageKey, current);
  }

  if (current !== null) apply(current, false);

  let drag: { pointerId: number; start: number; size: number } | null = null;
  element.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || drag) return;
    const size = current ?? getSize();
    drag = { pointerId: event.pointerId, start: orientation === 'vertical' ? event.clientX : event.clientY, size };
    element.setPointerCapture(event.pointerId);
    element.classList.add('is-dragging');
    apply(size, false);
    event.preventDefault();
  });
  element.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const coordinate = orientation === 'vertical' ? event.clientX : event.clientY;
    const delta = coordinate - drag.start;
    apply(drag.size + (orientation === 'vertical' ? delta : -delta), false);
  });
  function finish(event: PointerEvent): void {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const pointerId = drag.pointerId;
    drag = null;
    element.classList.remove('is-dragging');
    if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
    if (current !== null) storeSize(storageKey, current);
  }
  element.addEventListener('pointerup', finish);
  element.addEventListener('pointercancel', finish);
  element.addEventListener('lostpointercapture', () => {
    drag = null;
    element.classList.remove('is-dragging');
  });
  element.addEventListener('keydown', (event) => {
    const direction = orientation === 'vertical'
      ? event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
      : event.key === 'ArrowDown' ? -1 : event.key === 'ArrowUp' ? 1 : 0;
    if (!direction) return;
    event.preventDefault();
    apply((current ?? getSize()) + direction * step);
  });
}

function readStoredSize(key: string): number | null {
  try {
    const value = Number(sessionStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function storeSize(key: string, value: number): void {
  try {
    sessionStorage.setItem(key, String(value));
  } catch {
    // Session storage can be unavailable in strict privacy modes; resizing still works.
  }
}
