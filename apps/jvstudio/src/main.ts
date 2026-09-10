import './styles.css';

import { AudioEngine, type AudioState } from './audio/AudioEngine';
import { renderProjectWav } from './audio/exportWav';
import { formatDecibels, gainToFaderDb } from './audio/gain';
import { initializeInstrumentCatalog, instruments, instrumentPlayableRange, onInstrumentLoadProgress, resolveInstrument } from './audio/instruments';
import { l } from './i18n';
import { demoProject } from './project/demoProject';
import { barsToBeats, beatsPerBar, MAX_PROJECT_BARS, midiToNoteName, minimumProjectLengthBars, normalizeBpm, projectFileName, ProjectStore, wavFileName } from './project';
import { clipStartFromPointer, findFirstAvailableClipStart, isClipRangeAvailable } from './ui/arranger/clipPlacement';
import { installClipEditing } from './ui/arranger/clipEditing';
import { arrangerBarWidth, arrangerLaneWidth, arrangerRulerStep, isArrangerZoom, type ArrangerZoom } from './ui/arranger/arrangerZoom';
import { installHelp } from './ui/help/HelpDialog';
import { installResizableSeparator } from './ui/layout/resizablePanels';
import { installMixerView, MIXER_MIN_PANEL_HEIGHT } from './ui/mixer/MixerView';
import { installPianoRoll } from './ui/piano-roll/PianoRoll';
import { showSessionNotice } from './ui/project/SessionNotice';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('JV Studio root element was not found.');

try {
  await initializeInstrumentCatalog();
} catch (error) {
  const detail = error instanceof Error ? error.message : 'Unknown instrument library error.';
  app.innerHTML = `<main class="studio-shell"><section class="session-notice"><h1>JV Studio</h1><p>${escapeHtml(detail)}</p></section></main>`;
  throw error;
}

const store = new ProjectStore(demoProject);
let selectedTrackId = demoProject.tracks[0].id;
let selectedClipId: string | null = demoProject.tracks[0].clips[0].id;
let activeView: 'arranger' | 'piano-roll' | 'mixer' = 'arranger';

app.innerHTML = `
  <main class="studio-shell">
    <header class="topbar">
      <a class="brand" href="/" aria-label="${l('Volver a josicovila.com', 'Back to josicovila.com')}">
        <img class="brand-logo" src="${import.meta.env.BASE_URL}logo.png" alt="JV Studio · Make music anywhere" />
      </a>

      <label class="project-field">
        <span>${l('Proyecto', 'Project')}</span>
        <input data-project-name aria-label="${l('Nombre del proyecto', 'Project name')}" readonly />
      </label>

      <div class="transport" aria-label="${l('Transporte', 'Transport')}">
        <button class="transport-button stop-button" type="button" data-action="stop" aria-label="${l('Detener reproducción', 'Stop playback')}">
          <span aria-hidden="true">■</span>
        </button>
        <button class="transport-button play-button" type="button" data-action="play" aria-label="${l('Iniciar reproducción', 'Start playback')}">
          <span aria-hidden="true">▶</span>
        </button>
        <button class="transport-button pause-button" type="button" data-action="pause" aria-label="${l('Pausar reproducción', 'Pause playback')}" title="${l('Pausa · Espacio', 'Pause · Space')}">
          <span aria-hidden="true">Ⅱ</span>
        </button>
        <span class="transport-status" data-status>${l('Listo', 'Ready')}</span>
      </div>

      <label class="tempo-field">
        <input type="number" min="40" max="240" step="1" data-bpm aria-label="${l('Tempo en pulsaciones por minuto', 'Tempo in beats per minute')}" />
        <span>BPM</span>
      </label>

      <div class="signature" aria-label="${l('Compás', 'Time signature')}">
        <strong data-signature></strong>
        <span>${l('Compás', 'Meter')}</span>
      </div>

      <div class="future-actions" aria-label="${l('Acciones de proyecto', 'Project actions')}">
        <button type="button" data-action="open-project">${l('Abrir', 'Open')}</button>
        <button type="button" data-action="save-project">${l('Guardar', 'Save')}</button>
        <button type="button" data-action="export-wav">${l('Exportar WAV', 'Export WAV')}</button>
        <button class="top-help" type="button" data-action="help" aria-label="${l('Ayuda: guía y atajos', 'Help: guide and shortcuts')}">? ${l('Ayuda', 'Help')}</button>
      </div>
      <div class="instrument-load" data-instrument-load hidden role="status" aria-live="polite">
        <span data-instrument-load-label></span>
        <progress data-instrument-load-progress max="100" value="0"></progress>
      </div>
    </header>

    <section class="workspace" aria-label="${l('Espacio de trabajo de JV Studio', 'JV Studio workspace')}">
      <aside class="track-column">
        <div class="panel-heading">
          <span>${l('PISTAS', 'TRACKS')}</span>
          <button type="button" data-action="add-track" aria-label="${l('Añadir pista', 'Add track')}" title="${l('Añadir pista', 'Add track')}">＋</button>
        </div>
        <div class="track-list" data-track-list></div>
        <div class="inspector" data-inspector></div>
      </aside>

      <div class="workspace-divider" data-workspace-divider role="separator" tabindex="0" aria-label="${l('Cambiar ancho de pistas y Arranger', 'Resize tracks and Arranger')}"><span></span></div>

      <section class="arranger-panel">
        <div class="arranger-header">
          <div class="arranger-heading">
            <div class="view-switch" aria-label="${l('Panel activo', 'Active panel')}">
              <button class="is-active" type="button" data-view="arranger" aria-pressed="true">ARRANGER</button>
              <button type="button" data-view="piano-roll" data-action="piano-roll" aria-pressed="false">PIANO ROLL</button>
              <button type="button" data-view="mixer" aria-pressed="false">MIXER</button>
            </div>
            <strong>${l('Línea de tiempo del proyecto', 'Project timeline')}</strong>
          </div>
          <div class="arranger-tools">
            <label class="project-length-control" title="${l('Duración del proyecto: 1–1024 compases', 'Project length: 1–1024 bars')}">
              <span>${l('COMPASES', 'BARS')}</span>
              <input type="number" min="1" max="1024" step="1" data-project-length aria-label="${l('Duración del proyecto en compases', 'Project length in bars')}" />
            </label>
            <label class="arranger-zoom-control">
              <span>ZOOM</span>
              <select data-arranger-zoom aria-label="${l('Zoom del Arranger', 'Arranger zoom')}">
                <option value="fit">${l('Ajustar', 'Fit project')}</option>
                <option value="12">25%</option>
                <option value="24">50%</option>
                <option value="48">100%</option>
                <option value="96">200%</option>
                <option value="192">400%</option>
              </select>
            </label>
            <span class="range-copy" data-range></span>
            <button type="button" data-action="add-clip">＋ ${l('Nuevo clip', 'New clip')}</button>
            <button type="button" data-action="duplicate-clip" title="Ctrl+D">${l('Duplicar', 'Duplicate')}</button>
            <button type="button" data-action="delete-clip" title="${l('Supr', 'Delete')}">${l('Borrar', 'Delete')}</button>
          </div>
        </div>

        <div class="timeline-shell" aria-hidden="true"><span></span><div class="timeline-viewport"><div class="timeline" data-timeline></div></div></div>
        <div class="arrangement" data-arrangement tabindex="0" aria-label="${l('Arranger. Las flechas mueven clips; Ctrl+D duplica; Supr borra; Escape cancela el arrastre.', 'Arranger. Arrow keys move clips; Ctrl+D duplicates; Delete removes; Escape cancels drag.')}"></div>

        <footer class="milestone-note">
          <span class="pulse-dot" aria-hidden="true"></span>
          <div role="status" aria-live="polite"><strong data-selection-title>${l('Arranger preparado', 'Arranger ready')}</strong><p data-selection-copy>${l('Selecciona una pista o clip. Haz doble clic en un hueco para crear un clip de un compás.', 'Select a track or clip. Double-click an empty lane to create a one-bar clip.')}</p></div>
        </footer>

        <section class="mixer-panel" data-mixer-panel hidden aria-label="${l('Mezclador del proyecto', 'Project mixer')}">
          <div class="mixer-divider" data-mixer-divider role="separator" tabindex="0" aria-label="${l('Cambiar altura de Arranger y Mixer', 'Resize Arranger and Mixer')}"><span></span></div>
          <div class="mixer-content" data-mixer-content></div>
        </section>
      </section>
    </section>

    <section class="mobile-notice">
      <strong>${l('JV Studio necesita una pantalla más grande.', 'JV Studio needs a larger screen.')}</strong>
      <p>${l('Esta primera versión está diseñada para navegadores de escritorio.', 'This first version is designed for desktop browsers.')}</p>
    </section>
    <input type="file" accept=".json,.jvstudio.json,application/json" data-project-file hidden />
  </main>
`;

