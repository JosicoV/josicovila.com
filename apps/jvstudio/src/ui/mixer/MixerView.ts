import { FADER_MAX_DB, FADER_MIN_DB, faderDbToGain, formatDecibels, gainToFaderDb } from '../../audio/gain';
import type { MixerMeterLevels, StereoMeterLevel } from '../../audio/MixerEngine';
import { l } from '../../i18n';
import { createEffectConfig, EFFECT_PARAMETERS, type EffectConfig, type EffectId, type InstrumentTrack, type Project, type ProjectStore } from '../../project';
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
  let fxTarget: { kind: 'track'; trackId: string } | { kind: 'master' } | null = null;
  const meterStates = new Map<string, MeterBallistics>();

  const view: MixerView = {
    render(project, selectedTrackId, force = false) {
      currentProject = project;
      const active = document.activeElement;
      if (!force && active instanceof HTMLInputElement && element.contains(active) && active.matches('[data-mixer-volume], [data-mixer-pan], [data-fx-param], [data-send-level], [data-bus-fx-param], [data-limiter-threshold]')) return;
      element.innerHTML = mixerMarkup(project, selectedTrackId, options.instrumentName, fxTarget);
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
    const openFx = target.closest<HTMLButtonElement>('[data-open-fx]');
    if (openFx) {
      fxTarget = openFx.dataset.trackId ? { kind: 'track', trackId: openFx.dataset.trackId } : { kind: 'master' };
      if (openFx.dataset.trackId) options.onSelectTrack(openFx.dataset.trackId);
      else view.render(currentProject, options.selectedTrackId(), true);
      return;
    }
    if (target.closest('[data-close-fx]')) {
      fxTarget = null;
      view.render(currentProject, options.selectedTrackId(), true);
      return;
    }
    const removeFx = target.closest<HTMLButtonElement>('[data-remove-insert]');
    if (removeFx) {
      updateInsertList(store, currentProject, removeFx.dataset.fxScope, Number(removeFx.dataset.insertIndex), 'remove');
      return;
    }
    const toggleFx = target.closest<HTMLButtonElement>('[data-toggle-insert]');
    if (toggleFx) {
      updateInsertList(store, currentProject, toggleFx.dataset.fxScope, Number(toggleFx.dataset.insertIndex), 'toggle');
      return;
    }
    const toggleSend = target.closest<HTMLButtonElement>('[data-toggle-send-fx]');
    if (toggleSend?.dataset.sendFx === 'reverb' || toggleSend?.dataset.sendFx === 'delay') {
      const key = toggleSend.dataset.sendFx;
      store.updateSendEffects({ [key]: { ...currentProject.sendFx[key], enabled: !currentProject.sendFx[key].enabled } });
      return;
    }
    if (target.closest('[data-toggle-limiter]')) {
      store.updateMaster({ limiterEnabled: !currentProject.master.limiterEnabled });
      return;
    }
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
      return;
    }
    if (input.matches('[data-send-level]') && input.dataset.trackId && (input.dataset.sendLevel === 'reverb' || input.dataset.sendLevel === 'delay')) {
      const track = currentProject.tracks.find((item) => item.id === input.dataset.trackId);
      if (!track) return;
      const key = input.dataset.sendLevel;
      updateControlOutput(input, `${Math.round(input.valueAsNumber * 100)}%`);
      store.updateTrack(track.id, { sends: { ...track.sends, [key]: input.valueAsNumber } });
      return;
    }
    if (input.matches('[data-fx-param]') && input.dataset.fxParameter) {
      updateControlOutput(input, formatEffectValue(input.dataset.fxParameter, input.valueAsNumber));
      updateInsertParameter(store, currentProject, input.dataset.fxScope, Number(input.dataset.insertIndex), input.dataset.fxParameter, input.valueAsNumber);
      return;
    }
    if (input.matches('[data-bus-fx-param]') && (input.dataset.busFx === 'reverb' || input.dataset.busFx === 'delay') && input.dataset.fxParameter) {
      const key = input.dataset.busFx;
      const config = currentProject.sendFx[key];
      updateControlOutput(input, formatEffectValue(input.dataset.fxParameter, input.valueAsNumber));
      store.updateSendEffects({ [key]: { ...config, parameters: { ...config.parameters, [input.dataset.fxParameter]: input.valueAsNumber } } });
      return;
    }
    if (input.matches('[data-limiter-threshold]')) {
      updateControlOutput(input, formatEffectValue('threshold', input.valueAsNumber));
      store.updateMaster({ limiterThreshold: input.valueAsNumber });
    }
  });

  element.addEventListener('change', (event) => {
    const input = event.target as HTMLInputElement;
    if (input.matches('[data-mixer-volume], [data-mixer-pan], [data-fx-param], [data-send-level], [data-bus-fx-param], [data-limiter-threshold]')) {
      view.render(store.getSnapshot(), options.selectedTrackId(), true);
      return;
    }
    const select = event.target as HTMLSelectElement;
    if (select.matches('[data-add-insert]') && (select.value === 'jv-eq' || select.value === 'jv-compressor')) {
      updateInsertList(store, currentProject, select.dataset.fxScope, -1, 'add', select.value);
    }
  });

  return view;
}

