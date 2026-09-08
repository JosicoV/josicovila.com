import { FADER_MAX_DB, FADER_MIN_DB, faderDbToGain, formatDecibels, gainToFaderDb } from '../../audio/gain';
import type { MixerMeterLevels, StereoMeterLevel } from '../../audio/MixerEngine';
import { l } from '../../i18n';
import type { Project, ProjectStore } from '../../project';
import { initialMeterBallistics, meterPercent, updateMeterBallistics, type MeterBallistics } from './metering';

// Full strip plus divider/header/padding and clearance for native range controls.
export const MIXER_MIN_PANEL_HEIGHT = 570;

export interface MixerViewOptions {
  instrumentName: (instrumentId: string) => string;
  onSelectTrack: (trackId: string) => void;
  selectedTrackId: () => string;
}

export interface MixerView {
  render(project: Project, selectedTrackId: string, force?: boolean): void;
  updateMeters(levels: MixerMeterLevels, now?: number): void;
}

export function installMixerView(
  element: HTMLElement,
  store: ProjectStore,
  options: MixerViewOptions,
): MixerView {
  let currentProject = store.getSnapshot();
  const meterStates = new Map<string, MeterBallistics>();

  const view: MixerView = {
    render(project, selectedTrackId, force = false) {
      currentProject = project;
      const active = document.activeElement;
      if (!force && active instanceof HTMLInputElement && element.contains(active) && active.matches('[data-mixer-volume], [data-mixer-pan]')) return;
      element.innerHTML = mixerMarkup(project, selectedTrackId, options.instrumentName);
    },
    updateMeters(levels, now = performance.now()) {
      for (const meter of element.querySelectorAll<HTMLElement>('[data-meter-track-id]')) {
        const meterId = meter.dataset.meterTrackId;
        if (!meterId) continue;
        paintMeter(meter, meterId === 'master' ? levels.master : levels.tracks[meterId], meterId, now, meterStates);
      }
    },
  };

  element.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const toggle = target.closest<HTMLButtonElement>('[data-mixer-toggle]');
    if (toggle?.dataset.trackId && (toggle.dataset.mixerToggle === 'muted' || toggle.dataset.mixerToggle === 'solo')) {
      const track = currentProject.tracks.find((item) => item.id === toggle.dataset.trackId);
      if (track) store.updateTrack(track.id, { [toggle.dataset.mixerToggle]: !track[toggle.dataset.mixerToggle] });
      return;
    }
    const strip = target.closest<HTMLElement>('[data-mixer-track-id]');
    if (strip?.dataset.mixerTrackId) options.onSelectTrack(strip.dataset.mixerTrackId);
  });

  element.addEventListener('input', (event) => {
    const input = event.target as HTMLInputElement;
    if (input.matches('[data-mixer-volume]')) {
      const output = input.closest('.mixer-strip')?.querySelector<HTMLOutputElement>('[data-mixer-db]');
      if (output) output.value = formatDecibels(input.valueAsNumber);
      const trackId = input.dataset.trackId;
      const gain = faderDbToGain(input.valueAsNumber);
      if (trackId) store.updateTrack(trackId, { volume: gain });
      else store.updateMaster({ volume: gain });
      return;
    }
    if (input.matches('[data-mixer-pan]') && input.dataset.trackId) {
      const output = input.closest('.mixer-strip')?.querySelector<HTMLOutputElement>('[data-mixer-pan-value]');
      if (output) output.value = formatPan(input.valueAsNumber);
      store.updateTrack(input.dataset.trackId, { pan: input.valueAsNumber });
    }
  });

  element.addEventListener('change', (event) => {
    const input = event.target as HTMLInputElement;
    if (input.matches('[data-mixer-volume], [data-mixer-pan]')) {
      view.render(store.getSnapshot(), options.selectedTrackId(), true);
    }
  });

  return view;
}