const projectNameInput = document.querySelector<HTMLInputElement>('[data-project-name]');
const helpButton = document.querySelector<HTMLButtonElement>('[data-action="help"]');
if (helpButton) installHelp(helpButton);
const playButton = document.querySelector<HTMLButtonElement>('[data-action="play"]');
const pauseButton = document.querySelector<HTMLButtonElement>('[data-action="pause"]');
const stopButton = document.querySelector<HTMLButtonElement>('[data-action="stop"]');
const openProjectButton = document.querySelector<HTMLButtonElement>('[data-action="open-project"]');
const saveProjectButton = document.querySelector<HTMLButtonElement>('[data-action="save-project"]');
const exportWavButton = document.querySelector<HTMLButtonElement>('[data-action="export-wav"]');
const projectFileInput = document.querySelector<HTMLInputElement>('[data-project-file]');
const bpmInput = document.querySelector<HTMLInputElement>('[data-bpm]');
const projectLengthInput = document.querySelector<HTMLInputElement>('[data-project-length]');
const arrangerZoomInput = document.querySelector<HTMLSelectElement>('[data-arranger-zoom]');
const signatureLabel = document.querySelector<HTMLElement>('[data-signature]');
const statusLabel = document.querySelector<HTMLElement>('[data-status]');
const instrumentLoad = document.querySelector<HTMLElement>('[data-instrument-load]');
const instrumentLoadLabel = document.querySelector<HTMLElement>('[data-instrument-load-label]');
const instrumentLoadProgress = document.querySelector<HTMLProgressElement>('[data-instrument-load-progress]');
const trackList = document.querySelector<HTMLElement>('[data-track-list]');
const inspector = document.querySelector<HTMLElement>('[data-inspector]');
const timeline = document.querySelector<HTMLElement>('[data-timeline]');
const arrangement = document.querySelector<HTMLElement>('[data-arrangement]');
const rangeLabel = document.querySelector<HTMLElement>('[data-range]');
const selectionTitle = document.querySelector<HTMLElement>('[data-selection-title]');
const selectionCopy = document.querySelector<HTMLElement>('[data-selection-copy]');
const arrangerPanel = document.querySelector<HTMLElement>('.arranger-panel');
const mixerPanel = document.querySelector<HTMLElement>('[data-mixer-panel]');
const mixerContent = document.querySelector<HTMLElement>('[data-mixer-content]');
const mixerDivider = document.querySelector<HTMLElement>('[data-mixer-divider]');
const workspace = document.querySelector<HTMLElement>('.workspace');
const workspaceDivider = document.querySelector<HTMLElement>('[data-workspace-divider]');
let arrangerZoom: ArrangerZoom = 'fit';
let hasUnsavedChanges = false;
let instrumentLoadHideTimer = 0;
let lastMeterPaint = 0;