function mixerMarkup(
  project: Project,
  selectedTrackId: string,
  instrumentName: (id: string) => string,
  fxTarget: { kind: 'track'; trackId: string } | { kind: 'master' } | null,
): string {
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
            <button class="mixer-fx-button ${track.insertFx.length > 0 || track.sends.reverb > 0 || track.sends.delay > 0 ? 'has-fx' : ''}" type="button" data-open-fx data-track-id="${escapeHtml(track.id)}" aria-label="${l('Abrir efectos de', 'Open effects for')} ${escapeHtml(track.name)}">FX ${track.insertFx.length}/2</button>
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
          <button class="mixer-fx-button ${project.master.insertFx.length > 0 ? 'has-fx' : ''}" type="button" data-open-fx aria-label="${l('Abrir efectos del Master', 'Open Master effects')}">MASTER FX</button>
          <div class="mixer-master-spacer" aria-hidden="true"></div>
          ${faderMarkup(project.master.volume, l('Master', 'Master'), '', 'master')}
          <button class="mixer-limiter-status ${project.master.limiterEnabled ? 'is-active' : ''}" type="button" data-open-fx aria-label="${l('Abrir limitador del Master', 'Open Master limiter')}">${project.master.limiterEnabled ? l('LIMITER · ACTIVO', 'LIMITER · ON') : l('LIMITER · BYPASS', 'LIMITER · BYPASS')}</button>
        </article>
      </div>
    </div>
    ${fxPanelMarkup(project, fxTarget)}
  `;
}

function fxPanelMarkup(project: Project, target: { kind: 'track'; trackId: string } | { kind: 'master' } | null): string {
  if (!target) return '';
  const track = target.kind === 'track' ? project.tracks.find((item) => item.id === target.trackId) : undefined;
  if (target.kind === 'track' && !track) return '';
  const title = track?.name ?? l('Salida principal', 'Main output');
  const inserts = track?.insertFx ?? project.master.insertFx;
  return `
    <aside class="mixer-fx-panel" ${track ? `data-fx-track-id="${escapeHtml(track.id)}"` : ''} aria-label="${l('Panel de efectos de', 'Effects panel for')} ${escapeHtml(title)}">
      <header><div><span class="eyebrow">${track ? l('EFECTOS DE PISTA', 'TRACK EFFECTS') : l('EFECTOS MASTER', 'MASTER EFFECTS')}</span><h2>${escapeHtml(title)}</h2></div><button type="button" data-close-fx aria-label="${l('Cerrar efectos', 'Close effects')}">×</button></header>
      <section>
        <div class="fx-section-heading"><h3>${l('Insertos', 'Inserts')}</h3><span>${inserts.length}/2</span></div>
        ${[0, 1].map((index) => insertSlotMarkup(inserts[index], index, track ? 'track' : 'master')).join('')}
      </section>
      ${track ? trackSendsMarkup(track, project) : masterLimiterMarkup(project)}
    </aside>
  `;
}

function insertSlotMarkup(config: EffectConfig | undefined, index: number, scope: 'track' | 'master'): string {
  if (!config) return `
    <div class="fx-slot is-empty">
      <span>${l('INSERTO', 'INSERT')} ${index + 1}</span>
      <select data-add-insert data-fx-scope="${scope}" aria-label="${l('Añadir efecto al inserto', 'Add effect to insert')} ${index + 1}">
        <option value="">${l('Añadir efecto…', 'Add effect…')}</option>
        <option value="jv-eq">JV EQ</option>
        <option value="jv-compressor">JV Compressor</option>
      </select>
    </div>`;
  return `
    <div class="fx-slot ${config.enabled ? '' : 'is-bypassed'}">
      <div class="fx-slot-heading"><span>${l('INSERTO', 'INSERT')} ${index + 1}</span><strong>${effectName(config.id)}</strong><div><button type="button" data-toggle-insert data-fx-scope="${scope}" data-insert-index="${index}" aria-pressed="${config.enabled}">${config.enabled ? 'ON' : 'BYPASS'}</button><button type="button" data-remove-insert data-fx-scope="${scope}" data-insert-index="${index}" aria-label="${l('Quitar', 'Remove')} ${effectName(config.id)}">×</button></div></div>
      <div class="fx-parameters">${EFFECT_PARAMETERS[config.id].map((definition) => effectControlMarkup(config, definition.key, definition.min, definition.max, definition.step, `data-fx-param data-fx-scope="${scope}" data-insert-index="${index}"`)).join('')}</div>
    </div>`;
}

function trackSendsMarkup(track: InstrumentTrack, project: Project): string {
  return `
    <section>
      <div class="fx-section-heading"><h3>${l('Envíos compartidos', 'Shared sends')}</h3><span>${l('POST-FADER', 'POST-FADER')}</span></div>
      ${(['reverb', 'delay'] as const).map((key) => {
        const config = project.sendFx[key];
        return `<div class="fx-send ${config.enabled ? '' : 'is-bypassed'}">
          <div class="fx-slot-heading"><strong>${effectName(config.id)}</strong><button type="button" data-toggle-send-fx data-send-fx="${key}" aria-pressed="${config.enabled}">${config.enabled ? 'ON' : 'BYPASS'}</button></div>
          ${rangeControlMarkup(l('Envío de pista', 'Track send'), track.sends[key], 0, 1, 0.01, `${Math.round(track.sends[key] * 100)}%`, `data-send-level="${key}" data-track-id="${escapeHtml(track.id)}"`)}
          <div class="fx-parameters">${EFFECT_PARAMETERS[config.id].map((definition) => effectControlMarkup(config, definition.key, definition.min, definition.max, definition.step, `data-bus-fx-param data-bus-fx="${key}"`)).join('')}</div>
        </div>`;
      }).join('')}
    </section>`;
}

function masterLimiterMarkup(project: Project): string {
  return `
    <section>
      <div class="fx-section-heading"><h3>JV Limiter</h3><span>${l('ÚLTIMO EN LA CADENA', 'LAST IN CHAIN')}</span></div>
      <div class="fx-slot ${project.master.limiterEnabled ? '' : 'is-bypassed'}">
        <div class="fx-slot-heading"><strong>JV Limiter</strong><button type="button" data-toggle-limiter aria-pressed="${project.master.limiterEnabled}">${project.master.limiterEnabled ? 'ON' : 'BYPASS'}</button></div>
        ${rangeControlMarkup(l('Umbral', 'Threshold'), project.master.limiterThreshold, -12, 0, 0.5, formatEffectValue('threshold', project.master.limiterThreshold), 'data-limiter-threshold')}
      </div>
    </section>`;
}

function effectControlMarkup(config: EffectConfig, key: string, min: number, max: number, step: number, attributes: string): string {
  const value = config.parameters[key];
  return rangeControlMarkup(parameterLabel(key), value, min, max, step, formatEffectValue(key, value), `${attributes} data-fx-parameter="${key}"`);
}

function rangeControlMarkup(label: string, value: number, min: number, max: number, step: number, output: string, attributes: string): string {
  return `<label class="fx-control"><span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${value}" ${attributes} /><output>${output}</output></label>`;
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

function updateInsertList(
  store: ProjectStore,
  project: Project,
  scope: string | undefined,
  index: number,
  action: 'add' | 'remove' | 'toggle',
  effectId?: 'jv-eq' | 'jv-compressor',
): void {
  const targetId = document.querySelector<HTMLElement>('.mixer-fx-panel')?.dataset.fxTrackId;
  const track = scope === 'track' ? project.tracks.find((item) => item.id === targetId) : undefined;
  const inserts = structuredClone(track?.insertFx ?? project.master.insertFx);
  if (action === 'add' && effectId && inserts.length < 2) inserts.push(createEffectConfig(effectId));
  if (action === 'remove' && inserts[index]) inserts.splice(index, 1);
  if (action === 'toggle' && inserts[index]) inserts[index].enabled = !inserts[index].enabled;
  if (track) store.updateTrack(track.id, { insertFx: inserts });
  else store.updateMaster({ insertFx: inserts });
}

function updateInsertParameter(
  store: ProjectStore,
  project: Project,
  scope: string | undefined,
  index: number,
  parameter: string,
  value: number,
): void {
  const targetId = document.querySelector<HTMLElement>('.mixer-fx-panel')?.dataset.fxTrackId;
  const track = scope === 'track' ? project.tracks.find((item) => item.id === targetId) : undefined;
  const inserts = structuredClone(track?.insertFx ?? project.master.insertFx);
  const effect = inserts[index];
  if (!effect) return;
  effect.parameters[parameter] = value;
  if (track) store.updateTrack(track.id, { insertFx: inserts });
  else store.updateMaster({ insertFx: inserts });
}

function updateControlOutput(input: HTMLInputElement, value: string): void {
  const output = input.closest('label')?.querySelector<HTMLOutputElement>('output');
  if (output) output.value = value;
}

function effectName(id: EffectId): string {
  const names: Record<EffectId, string> = {
    'jv-eq': 'JV EQ',
    'jv-compressor': 'JV Compressor',
    'jv-reverb': 'JV Reverb',
    'jv-delay': 'JV Delay',
    'jv-limiter': 'JV Limiter',
  };
  return names[id];
}

function parameterLabel(key: string): string {
  const labels: Record<string, string> = {
    low: l('Graves', 'Low'),
    mid: l('Medios', 'Mid'),
    high: l('Agudos', 'High'),
    threshold: l('Umbral', 'Threshold'),
    ratio: l('Ratio', 'Ratio'),
    attack: l('Ataque', 'Attack'),
    release: l('Liberación', 'Release'),
    makeup: l('Ganancia', 'Makeup'),
    decay: l('Caída', 'Decay'),
    preDelay: l('Pre-delay', 'Pre-delay'),
    wet: l('Retorno', 'Wet'),
    time: l('Tiempo', 'Time'),
    feedback: l('Realimentación', 'Feedback'),
  };
  return labels[key] ?? key;
}

function formatEffectValue(key: string, value: number): string {
  if (key === 'time') return ({ 0.25: '1/16', 0.5: '1/8', 0.75: '1/8D', 1: '1/4' } as Record<number, string>)[value] ?? `${value} beats`;
  if (key === 'wet' || key === 'feedback') return `${Math.round(value * 100)}%`;
  if (key === 'attack' || key === 'release' || key === 'preDelay') return `${Math.round(value * 1000)} ms`;
  if (key === 'ratio') return `${value}:1`;
  if (key === 'decay') return `${value.toFixed(1)} s`;
  return `${value > 0 ? '+' : ''}${value} dB`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return entities[character];
  });
}
