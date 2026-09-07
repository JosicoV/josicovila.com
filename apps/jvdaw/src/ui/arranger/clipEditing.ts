import { barsToBeats, beatsPerBar, type ProjectStore } from '../../project';
import { l } from '../../i18n';
import { clipStartFromPointer, isClipRangeAvailable, findFirstAvailableClipStart } from './clipPlacement';

interface Selection { trackId: string; clipId: string | null }
interface Options {
  element: HTMLElement;
  store: ProjectStore;
  selection: () => Selection;
  select: (trackId: string, clipId: string) => void;
  openClip: (trackId: string, clipId: string) => void;
  message: (title: string, copy: string) => void;
}

export function installClipEditing({ element, store, selection, select, openClip, message }: Options) {
  function selected() {
    const project = store.getSnapshot();
    const { trackId, clipId } = selection();
    const track = project.tracks.find((item) => item.id === trackId);
    const clip = track?.clips.find((item) => item.id === clipId);
    return { project, track, clip };
  }

  function focusClip() {
    const id = selection().clipId;
    const button = Array.from(element.querySelectorAll<HTMLElement>('[data-clip-id]'))
      .find((item) => item.dataset.clipId === id);
    (button ?? element).focus({ preventScroll: true });
  }

  function move(start: number) {
    const { project, track, clip } = selected();
    if (!track || !clip) return;
    const end = barsToBeats(project.lengthBars, project.timeSignature);
    if (!isClipRangeAvailable(track, start, clip.lengthBeats, end, clip.id)) {
      message(l('No se puede mover el clip', 'Cannot move clip'), l('Elige un compás libre dentro del proyecto.', 'Choose a free bar within the project.'));
    } else if (start !== clip.startBeat) {
      store.moveClip(track.id, clip.id, start);
    }
    focusClip();
  }

  function duplicate() {
    const { project, track, clip } = selected();
    if (!track || !clip) return;
    const end = barsToBeats(project.lengthBars, project.timeSignature);
    const adjacent = clip.startBeat + clip.lengthBeats;
    const start = isClipRangeAvailable(track, adjacent, clip.lengthBeats, end) ? adjacent
      : findFirstAvailableClipStart(track, clip.lengthBeats, end, beatsPerBar(project.timeSignature));
    if (start === null) {
      message(l('No hay sitio para la copia', 'No room for a copy'), l('Libera un compás antes de duplicar este clip.', 'Free a bar before duplicating this clip.'));
    } else {
      const copy = store.duplicateClip(track.id, clip.id, start);
      select(track.id, copy.id);
    }
    focusClip();
  }

  function remove() {
    const { track, clip } = selected();
    if (!track || !clip) return;
    store.removeClip(track.id, clip.id);
    message(l('Clip borrado', 'Clip deleted'), l('La reproducción se ha detenido. Selecciona otro clip o crea uno nuevo.', 'Playback stopped. Select another clip or create a new one.'));
    element.focus({ preventScroll: true });
  }

  element.addEventListener('keydown', (event) => {
    if ((event.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key === 'Escape') { cancelDrag(); return; }
    if (drag) return;
    const { project, clip } = selected();
    if (!clip) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      duplicate();
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      remove();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      move(clip.startBeat + (event.key === 'ArrowRight' ? 1 : -1) * beatsPerBar(project.timeSignature));
    }
  });

  let drag: { id: number; x: number; start: number; candidate: number; width: number;
    length: number; end: number; snap: number; trackId: string; clipId: string;
    button: HTMLElement; moved: boolean; valid: boolean } | null = null;
  let swallowClick = false;
  let lastTap: { id: string; time: number; x: number; y: number } | null = null;

  function cancelDrag() {
    if (!drag) return;
    const old = drag;
    drag = null;
    old.button.style.setProperty('--clip-left', `${old.start / old.end * 100}%`);
    old.button.classList.remove('is-dragging', 'is-invalid');
    if (element.hasPointerCapture(old.id)) element.releasePointerCapture(old.id);
    swallowClick = old.moved;
  }

  // Capture on the stable container: selection rendering replaces clip buttons.
  element.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || drag) return;
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-clip-id]');
    if (!button?.dataset.clipId || !button.dataset.trackId) return;
    swallowClick = false;
    const lane = button.closest<HTMLElement>('[data-lane-track-id]');
    const project = store.getSnapshot();
    const clip = project.tracks.find((track) => track.id === button.dataset.trackId)?.clips
      .find((item) => item.id === button.dataset.clipId);
    if (!clip || !lane) return;
    drag = { id: event.pointerId, x: event.clientX, start: clip.startBeat, candidate: clip.startBeat,
      width: lane.getBoundingClientRect().width, length: clip.lengthBeats,
      end: barsToBeats(project.lengthBars, project.timeSignature), snap: beatsPerBar(project.timeSignature),
      trackId: button.dataset.trackId, clipId: clip.id, button, moved: false, valid: true };
    element.setPointerCapture(event.pointerId);
  });
  element.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const delta = event.clientX - drag.x;
    if (!drag.moved && Math.abs(delta) < 5) return;
    drag.moved = true;
    drag.candidate = clipStartFromPointer(drag.start / drag.end * drag.width + delta,
      drag.width, drag.length, drag.end, drag.snap);
    const track = store.getSnapshot().tracks.find((item) => item.id === drag!.trackId);
    drag.valid = !!track && isClipRangeAvailable(track, drag.candidate, drag.length, drag.end, drag.clipId);
    drag.button.style.setProperty('--clip-left', `${drag.candidate / drag.end * 100}%`);
    drag.button.classList.add('is-dragging');
    drag.button.classList.toggle('is-invalid', !drag.valid);
  });
  element.addEventListener('pointerup', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const old = drag;
    cancelDrag();
    // Suppress the synthetic click even for selection: the button is replaced.
    swallowClick = true;
    select(old.trackId, old.clipId);
    if (old.moved) {
      lastTap = null;
      move(old.candidate);
    } else {
      const now = performance.now();
      const double = lastTap?.id === old.clipId && now - lastTap.time < 450
        && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 8;
      lastTap = double ? null : { id: old.clipId, time: now, x: event.clientX, y: event.clientY };
      if (double) openClip(old.trackId, old.clipId);
      else focusClip();
    }
  });
  element.addEventListener('pointercancel', cancelDrag);
  element.addEventListener('lostpointercapture', cancelDrag);
  element.addEventListener('click', (event) => {
    if (!swallowClick) return;
    swallowClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  window.addEventListener('blur', cancelDrag);
  return { duplicate, remove, focusClip };
}
