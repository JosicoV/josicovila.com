import { barsToBeats, beatsPerBar, MAX_PROJECT_BARS, PROJECT_GROWTH_BARS, type ProjectStore } from '../../project';
import { l } from '../../i18n';
import { clipLengthFromPointer, clipStartFromPointer, isClipRangeAvailable, findFirstAvailableClipStart } from './clipPlacement';

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

  function resize(length: number) {
    const { project, track, clip } = selected();
    if (!track || !clip) return;
    const notesEnd = clip.notes.reduce((end, note) => Math.max(end, note.startBeat + note.durationBeats), 0);
    const projectEnd = barsToBeats(project.lengthBars, project.timeSignature);
    if (length < notesEnd) {
      message(l('No se puede acortar el clip', 'Cannot shorten clip'), l('Hay notas fuera de la nueva duración.', 'Some notes would fall outside the new length.'));
    } else if (!isClipRangeAvailable(track, clip.startBeat, length, projectEnd, clip.id)) {
      message(l('No se puede alargar el clip', 'Cannot extend clip'), l('El nuevo tamaño se solapa con otro clip.', 'The new size overlaps another clip.'));
    } else if (length !== clip.lengthBeats) {
      store.updateClip(track.id, clip.id, { lengthBeats: length });
    }
    focusClip();
  }

  function duplicate() {
    const { project, track, clip } = selected();
    if (!track || !clip) return;
    const end = barsToBeats(project.lengthBars, project.timeSignature);
    const adjacent = clip.startBeat + clip.lengthBeats;
    let start = isClipRangeAvailable(track, adjacent, clip.lengthBeats, end) ? adjacent
      : findFirstAvailableClipStart(track, clip.lengthBeats, end, beatsPerBar(project.timeSignature));
    if (start === null && project.lengthBars < MAX_PROJECT_BARS) {
      const extendedBars = Math.min(MAX_PROJECT_BARS, project.lengthBars + PROJECT_GROWTH_BARS);
      const extendedEnd = barsToBeats(extendedBars, project.timeSignature);
      start = findFirstAvailableClipStart(track, clip.lengthBeats, extendedEnd, beatsPerBar(project.timeSignature));
    }
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
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      if (event.shiftKey) resize(clip.lengthBeats + direction * beatsPerBar(project.timeSignature) / 2);
      else move(clip.startBeat + direction * beatsPerBar(project.timeSignature));
    }
  });

  let drag: { id: number; mode: 'move' | 'resize'; x: number; start: number; candidate: number; width: number;
    length: number; candidateLength: number; notesEnd: number; end: number; snap: number; trackId: string; clipId: string;
    button: HTMLElement; moved: boolean; valid: boolean } | null = null;
  let swallowClick = false;
  let lastTap: { id: string; time: number; x: number; y: number } | null = null;

  function cancelDrag() {
    if (!drag) return;
    const old = drag;
    drag = null;
    old.button.style.setProperty('--clip-left', `${old.start / old.end * 100}%`);
    old.button.style.setProperty('--clip-width', `${old.length / old.end * 100}%`);
    old.button.classList.remove('is-dragging', 'is-resizing', 'is-invalid');
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
    const mode = (event.target as HTMLElement).closest('[data-clip-resize]') ? 'resize' : 'move';
    drag = { id: event.pointerId, mode, x: event.clientX, start: clip.startBeat, candidate: clip.startBeat,
      width: lane.getBoundingClientRect().width, length: clip.lengthBeats, candidateLength: clip.lengthBeats,
      notesEnd: clip.notes.reduce((end, note) => Math.max(end, note.startBeat + note.durationBeats), 0),
      end: barsToBeats(project.lengthBars, project.timeSignature),
      snap: mode === 'resize' ? beatsPerBar(project.timeSignature) / 2 : beatsPerBar(project.timeSignature),
      trackId: button.dataset.trackId, clipId: clip.id, button, moved: false, valid: true };
    element.setPointerCapture(event.pointerId);
  });
  element.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const delta = event.clientX - drag.x;
    if (!drag.moved && Math.abs(delta) < 5) return;
    drag.moved = true;
    const track = store.getSnapshot().tracks.find((item) => item.id === drag!.trackId);
    if (drag.mode === 'resize') {
      const originalEndOffset = ((drag.start + drag.length) / drag.end) * drag.width;
      drag.candidateLength = clipLengthFromPointer(originalEndOffset + delta, drag.width, drag.start, drag.end, drag.snap);
      drag.valid = drag.candidateLength >= drag.notesEnd
        && !!track && isClipRangeAvailable(track, drag.start, drag.candidateLength, drag.end, drag.clipId);
      drag.button.style.setProperty('--clip-width', `${drag.candidateLength / drag.end * 100}%`);
      drag.button.classList.add('is-resizing');
    } else {
      drag.candidate = clipStartFromPointer(drag.start / drag.end * drag.width + delta,
        drag.width, drag.length, drag.end, drag.snap);
      drag.valid = !!track && isClipRangeAvailable(track, drag.candidate, drag.length, drag.end, drag.clipId);
      drag.button.style.setProperty('--clip-left', `${drag.candidate / drag.end * 100}%`);
      drag.button.classList.add('is-dragging');
    }
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
      if (old.mode === 'resize') resize(old.candidateLength);
      else move(old.candidate);
    } else if (old.mode === 'resize') {
      lastTap = null;
      focusClip();
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