function mixerMarkup(project: Project, selectedTrackId: string, instrumentName: (id: string) => string): string {
  return `
    <header class="mixer-header">
      <div>
        <span class="eyebrow">MIXER</span>
        <h1>${l('Mezclador', 'Mixer')}</h1>
      </div>
      <p>${l('Ajusta el balance de las pistas sin interrumpir la reproducción.', 'Balance tracks without interrupting playback.')}</p>
    </header>
    <div class="mixer-scroll">
      <div class="mixer-strips">
        ${project.tracks.map((track, index) => `
          <article class="mixer-strip ${track.id === selectedTrackId ? 'is-selected' : ''}" data-mixer-track-id="${escapeHtml(track.id)}" style="--track-color:${track.color}">
            <div class="mixer-strip-heading">
              <span>${String(index + 1).padStart(2, '0')}</span>
              <strong title="${escapeHtml(track.name)}">${escapeHtml(track.name)}</strong>
              <small title="${escapeHtml(instrumentName(track.instrumentId))}">${escapeHtml(instrumentName(track.instrumentId))}</small>
            </div>
            <button class="mixer-fx-placeholder" type="button" disabled title="${l('Los efectos llegan en la siguiente fase', 'Effects arrive in the next phase')}">FX</button>
            <label class="mixer-pan-control">
              <span>PAN</span>
              <input type="range" min="-1" max="1" step="0.01" value="${track.pan}" data-mixer-pan data-track-id="${escapeHtml(track.id)}" aria-label="${l('Panorámica de', 'Pan for')} ${escapeHtml(track.name)}" />
              <output data-mixer-pan-value>${formatPan(track.pan)}</output>
            </label>
            ${faderMarkup(track.volume, track.name, `data-track-id="${escapeHtml(track.id)}"`, track.id)}
            <div class="mixer-strip-toggles">
              <button class="${track.muted ? 'is-active' : ''}" type="button" data-mixer-toggle="muted" data-track-id="${escapeHtml(track.id)}" aria-pressed="${track.muted}" aria-label="${l('Silenciar', 'Mute')} ${escapeHtml(track.name)}">M</button>
              <button class="${track.solo ? 'is-active is-solo' : ''}" type="button" data-mixer-toggle="solo" data-track-id="${escapeHtml(track.id)}" aria-pressed="${track.solo}" aria-label="Solo ${escapeHtml(track.name)}">S</button>
            </div>
          </article>
        `).join('')}
        <article class="mixer-strip mixer-master-strip">
          <div class="mixer-strip-heading">
            <span>MASTER</span>
            <strong>${l('Salida principal', 'Main output')}</strong>
            <small>${l('Bus estéreo', 'Stereo bus')}</small>
          </div>
          <button class="mixer-fx-placeholder" type="button" disabled title="${l('Los efectos Master llegan en la siguiente fase', 'Master effects arrive in the next phase')}">MASTER FX</button>
          <div class="mixer-master-spacer" aria-hidden="true"></div>
          ${faderMarkup(project.master.volume, l('Master', 'Master'), '', 'master')}
          <div class="mixer-limiter-placeholder" title="${l('El limitador llegará en la fase de efectos', 'The limiter arrives in the effects phase')}">${l('LIMITER · PRÓXIMAMENTE', 'LIMITER · COMING NEXT')}</div>
        </article>
      </div>
    </div>
  `;
}

function faderMarkup(gain: number, name: string, trackAttribute: string, meterId: string): string {
  const decibels = gainToFaderDb(gain);
  return `
    <label class="mixer-fader">
      <span>${l('Volumen', 'Volume')}</span>
      <span class="mixer-fader-body">
        <span class="mixer-meter" data-meter-track-id="${escapeHtml(meterId)}" role="meter" aria-label="${l('Nivel de', 'Level for')} ${escapeHtml(name)}" aria-valuemin="-60" aria-valuemax="6" aria-valuenow="-60">
          <em data-meter-clip>CLIP</em>
          <i><span data-meter-fill="left"></span><b data-meter-peak="left"></b></i>
          <i><span data-meter-fill="right"></span><b data-meter-peak="right"></b></i>
        </span>
        <input type="range" min="${FADER_MIN_DB}" max="${FADER_MAX_DB}" step="0.5" value="${decibels}" data-mixer-volume ${trackAttribute} aria-label="${l('Volumen de', 'Volume for')} ${escapeHtml(name)}" />
      </span>
      <output data-mixer-db>${formatDecibels(decibels)}</output>
    </label>
  `;
}

function paintMeter(
  meter: HTMLElement,
  level: StereoMeterLevel | undefined,
  meterId: string,
  now: number,
  states: Map<string, MeterBallistics>,
): void {
  const current = level ?? { left: -60, right: -60 };
  let clipped = false;
  for (const side of ['left', 'right'] as const) {
    const key = `${meterId}:${side}`;
    const state = updateMeterBallistics(states.get(key) ?? initialMeterBallistics(now), current[side], now);
    states.set(key, state);
    meter.querySelector<HTMLElement>(`[data-meter-fill="${side}"]`)?.style.setProperty('height', `${meterPercent(current[side])}%`);
    meter.querySelector<HTMLElement>(`[data-meter-peak="${side}"]`)?.style.setProperty('bottom', `${meterPercent(state.peakDb)}%`);
    clipped ||= state.clipUntil > now;
  }
  const peak = Math.max(current.left, current.right);
  meter.setAttribute('aria-valuenow', String(Math.round(peak * 10) / 10));
  meter.setAttribute('aria-valuetext', peak <= -60 ? l('Silencio', 'Silence') : `${Math.round(peak * 10) / 10} dB`);
  meter.classList.toggle('is-clipped', clipped);
}

function formatPan(pan: number): string {
  const amount = Math.round(Math.abs(pan) * 100);
  return amount === 0 ? 'C' : `${amount}${pan < 0 ? l('I', 'L') : l('D', 'R')}`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return entities[character];
  });
}
