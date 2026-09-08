import { midiToNoteName, type MidiNote, type ProjectStore } from '../../project';
import { l } from '../../i18n';
import { installResizableSeparator } from '../layout/resizablePanels';
import { ROW_HEIGHT, drawNote, dragNote } from './noteGeometry';

export function installPianoRoll(store: ProjectStore, onClose: () => void,
  preview: (trackId: string, midi: number, velocity: number) => Promise<void>) {
  const panel = document.createElement('section');
  panel.className = 'piano-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Piano Roll');
  panel.innerHTML = `
    <div class="piano-divider" data-piano-divider role="separator" tabindex="0" aria-label="${l('Cambiar altura de Arranger y Piano Roll', 'Resize Arranger and Piano Roll')}"><span></span></div>
    <header class="piano-toolbar">
      <div><span class="eyebrow">PIANO ROLL</span><h2 data-title></h2></div>
      <label>${l('Herramienta', 'Tool')} <select data-tool><option value="select">${l('Seleccionar', 'Select')}</option><option value="draw">${l('Dibujar', 'Draw')}</option><option value="erase">${l('Borrar', 'Erase')}</option></select></label>
      <label>${l('Ajuste', 'Snap')} <select data-snap><option value="1">1/4</option><option value="0.5">1/8</option><option value="0.25" selected>1/16</option><option value="0.125">1/32</option></select></label>
      <label>Zoom <select data-zoom><option value="80">50%</option><option value="160" selected>100%</option><option value="320">200%</option></select></label>
      <button type="button" data-add>${l('Añadir nota', 'Add note')}</button>
      <button type="button" data-help>? ${l('Ayuda', 'Help')}</button>
      <button type="button" data-expand aria-pressed="false">⛶ ${l('Ampliar', 'Expand')}</button>
      <button type="button" data-close>${l('Cerrar', 'Close')}</button>
    </header>
    <div class="piano-scroll" data-scroll>
      <div class="piano-canvas" data-canvas>
        <div class="piano-keys" data-keys></div>
        <div class="piano-grid" data-grid tabindex="0" aria-label="${l('Notas MIDI. Flechas para mover, Supr para borrar.', 'MIDI notes. Arrow keys move; Delete removes.')}"></div>
      </div>
    </div>
    <form class="piano-properties">
      <span data-note-label>${l('Selecciona una nota', 'Select a note')}</span>
      <label>MIDI <input name="midi" type="number" min="0" max="127" step="1" required></label>
      <label>${l('Inicio (beats)', 'Start (beats)')} <input name="startBeat" type="number" min="0" step="any" required></label>
      <label>${l('Duración', 'Duration')} <input name="durationBeats" type="number" min="0.001" step="any" required></label>
      <label>Velocity <input name="velocity" type="number" min="0" max="1" step="0.01" required></label>
      <button type="submit">${l('Aplicar', 'Apply')}</button><button type="button" data-delete>${l('Borrar nota', 'Delete note')}</button>
    </form>
    <p class="piano-message" role="status">${l('Usa Dibujar para crear notas. Arrastra el borde derecho para cambiar la duración.', 'Use Draw to create notes. Drag the right edge to change duration.')}</p>
  `;
  const host = document.querySelector<HTMLElement>('.arranger-panel')!;
  host.append(panel);
  const grid = panel.querySelector<HTMLElement>('[data-grid]')!;
  const scroll = panel.querySelector<HTMLElement>('[data-scroll]')!;
  const canvas = panel.querySelector<HTMLElement>('[data-canvas]')!;
  const form = panel.querySelector<HTMLFormElement>('form')!;
  const tool = panel.querySelector<HTMLSelectElement>('[data-tool]')!;
  const snapInput = panel.querySelector<HTMLSelectElement>('[data-snap]')!;
  const zoom = panel.querySelector<HTMLSelectElement>('[data-zoom]')!;
  const message = panel.querySelector<HTMLElement>('.piano-message')!;
  const expandButton = panel.querySelector<HTMLButtonElement>('[data-expand]')!;
  const pianoDivider = panel.querySelector<HTMLElement>('[data-piano-divider]')!;
  let trackId = '', clipId = '', noteId: string | null = null;
  let visibleClipStart = 0, visibleClipLength = 0;
  const clip = () => store.getSnapshot().tracks.find((track) => track.id === trackId)?.clips.find((item) => item.id === clipId);
  const note = () => clip()?.notes.find((item) => item.id === noteId);
  const snap = () => Number(snapInput.value);
  const pixels = () => Number(zoom.value);
  let gesture: { pointer: number; x: number; y: number; note: MidiNote; resize: boolean;
    button: HTMLElement; patch: ReturnType<typeof dragNote>; moved: boolean } | null = null;

  installResizableSeparator({
    element: pianoDivider,
    orientation: 'horizontal',
    getSize: () => panel.getBoundingClientRect().height,
    setSize: (pixels) => host.style.setProperty('--piano-height', `${pixels}px`),
    limits: () => ({ min: 260, max: Math.max(260, host.clientHeight - 334) }),
    storageKey: 'jvstudio:piano-height',
    step: 32,
  });

  const keys = panel.querySelector<HTMLElement>('[data-keys]')!;
  function audition(midi: number, velocity = 0.8) {
    void preview(trackId, midi, velocity).catch(() => {
      message.textContent = l('No se pudo activar el audio. Prueba de nuevo con Play.', 'Audio could not be started. Try again with Play.');
    });
  }
  for (let midi = 127; midi >= 0; midi--) {
    const key = document.createElement('button');
    key.type = 'button';
    key.className = 'piano-key' + ([1, 3, 6, 8, 10].includes(midi % 12) ? ' is-black' : '');
    key.textContent = midi % 12 === 0 ? midiToNoteName(midi) : '';
    key.setAttribute('aria-label', l('Escuchar ', 'Audition ') + midiToNoteName(midi));
    key.title = midiToNoteName(midi);
    key.addEventListener('pointerdown', (event) => {
      if (event.button === 0) audition(midi);
    });
    key.addEventListener('click', (event) => {
      if (event.detail === 0) audition(midi);
    });
    keys.append(key);
  }

  function paint(button: HTMLElement, value: Pick<MidiNote, 'midi' | 'startBeat' | 'durationBeats'>) {
    button.style.left = value.startBeat * pixels() + 'px';
    button.style.top = (127 - value.midi) * ROW_HEIGHT + 'px';
    button.style.width = value.durationBeats * pixels() + 'px';
  }
  function properties() {
    const current = note();
    panel.querySelector('[data-note-label]')!.textContent = current ? midiToNoteName(current.midi) : l('Selecciona una nota', 'Select a note');
    for (const input of form.querySelectorAll<HTMLInputElement>('input')) {
      input.disabled = !current;
      input.value = current ? String(current[input.name as keyof MidiNote]) : '';
    }
    for (const button of form.querySelectorAll<HTMLButtonElement>('button')) button.disabled = !current;
  }
  function render() {
    const current = clip();
    if (panel.hidden || !current) return;
    panel.querySelector('[data-title]')!.textContent = current.name;
    visibleClipStart = current.startBeat;
    visibleClipLength = current.lengthBeats;
    canvas.style.width = 64 + current.lengthBeats * pixels() + 'px';
    grid.style.width = current.lengthBeats * pixels() + 'px';
    grid.style.setProperty('--snap-width', snap() * pixels() + 'px');
    grid.style.setProperty('--beat-width', pixels() + 'px');
    grid.replaceChildren();
    const ruler = document.createElement('div');
    ruler.className = 'piano-ruler';
    for (let beat = 0; beat < current.lengthBeats; beat++) {
      const label = document.createElement('span');
      label.style.width = pixels() + 'px';
      label.textContent = String(beat + 1);
      ruler.append(label);
    }
    ruler.style.width = 64 + current.lengthBeats * pixels() + 'px';
    ruler.style.paddingLeft = '64px';
    scroll.querySelector('.piano-ruler')?.remove();
    scroll.prepend(ruler);
    for (const item of current.notes) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'piano-note' + (item.id === noteId ? ' is-selected' : '');
      button.dataset.noteId = item.id;
      button.setAttribute('aria-label', l(`${midiToNoteName(item.midi)}, inicio ${item.startBeat}, duración ${item.durationBeats}`, `${midiToNoteName(item.midi)}, start ${item.startBeat}, duration ${item.durationBeats}`));
      button.setAttribute('aria-pressed', String(item.id === noteId));
      button.textContent = midiToNoteName(item.midi);
      const handle = document.createElement('span');
      handle.className = 'note-resize';
      handle.dataset.resize = '';
      handle.setAttribute('aria-hidden', 'true');
      button.append(handle);
      paint(button, item);
      grid.append(button);
    }
    const playhead = document.createElement('div');
    playhead.className = 'piano-playhead';
    playhead.hidden = true;
    grid.append(playhead);
    properties();
  }
  function focusNote() {
    const button = Array.from(grid.querySelectorAll<HTMLElement>('[data-note-id]')).find((item) => item.dataset.noteId === noteId);
    (button ?? grid).focus({ preventScroll: true });
  }
  function select(id: string) {
    noteId = id;
    for (const button of grid.querySelectorAll<HTMLElement>('[data-note-id]')) {
      button.classList.toggle('is-selected', button.dataset.noteId === id);
      button.setAttribute('aria-pressed', String(button.dataset.noteId === id));
    }
    properties();
  }
  function remove() {
    if (!noteId || !note()) return;
    store.removeNote(trackId, clipId, noteId);
    noteId = null;
    render();
    grid.focus();
  }
  function commit(patch: Partial<MidiNote>) {
    if (!noteId) return;
    try {
      store.updateNote(trackId, clipId, noteId, patch);
      message.textContent = l('Nota actualizada. Pulsa Play para escuchar el arreglo.', 'Note updated. Press Play to hear the arrangement.');
    } catch (error) {
      message.textContent = error instanceof Error ? error.message : l('Valores no válidos.', 'Invalid values.');
      properties();
    }
  }
  function add(values = { midi: 60, startBeat: 0, durationBeats: Math.min(snap(), clip()?.lengthBeats ?? snap()), velocity: 0.8 }) {
    if (!clip()) return;
    const created = store.addNote(trackId, clipId, values);
    noteId = created.id;
    render();
    focusNote();
    audition(created.midi, created.velocity);
  }
  function cancelGesture() {
    if (!gesture) return;
    const old = gesture;
    gesture = null;
    paint(old.button, old.note);
    if (grid.hasPointerCapture(old.pointer)) grid.releasePointerCapture(old.pointer);
  }
  grid.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || gesture) return;
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLElement>('[data-note-id]');
    if (!button) {
      if (tool.value !== 'draw') return;
      const bounds = grid.getBoundingClientRect();
      add(drawNote(event.clientX - bounds.left, event.clientY - bounds.top, pixels(), snap(), clip()!.lengthBeats));
      return;
    }
    select(button.dataset.noteId!);
    if (tool.value === 'erase') { remove(); return; }
    const current = note()!;
    audition(current.midi, current.velocity);
    gesture = { pointer: event.pointerId, x: event.clientX, y: event.clientY, note: current,
      resize: !!target.closest('[data-resize]'), button, patch: current, moved: false };
    grid.setPointerCapture(event.pointerId);
    button.focus({ preventScroll: true });
    event.preventDefault();
  });
  grid.addEventListener('pointermove', (event) => {
    if (!gesture || gesture.pointer !== event.pointerId) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (!gesture.moved && Math.hypot(dx, dy) < 4) return;
    gesture.moved = true;
    const previousMidi = gesture.patch.midi;
    gesture.patch = dragNote(gesture.note, dx, dy, pixels(), snap(), clip()!.lengthBeats, gesture.resize);
    paint(gesture.button, gesture.patch);
    if (!gesture.resize && gesture.patch.midi !== previousMidi) {
      audition(gesture.patch.midi, gesture.note.velocity);
    }
  });
  grid.addEventListener('pointerup', (event) => {
    if (!gesture || gesture.pointer !== event.pointerId) return;
    const old = gesture;
    cancelGesture();
    if (old.moved) commit(old.patch);
    focusNote();
  });
  grid.addEventListener('pointercancel', cancelGesture);
  grid.addEventListener('lostpointercapture', cancelGesture);
  window.addEventListener('blur', cancelGesture);
  grid.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-note-id]');
    if (button?.dataset.noteId) {
      select(button.dataset.noteId);
      if (event.detail === 0) {
        const current = note();
        if (current) audition(current.midi, current.velocity);
      }
    }
  });
  grid.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { cancelGesture(); return; }
    if (gesture) return;
    const current = note();
    if (!current) return;
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault(); remove(); return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    commit(dragNote(current,
      event.key === 'ArrowLeft' ? -snap() * pixels() : event.key === 'ArrowRight' ? snap() * pixels() : 0,
      event.key === 'ArrowUp' ? -ROW_HEIGHT : event.key === 'ArrowDown' ? ROW_HEIGHT : 0,
      pixels(), snap(), clip()!.lengthBeats, false));
    focusNote();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = Object.fromEntries(Array.from(form.querySelectorAll<HTMLInputElement>('input')).map((input) => [input.name, input.valueAsNumber]));
    commit(values);
  });
  panel.querySelector('[data-delete]')!.addEventListener('click', remove);
  panel.querySelector('[data-add]')!.addEventListener('click', () => add());
  panel.querySelector('[data-help]')!.addEventListener('click', () => {
    document.querySelector<HTMLButtonElement>('[data-action="help"]')?.click();
  });
  function setExpanded(expanded: boolean) {
    panel.classList.toggle('is-expanded', expanded);
    expandButton.setAttribute('aria-pressed', String(expanded));
    expandButton.textContent = expanded ? `↙ ${l('Restaurar', 'Restore')}` : `⛶ ${l('Ampliar', 'Expand')}`;
    expandButton.setAttribute('aria-label', expanded
      ? l('Restaurar Piano Roll acoplado', 'Restore docked Piano Roll')
      : l('Ampliar Piano Roll', 'Expand Piano Roll'));
  }
  expandButton.addEventListener('click', () => setExpanded(!panel.classList.contains('is-expanded')));
  function closePanel() {
    cancelGesture();
    setExpanded(false);
    panel.hidden = true;
    host.classList.remove('has-piano-roll');
    onClose();
  }
  panel.querySelector('[data-close]')!.addEventListener('click', closePanel);
  snapInput.addEventListener('change', render);
  zoom.addEventListener('change', render);
  store.subscribe(() => {
    cancelGesture();
    if (!panel.hidden && !clip()) closePanel();
    else render();
  });
  return {
    open(nextTrack: string, nextClip: string) {
      cancelGesture(); trackId = nextTrack; clipId = nextClip; noteId = null;
      if (!clip()) return;
      host.classList.add('has-piano-roll');
      panel.hidden = false; render();
      const pitch = clip()!.notes[0]?.midi ?? 60;
      scroll.scrollTop = Math.max(0, (127 - pitch) * ROW_HEIGHT - scroll.clientHeight / 2);
      scroll.scrollLeft = 0;
      grid.focus({ preventScroll: true });
    },
    close: closePanel,
    isOpen: () => !panel.hidden,
    focus: () => grid.focus({ preventScroll: true }),
    playhead(absoluteBeat: number, playing: boolean) {
      if (panel.hidden) return;
      const line = grid.querySelector<HTMLElement>('.piano-playhead');
      if (!line) return;
      const relative = absoluteBeat - visibleClipStart;
      line.hidden = !playing || relative < 0 || relative >= visibleClipLength;
      line.style.left = relative * pixels() + 'px';
    },
  };
}