onInstrumentLoadProgress((progress) => {
  if (!instrumentLoad || !instrumentLoadLabel || !instrumentLoadProgress) return;
  const percent = progress.totalBytes > 0 ? Math.round((progress.loadedBytes / progress.totalBytes) * 100) : 0;
  instrumentLoad.hidden = false;
  instrumentLoad.dataset.error = progress.error ? 'true' : 'false';
  instrumentLoadLabel.textContent = progress.error
    ? l(`No se pudo cargar ${progress.instrumentName}`, `Could not load ${progress.instrumentName}`)
    : l(`Cargando ${progress.instrumentName} · ${percent}%`, `Loading ${progress.instrumentName} · ${percent}%`);
  instrumentLoadProgress.value = percent;
  window.clearTimeout(instrumentLoadHideTimer);
  if (!progress.active) instrumentLoadHideTimer = window.setTimeout(() => { instrumentLoad.hidden = true; }, progress.error ? 4000 : 550);
});

if (workspace && workspaceDivider) installResizableSeparator({
  element: workspaceDivider,
  orientation: 'vertical',
  getSize: () => document.querySelector<HTMLElement>('.track-column')?.getBoundingClientRect().width ?? 300,
  setSize: (pixels) => workspace.style.setProperty('--track-column-width', `${pixels}px`),
  limits: () => ({ min: 230, max: Math.max(230, Math.min(480, workspace.clientWidth - 500)) }),
  storageKey: 'jvstudio:track-column-width',
});

const initialSnapshot = store.getSnapshot();
const audioEngine = new AudioEngine(initialSnapshot);
const mixerView = mixerContent ? installMixerView(mixerContent, store, {
  instrumentName,
  isExpanded: () => mixerPanel?.classList.contains('is-expanded') ?? false,
  onToggleExpanded: () => mixerPanel?.classList.toggle('is-expanded'),
  selectedTrackId: () => selectedTrackId,
  onSelectTrack: (trackId) => {
    selectedTrackId = trackId;
    selectedClipId = null;
    render();
  },
}) : null;
if (arrangerPanel && mixerPanel && mixerDivider) installResizableSeparator({
  element: mixerDivider,
  orientation: 'horizontal',
  getSize: () => mixerPanel.getBoundingClientRect().height,
  setSize: (pixels) => arrangerPanel.style.setProperty('--mixer-height', `${pixels}px`),
  limits: () => ({
    min: MIXER_MIN_PANEL_HEIGHT,
    max: Math.max(MIXER_MIN_PANEL_HEIGHT, arrangerPanel.clientHeight - 334),
  }),
  storageKey: 'jvstudio:mixer-height',
  step: 32,
});
let projectLengthBeats = barsToBeats(initialSnapshot.lengthBars, initialSnapshot.timeSignature);
const pianoRoll = installPianoRoll(store, () => {
  setActiveView('arranger');
  document.querySelector<HTMLButtonElement>('[data-view="arranger"]')?.focus();
}, async (trackId, midi, velocity) => {
  await audioEngine.previewNote(trackId, midi, velocity);
}, async (trackId) => {
  const track = store.getSnapshot().tracks.find((item) => item.id === trackId);
  return instrumentPlayableRange(track?.instrumentId ?? instruments[0].id);
});
const trackColors = ['#11b9f2', '#39dfa0', '#ff8a3d', '#8b5cf6', '#f45f9a', '#f5c84b'];

function render(): void {
  const previousScrollLeft = arrangement?.scrollLeft ?? 0;
  const project = store.getSnapshot();
  const barLength = beatsPerBar(project.timeSignature);
  const projectBeats = barsToBeats(project.lengthBars, project.timeSignature);
  const selectedTrack = project.tracks.find((track) => track.id === selectedTrackId) ?? project.tracks[0];
  if (selectedTrack && selectedTrack.id !== selectedTrackId) selectedTrackId = selectedTrack.id;
  const selectedClip = selectedTrack?.clips.find((clip) => clip.id === selectedClipId) ?? null;
  if (!selectedClip) selectedClipId = null;
  for (const action of ['duplicate-clip', 'delete-clip', 'piano-roll']) {
    const button = document.querySelector<HTMLButtonElement>(`[data-action="${action}"]`);
    if (button) button.disabled = !selectedClip;
  }

  if (projectNameInput) projectNameInput.value = project.name;
  if (bpmInput && document.activeElement !== bpmInput) bpmInput.value = String(project.bpm);
  if (projectLengthInput && document.activeElement !== projectLengthInput) projectLengthInput.value = String(project.lengthBars);
  if (signatureLabel) signatureLabel.textContent = project.timeSignature.join('/');
  if (rangeLabel) rangeLabel.textContent = l('Ajuste 1 compás', 'Snap 1 bar');

  if (timeline) {
    timeline.style.setProperty('--bars', String(project.lengthBars));
    timeline.innerHTML = Array.from({ length: project.lengthBars }, (_, index) => `<span data-bar="${index + 1}"></span>`).join('');
  }

  if (trackList) {
    trackList.innerHTML = project.tracks
      .map(
        (track, index) => `
          <article class="track-card ${track.id === selectedTrackId ? 'is-selected' : ''}">
            <button class="track-select" type="button" data-track-id="${escapeHtml(track.id)}" aria-pressed="${track.id === selectedTrackId}">
              <span class="track-number">${String(index + 1).padStart(2, '0')}</span>
              <span class="track-color" style="--track-color:${track.color}" aria-hidden="true"></span>
              <span class="track-copy"><strong>${escapeHtml(track.name)}</strong><small>${escapeHtml(instrumentName(track.instrumentId))}</small></span>
            </button>
            <button class="track-toggle ${track.muted ? 'is-active' : ''}" type="button" data-track-toggle="muted" data-track-id="${escapeHtml(track.id)}" aria-label="${l('Silenciar', 'Mute')} ${escapeHtml(track.name)}" aria-pressed="${track.muted}">M</button>
            <button class="track-toggle ${track.solo ? 'is-active is-solo' : ''}" type="button" data-track-toggle="solo" data-track-id="${escapeHtml(track.id)}" aria-label="Solo ${escapeHtml(track.name)}" aria-pressed="${track.solo}">S</button>
          </article>
        `,
      )
      .join('');
  }

  if (arrangement) {
    arrangement.style.setProperty('--bars', String(project.lengthBars));
    arrangement.innerHTML = `
      <div class="playhead" data-playhead></div>
      ${project.tracks
        .map(
          (track) => `
            <div class="arranger-row ${track.id === selectedTrackId ? 'is-selected' : ''}">
              <button class="arranger-track-label" type="button" data-track-id="${escapeHtml(track.id)}">
                <span style="--track-color:${track.color}"></span>${escapeHtml(track.name)}
              </button>
              <div class="lane-content" data-lane-track-id="${escapeHtml(track.id)}" title="${l('Doble clic para crear un clip', 'Double-click to create a clip')}">
                ${track.clips
                  .map((clip) => {
                    const left = (clip.startBeat / projectBeats) * 100;
                    const width = (clip.lengthBeats / projectBeats) * 100;
                    return `
                      <button
                        class="clip ${clip.id === selectedClipId ? 'is-selected' : ''}"
                        type="button"
                        data-track-id="${escapeHtml(track.id)}"
                        data-clip-id="${escapeHtml(clip.id)}"
                        style="--clip-left:${left}%; --clip-width:${width}%; --track-color:${track.color}"
                        aria-pressed="${clip.id === selectedClipId}"
                      >
                        <span class="clip-title"><strong>${escapeHtml(clip.name)}</strong><em>${formatBars(clip.lengthBeats, barLength)}</em></span>
                        <span class="clip-notes">
                          ${clip.notes.length > 0
                            ? clip.notes
                                .map(
                                  (note) =>
                                    `<i title="${midiToNoteName(note.midi)}" style="--note-left:${(note.startBeat / clip.lengthBeats) * 100}%; --note-width:${Math.max(3, (note.durationBeats / clip.lengthBeats) * 100)}%; --pitch:${Math.floor(note.midi / 12) - 1}"></i>`,
                                )
                                .join('')
                            : `<span class="empty-clip">${l('Clip MIDI vacío', 'Empty MIDI clip')}</span>`}
                        </span>
                        <span class="clip-resize-handle" data-clip-resize aria-hidden="true"></span>
                      </button>
                    `;
                  })
                  .join('')}
              </div>
            </div>
          `,
        )
        .join('')}
    `;
    syncArrangerScale(project.lengthBars);
    arrangement.scrollLeft = Math.min(previousScrollLeft, Math.max(0, arrangement.scrollWidth - arrangement.clientWidth));
    syncArrangerRulerScroll();
  }

  renderInspector(selectedTrack, selectedClip);
  renderSelectionSummary(selectedTrack, selectedClip);
  mixerView?.render(project, selectedTrackId);
  syncViewState();
}

function syncArrangerScale(bars = store.getSnapshot().lengthBars): void {
  if (!arrangement || !arrangerPanel) return;
  const laneWidth = arrangerLaneWidth(arrangerZoom, arrangement.clientWidth, bars);
  const barWidth = arrangerBarWidth(arrangerZoom, arrangement.clientWidth, bars);
  arrangerPanel.style.setProperty('--arranger-lane-width', `${laneWidth}px`);
  const rulerStep = arrangerRulerStep(barWidth);
  for (const marker of timeline?.querySelectorAll<HTMLElement>('[data-bar]') ?? []) {
    const bar = Number(marker.dataset.bar);
    marker.textContent = bar === 1 || (bar - 1) % rulerStep === 0 ? String(bar) : '';
  }
}

function syncArrangerRulerScroll(): void {
  if (!timeline || !arrangement) return;
  timeline.style.transform = `translateX(${-arrangement.scrollLeft}px)`;
}

function renderInspector(
  track: ReturnType<ProjectStore['getSnapshot']>['tracks'][number] | undefined,
  clip: ReturnType<ProjectStore['getSnapshot']>['tracks'][number]['clips'][number] | null,
): void {
  if (!inspector) return;
  if (!track) {
    inspector.innerHTML = l(
      '<p class="eyebrow">PROYECTO</p><strong>Aún no hay pistas</strong><p>Añade una pista para empezar a componer.</p>',
      '<p class="eyebrow">PROJECT</p><strong>No tracks yet</strong><p>Add a track to begin arranging.</p>',
    );
    return;
  }

  const preset = resolveInstrument(track.instrumentId);
  inspector.innerHTML = `
    <p class="eyebrow">${l('MEZCLADOR DE PISTA', 'TRACK MIXER')}</p>
    <label class="name-field">
      <span>${l('Nombre de pista', 'Track name')}</span>
      <input type="text" maxlength="120" value="${escapeHtml(track.name)}" data-name="track" data-track-id="${escapeHtml(track.id)}" />
    </label>
    <label class="mix-field">
      <span>${l('Instrumento', 'Instrument')}</span>
      <select data-mix="instrumentId" data-track-id="${escapeHtml(track.id)}">
        ${instruments.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === preset.id ? 'selected' : ''}>${escapeHtml(l(item.nameEs, item.nameEn))}</option>`).join('')}
      </select>
    </label>
    <p class="instrument-description">${escapeHtml(l(preset.descriptionEs, preset.descriptionEn))}</p>
    <label class="mix-field mix-range">
      <span>${l('Volumen', 'Volume')}</span>
      <input type="range" min="0" max="2" step="0.01" value="${track.volume}" data-mix="volume" data-track-id="${escapeHtml(track.id)}" />
      <output data-mix-output="volume">${formatDecibels(gainToFaderDb(track.volume))}</output>
    </label>
    <label class="mix-field mix-range">
      <span>${l('Panorámica', 'Pan')}</span>
      <input type="range" min="-1" max="1" step="0.01" value="${track.pan}" data-mix="pan" data-track-id="${escapeHtml(track.id)}" />
      <output data-mix-output="pan">${formatPan(track.pan)}</output>
    </label>
    <div class="mix-buttons" aria-label="${l('Silencio y Solo de', 'Mute and Solo for')} ${escapeHtml(track.name)}">
      <button class="${track.muted ? 'is-active' : ''}" type="button" data-mix-toggle="muted" data-track-id="${escapeHtml(track.id)}" aria-pressed="${track.muted}">${l('SILENCIO', 'MUTE')}</button>
      <button class="${track.solo ? 'is-active is-solo' : ''}" type="button" data-mix-toggle="solo" data-track-id="${escapeHtml(track.id)}" aria-pressed="${track.solo}">SOLO</button>
    </div>
    <button class="delete-track-button" type="button" data-delete-track data-track-id="${escapeHtml(track.id)}">${l('Eliminar pista', 'Delete track')}</button>
    ${clip ? `
      <p class="eyebrow clip-properties-title">${l('CLIP SELECCIONADO', 'SELECTED CLIP')}</p>
      <label class="name-field">
        <span>${l('Nombre del clip', 'Clip name')}</span>
        <input type="text" maxlength="120" value="${escapeHtml(clip.name)}" data-name="clip" data-track-id="${escapeHtml(track.id)}" data-clip-id="${escapeHtml(clip.id)}" />
      </label>
      <dl class="property-grid">
        <div><dt>${l('Inicio', 'Start')}</dt><dd>${clip.startBeat + 1} ${l('pulso', 'beat')}</dd></div>
        <div><dt>${l('Duración', 'Length')}</dt><dd>${clip.lengthBeats} ${l('pulsos', 'beats')}</dd></div>
        <div><dt>${l('Notas', 'Notes')}</dt><dd>${clip.notes.length}</dd></div>
        <div><dt>${l('Pista', 'Track')}</dt><dd>${escapeHtml(track.name)}</dd></div>
      </dl>
    ` : `<div class="signal-row"><span>${l('Motor de audio', 'Audio engine')}</span><span class="signal-dot"></span><b data-engine-label>${l('Preparado', 'Ready')}</b></div>`}
  `;
}

function renderSelectionSummary(
  track: ReturnType<ProjectStore['getSnapshot']>['tracks'][number] | undefined,
  clip: ReturnType<ProjectStore['getSnapshot']>['tracks'][number]['clips'][number] | null,
): void {
  if (!selectionTitle || !selectionCopy) return;
  if (clip && track) {
    selectionTitle.textContent = clip.name;
    selectionCopy.textContent = l(
      `${track.name} · comienza en el pulso ${clip.startBeat + 1} · ${clip.lengthBeats} pulsos · ${clip.notes.length} notas`,
      `${track.name} · starts at beat ${clip.startBeat + 1} · ${clip.lengthBeats} beats · ${clip.notes.length} notes`,
    );
  } else if (track) {
    selectionTitle.textContent = track.name;
    selectionCopy.textContent = l('Pista seleccionada. Crea un clip de un compás con la barra o haciendo doble clic en un hueco.', 'Selected track. Create a one-bar clip with the toolbar or by double-clicking the lane.');
  } else {
    selectionTitle.textContent = l('Proyecto vacío', 'Empty project');
    selectionCopy.textContent = l('Añade una pista para empezar a componer.', 'Add a track to begin arranging.');
  }
}

function selectTrack(trackId: string): void {
  selectedTrackId = trackId;
  selectedClipId = null;
  if (pianoRoll.isOpen()) pianoRoll.close();
  render();
}

function selectClip(trackId: string, clipId: string): void {
  selectedTrackId = trackId;
  selectedClipId = clipId;
  render();
  if (pianoRoll.isOpen()) pianoRoll.open(trackId, clipId);
}

function addTrack(): void {
  const snapshot = store.getSnapshot();
  const number = snapshot.tracks.length + 1;
  const track = store.addTrack({
    name: l(`Pista ${number}`, `Track ${number}`),
    instrumentId: instruments[0].id,
    color: trackColors[(number - 1) % trackColors.length],
  });
  selectedTrackId = track.id;
  selectedClipId = null;
  setUiMessage(l('Pista creada', 'Track created'), l(`${track.name} está preparada para clips MIDI.`, `${track.name} is ready for MIDI clips.`));
}

function deleteTrack(trackId: string): void {
  const project = store.getSnapshot();
  const trackIndex = project.tracks.findIndex((track) => track.id === trackId);
  const track = project.tracks[trackIndex];
  if (!track) return;
  const confirmed = window.confirm(l(
    `¿Eliminar la pista "${track.name}"?\n\nSe perderán todos sus clips, notas, ajustes de mezcla y efectos. Esta acción no se puede deshacer.`,
    `Delete track "${track.name}"?\n\nAll its clips, notes, mix settings and effects will be lost. This action cannot be undone.`,
  ));
  if (!confirmed) return;

  if (pianoRoll.isOpen()) pianoRoll.close();
  const fallbackTrack = project.tracks[trackIndex + 1] ?? project.tracks[trackIndex - 1];
  selectedTrackId = fallbackTrack?.id ?? '';
  selectedClipId = null;
  store.removeTrack(trackId);
  setUiMessage(
    l('Pista eliminada', 'Track deleted'),
    fallbackTrack
      ? l(`${track.name} y todo su contenido se han eliminado.`, `${track.name} and all its contents were deleted.`)
      : l('El proyecto se ha quedado sin pistas. Pulsa ＋ para añadir otra.', 'The project has no tracks. Press ＋ to add another one.'),
  );
}

function addClipAtFirstAvailableBar(): void {
  const project = store.getSnapshot();
  const track = project.tracks.find((candidate) => candidate.id === selectedTrackId);
  if (!track) {
    setUiMessage(l('Selecciona una pista', 'Select a track'), l('El clip necesita una pista de destino.', 'A clip needs a destination track.'));
    return;
  }
  const barLength = beatsPerBar(project.timeSignature);
  const projectBeats = barsToBeats(project.lengthBars, project.timeSignature);
  const availableStart = findFirstAvailableClipStart(track, barLength, projectBeats, barLength);
  const startBeat = availableStart ?? (project.lengthBars < MAX_PROJECT_BARS ? projectBeats : null);
  if (startBeat === null) {
    setUiMessage(l('No hay compases libres', 'No free bar'), l('Esta pista no tiene un hueco libre de un compás dentro del proyecto.', 'This track has no empty one-bar slot in the current project range.'));
    return;
  }
  createClip(track.id, startBeat, barLength);
}

function createClip(trackId: string, startBeat: number, lengthBeats: number): void {
  const track = store.getSnapshot().tracks.find((candidate) => candidate.id === trackId);
  if (!track) return;
  const clip = store.addClip(trackId, {
    name: `Clip ${track.clips.length + 1}`,
    startBeat,
    lengthBeats,
  });
  selectedTrackId = trackId;
  selectedClipId = clip.id;
  setUiMessage(l('Clip creado', 'Clip created'), l(`${clip.name} comienza en el pulso ${startBeat + 1}.`, `${clip.name} starts at beat ${startBeat + 1}.`));
}

function setUiMessage(title: string, copy: string): void {
  render();
  if (selectionTitle) selectionTitle.textContent = title;
  if (selectionCopy) selectionCopy.textContent = copy;
}

function renderState(state: AudioState): void {
  const labels: Record<AudioState, string> = {
    idle: l('Listo', 'Ready'),
    starting: l('Activando audio…', 'Starting audio…'),
    playing: l('Reproduciendo', 'Playing'),
    paused: l('En pausa', 'Paused'),
    stopped: l('Detenido', 'Stopped'),
    error: l('Audio no disponible', 'Audio unavailable'),
  };
  if (statusLabel) statusLabel.textContent = labels[state];
  const engineLabel = document.querySelector<HTMLElement>('[data-engine-label]');
  if (engineLabel) engineLabel.textContent = state === 'error' ? l('Error', 'Error') : state === 'playing' ? l('Activo', 'Active') : l('Preparado', 'Ready');
  playButton?.classList.toggle('is-active', state === 'playing');
  pauseButton?.classList.toggle('is-active', state === 'paused');
  if (playButton) playButton.disabled = state === 'starting';
}

function updatePlayhead(now = performance.now()): void {
  document.querySelector<HTMLElement>('[data-playhead]')?.style.setProperty('--progress', String(audioEngine.getProgress()));
  pianoRoll.playhead(audioEngine.getProgress() * projectLengthBeats, audioEngine.isPlaying() || audioEngine.isPaused());
  if (mixerPanel && !mixerPanel.hidden && now - lastMeterPaint >= 33) {
    mixerView?.updateMeters(audioEngine.getMixerMeterLevels(), now);
    lastMeterPaint = now;
  }
  requestAnimationFrame(updatePlayhead);
}

function formatBars(beats: number, barLength: number): string {
  const bars = beats / barLength;
  const value = String(Number(bars.toFixed(2)));
  return l(`${value} ${bars === 1 ? 'compás' : 'compases'}`, `${value} ${bars === 1 ? 'bar' : 'bars'}`);
}

function requestOpenProject(): void {
  if (hasUnsavedChanges && !window.confirm(l(
    'Hay cambios sin guardar. Si abres otro proyecto, se perderán. ¿Quieres continuar?',
    'You have unsaved changes. Opening another project will discard them. Continue?',
  ))) return;
  projectFileInput?.click();
}

function saveProjectToFile(): void {
  const project = store.getSnapshot();
  const url = URL.createObjectURL(new Blob([store.saveProject()], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = projectFileName(project.name);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  hasUnsavedChanges = false;
  setUiMessage(
    l('Proyecto guardado', 'Project saved'),
    l(`Se ha descargado ${anchor.download}. Consérvalo para abrirlo cuando vuelvas.`, `${anchor.download} was downloaded. Keep it so you can open it next time.`),
  );
}

async function exportProjectToWav(): Promise<void> {
  if (!exportWavButton) return;
  exportWavButton.disabled = true;
  audioEngine.stop();
  setUiMessage(l('Preparando WAV…', 'Preparing WAV…'), l('JV Studio está mezclando el proyecto en este navegador.', 'JV Studio is mixing the project in this browser.'));
  try {
    const project = store.getSnapshot();
    const blob = await renderProjectWav(project);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = wavFileName(project.name);
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setUiMessage(
      l('WAV exportado', 'WAV exported'),
      l(`Se ha descargado ${anchor.download}.`, `${anchor.download} was downloaded.`),
    );
  } catch (error) {
    const tooLong = error instanceof RangeError;
    setUiMessage(
      l('No se pudo exportar', 'Could not export WAV'),
      tooLong
        ? l('La exportación WAV está limitada a 20 minutos para proteger la memoria del navegador.', 'WAV export is limited to 20 minutes to protect browser memory.')
        : l('El navegador no pudo crear el archivo WAV. Prueba de nuevo.', 'The browser could not create the WAV file. Please try again.'),
    );
  } finally {
    exportWavButton.disabled = false;
  }
}

function formatPan(pan: number): string {
  const amount = Math.round(Math.abs(pan) * 100);
  return amount === 0 ? 'C' : `${amount}${pan < 0 ? l('I', 'L') : l('D', 'R')}`;
}

function instrumentName(id: string): string {
  const preset = resolveInstrument(id);
  return l(preset.nameEs, preset.nameEn);
}

function toggleTrack(trackId: string, property: 'muted' | 'solo'): void {
  const track = store.getSnapshot().tracks.find((item) => item.id === trackId);
  if (!track) return;
  store.updateTrack(trackId, { [property]: !track[property] });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return entities[character];
  });
}

store.subscribe((change) => {
  hasUnsavedChanges = change.type !== 'project:load' && change.type !== 'project:create';
  projectLengthBeats = barsToBeats(change.project.lengthBars, change.project.timeSignature);
  if (change.type === 'track:update' || change.type === 'master:update' || change.type === 'effects:update') audioEngine.setTrackMix(change.project);
  else if (change.type !== 'project:update') audioEngine.setProject(change.project);
  render();
});
const editing = arrangement ? installClipEditing({
  element: arrangement, store,
  selection: () => ({ trackId: selectedTrackId, clipId: selectedClipId }),
  select: selectClip, message: setUiMessage,
  openClip: (trackId, clipId) => {
    pianoRoll.open(trackId, clipId);
    setActiveView('piano-roll');
  },
}) : null;
document.querySelector('[data-action="duplicate-clip"]')?.addEventListener('click', () => editing?.duplicate());
document.querySelector('[data-action="delete-clip"]')?.addEventListener('click', () => editing?.remove());
audioEngine.onStateChange(renderState);
playButton?.addEventListener('click', () => void audioEngine.play());
pauseButton?.addEventListener('click', () => audioEngine.pause());
stopButton?.addEventListener('click', () => audioEngine.stop());
document.querySelector('[data-action="add-track"]')?.addEventListener('click', addTrack);
document.querySelector('[data-action="add-clip"]')?.addEventListener('click', addClipAtFirstAvailableBar);

bpmInput?.addEventListener('change', () => {
  const bpm = normalizeBpm(bpmInput.valueAsNumber);
  store.updateProject({ bpm });
  audioEngine.setBpm(bpm);
});

openProjectButton?.addEventListener('click', requestOpenProject);
saveProjectButton?.addEventListener('click', saveProjectToFile);
exportWavButton?.addEventListener('click', () => { void exportProjectToWav(); });
projectFileInput?.addEventListener('change', async () => {
  const file = projectFileInput.files?.[0];
  if (!file) return;
  try {
    const project = store.loadProject(await file.text());
    selectedTrackId = project.tracks[0]?.id ?? '';
    selectedClipId = project.tracks[0]?.clips[0]?.id ?? null;
    hasUnsavedChanges = false;
    render();
    if (selectedClipId) pianoRoll.open(selectedTrackId, selectedClipId);
    else pianoRoll.close();
    setUiMessage(
      l('Proyecto abierto', 'Project opened'),
      l(`${project.name} está listo para continuar.`, `${project.name} is ready to continue.`),
    );
  } catch {
    setUiMessage(
      l('No se pudo abrir', 'Could not open project'),
      l('El archivo no parece un proyecto válido de JV Studio o está dañado.', 'The file is not a valid JV Studio project or may be damaged.'),
    );
  } finally {
    projectFileInput.value = '';
  }
});

projectLengthInput?.addEventListener('change', () => {
  const project = store.getSnapshot();
  const requested = Math.round(projectLengthInput.valueAsNumber);
  const minimum = minimumProjectLengthBars(project);
  if (!Number.isFinite(requested) || requested < 1 || requested > MAX_PROJECT_BARS) {
    projectLengthInput.value = String(project.lengthBars);
    setUiMessage(l('Duración no válida', 'Invalid project length'), l('Introduce entre 1 y 1024 compases.', 'Enter between 1 and 1024 bars.'));
    return;
  }
  if (requested < minimum) {
    projectLengthInput.value = String(project.lengthBars);
    setUiMessage(
      l('No se puede acortar', 'Cannot shorten project'),
      l(`El contenido actual necesita al menos ${minimum} compases.`, `Current content needs at least ${minimum} bars.`),
    );
    return;
  }
  if (requested === project.lengthBars) return;
  store.updateProject({ lengthBars: requested });
  audioEngine.setProject(store.getSnapshot());
  setUiMessage(
    l('Duración actualizada', 'Project length updated'),
    l(`El proyecto tiene ahora ${requested} compases.`, `The project now has ${requested} bars.`),
  );
});

arrangerZoomInput?.addEventListener('change', () => {
  const value = arrangerZoomInput.value;
  arrangerZoom = value === 'fit' ? 'fit' : isArrangerZoom(value) ? Number(value) as ArrangerZoom : 'fit';
  syncArrangerScale();
  if (arrangerZoom === 'fit' && arrangement) arrangement.scrollLeft = 0;
  syncArrangerRulerScroll();
  const percent = arrangerZoom === 'fit' ? null : Math.round((arrangerZoom / 48) * 100);
  setUiMessage(
    l('Zoom del Arranger', 'Arranger zoom'),
    percent === null
      ? l('El proyecto completo cabe en el ancho disponible.', 'The complete project fits the available width.')
      : l(`Escala ajustada al ${percent}%.`, `Scale set to ${percent}%.`),
  );
});

arrangement?.addEventListener('scroll', syncArrangerRulerScroll, { passive: true });
if (arrangement && typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(() => {
    if (arrangerZoom === 'fit') syncArrangerScale();
    syncArrangerRulerScroll();
  }).observe(arrangement);
}

trackList?.addEventListener('click', (event) => {
  const toggle = (event.target as HTMLElement).closest<HTMLElement>('[data-track-toggle]');
  if (toggle?.dataset.trackId && (toggle.dataset.trackToggle === 'muted' || toggle.dataset.trackToggle === 'solo')) {
    selectedTrackId = toggle.dataset.trackId;
    toggleTrack(toggle.dataset.trackId, toggle.dataset.trackToggle);
    return;
  }
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-track-id]');
  if (target?.dataset.trackId) selectTrack(target.dataset.trackId);
});

inspector?.addEventListener('input', (event) => {
  const input = (event.target as HTMLElement).closest<HTMLInputElement>('input[data-mix]');
  if (!input) return;
  const output = inspector.querySelector<HTMLOutputElement>(`[data-mix-output="${input.dataset.mix}"]`);
  if (output) output.value = input.dataset.mix === 'volume' ? formatDecibels(gainToFaderDb(input.valueAsNumber)) : formatPan(input.valueAsNumber);
});

inspector?.addEventListener('change', (event) => {
  const nameControl = (event.target as HTMLElement).closest<HTMLInputElement>('[data-name]');
  if (nameControl) {
    const name = nameControl.value.trim();
    const trackId = nameControl.dataset.trackId;
    if (!name || !trackId) {
      render();
      setUiMessage(l('Nombre no válido', 'Invalid name'), l('El nombre no puede quedar vacío.', 'The name cannot be empty.'));
      return;
    }
    if (nameControl.dataset.name === 'track') store.updateTrack(trackId, { name });
    else if (nameControl.dataset.clipId) store.updateClip(trackId, nameControl.dataset.clipId, { name });
    setUiMessage(l('Nombre actualizado', 'Name updated'), name);
    return;
  }
  const control = (event.target as HTMLElement).closest<HTMLInputElement | HTMLSelectElement>('[data-mix]');
  const trackId = control?.dataset.trackId;
  if (!control || !trackId) return;
  if (control.dataset.mix === 'instrumentId') store.updateTrack(trackId, { instrumentId: control.value });
  if (control.dataset.mix === 'volume') store.updateTrack(trackId, { volume: Number(control.value) });
  if (control.dataset.mix === 'pan') store.updateTrack(trackId, { pan: Number(control.value) });
});

inspector?.addEventListener('click', (event) => {
  const deleteButton = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-delete-track]');
  if (deleteButton?.dataset.trackId) {
    deleteTrack(deleteButton.dataset.trackId);
    return;
  }
  const toggle = (event.target as HTMLElement).closest<HTMLElement>('[data-mix-toggle]');
  if (toggle?.dataset.trackId && (toggle.dataset.mixToggle === 'muted' || toggle.dataset.mixToggle === 'solo')) {
    toggleTrack(toggle.dataset.trackId, toggle.dataset.mixToggle);
  }
});

arrangement?.addEventListener('click', (event) => {
  const clip = (event.target as HTMLElement).closest<HTMLElement>('[data-clip-id]');
  if (clip?.dataset.clipId && clip.dataset.trackId) {
    selectClip(clip.dataset.trackId, clip.dataset.clipId);
    editing?.focusClip();
    return;
  }
  const track = (event.target as HTMLElement).closest<HTMLElement>('[data-track-id]');
  if (track?.dataset.trackId) selectTrack(track.dataset.trackId);
});

arrangerPanel?.addEventListener('focusin', (event) => {
  const target = event.target as HTMLElement;
  if (target.closest('.piano-panel')) setActiveView('piano-roll');
  else if (target.closest('.arrangement, [data-view="arranger"]')) setActiveView('arranger');
});

workspace?.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-view]');
  if (!button) return;
  const view = button.dataset.view;
  if (view === 'arranger') {
    setActiveView('arranger');
    arrangement?.focus({ preventScroll: true });
  } else if (view === 'piano-roll' && selectedClipId) {
    pianoRoll.open(selectedTrackId, selectedClipId);
    pianoRoll.focus();
    setActiveView('piano-roll');
  } else if (view === 'mixer') {
    setActiveView('mixer');
    mixerPanel?.focus({ preventScroll: true });
  }
});

window.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
  const target = event.target as HTMLElement;
  if (target.closest('input, textarea, select, button, [contenteditable="true"], dialog[open]')) return;
  event.preventDefault();
  if (audioEngine.isPlaying()) audioEngine.pause();
  else void audioEngine.play();
});

arrangement?.addEventListener('dblclick', (event) => {
  const target = event.target as HTMLElement;
  if (target.closest('[data-clip-id]')) return;
  const lane = target.closest<HTMLElement>('[data-lane-track-id]');
  const trackId = lane?.dataset.laneTrackId;
  if (!lane || !trackId) return;

  const project = store.getSnapshot();
  const track = project.tracks.find((candidate) => candidate.id === trackId);
  if (!track) return;
  const barLength = beatsPerBar(project.timeSignature);
  const projectBeats = barsToBeats(project.lengthBars, project.timeSignature);
  const bounds = lane.getBoundingClientRect();
  const startBeat = clipStartFromPointer(event.clientX - bounds.left, bounds.width, barLength, projectBeats, barLength);

  if (!isClipRangeAvailable(track, startBeat, barLength, projectBeats)) {
    setUiMessage(l('Compás ocupado', 'Bar already occupied'), l('Elige un compás vacío en esta pista.', 'Choose an empty bar in this track.'));
    return;
  }
  createClip(trackId, startBeat, barLength);
});

window.addEventListener('pagehide', () => audioEngine.dispose(), { once: true });
window.addEventListener('beforeunload', (event) => {
  if (!hasUnsavedChanges) return;
  event.preventDefault();
  event.returnValue = '';
});
render();
if (selectedClipId) {
  pianoRoll.open(selectedTrackId, selectedClipId);
  setActiveView('piano-roll');
}
requestAnimationFrame(updatePlayhead);
showSessionNotice(requestOpenProject);

function setActiveView(view: 'arranger' | 'piano-roll' | 'mixer'): void {
  activeView = view;
  if (view === 'mixer') arrangerPanel?.classList.add('has-mixer');
  if (view === 'piano-roll') arrangerPanel?.classList.remove('has-mixer');
  syncViewState();
}

function syncViewState(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-view]')) {
    const active = button.dataset.view === activeView;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
    if (button.dataset.view === 'piano-roll') button.disabled = !selectedClipId;
  }
  arrangerPanel?.classList.toggle('is-piano-active', activeView === 'piano-roll');
  arrangerPanel?.classList.toggle('is-mixer-active', activeView === 'mixer');
  if (mixerPanel) mixerPanel.hidden = !arrangerPanel?.classList.contains('has-mixer');
}
