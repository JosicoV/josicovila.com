const state = {
  rows: [],
  quickRows: [],
  models: [],
  modes: [],
  queries: [],
  summary: { total: 0, reviewed: 0 },
  reviewPlan: "quick",
  model: "",
  mode: "",
  query: "",
  unreviewedOnly: false,
  activeRange: null,
  noteTimers: new Map(),
};

const modelLabels = {
  figma: "FIGMA",
  muq_mulan: "MuQ-MuLan",
  laion_clap: "LAION-CLAP baseline",
};

const modeLabels = {
  global: "Global",
  segment: "Mejor segmento",
  hybrid: "Híbrido 50/50",
};

const criteria = [
  ["instrument_correct", "Instrumento"],
  ["mood_correct", "Ánimo"],
  ["energy_correct", "Energía"],
  ["scene_correct", "Escena"],
  ["contradiction", "Contradicción"],
];

const elements = {
  reviewPlan: document.querySelector("#reviewPlan"),
  planHelp: document.querySelector("#planHelp"),
  modelSelect: document.querySelector("#modelSelect"),
  modeSelect: document.querySelector("#modeSelect"),
  unreviewedOnly: document.querySelector("#unreviewedOnly"),
  queryList: document.querySelector("#queryList"),
  queryCounter: document.querySelector("#queryCounter"),
  contextLabel: document.querySelector("#contextLabel"),
  queryTitle: document.querySelector("#queryTitle"),
  results: document.querySelector("#results"),
  notice: document.querySelector("#notice"),
  progressText: document.querySelector("#progressText"),
  progressPercent: document.querySelector("#progressPercent"),
  progressBar: document.querySelector("#progressBar"),
  previousQuery: document.querySelector("#previousQuery"),
  nextQuery: document.querySelector("#nextQuery"),
  nextPending: document.querySelector("#nextPending"),
  audioPlayer: document.querySelector("#audioPlayer"),
  nowPlaying: document.querySelector("#nowPlaying"),
  playerPulse: document.querySelector("#playerPulse"),
  repeatSegment: document.querySelector("#repeatSegment"),
  resultTemplate: document.querySelector("#resultTemplate"),
};

function groupRows(query = state.query) {
  const source = state.reviewPlan === "quick" ? state.quickRows : state.rows;
  return source
    .filter((row) => row.query === query && (state.reviewPlan === "quick" || (row.model === state.model && row.mode === state.mode)))
    .sort((left, right) => Number(left.rank) - Number(right.rank));
}

function reviewedCount(rows) {
  return rows.filter((row) => row.human_score !== "").length;
}

function queryIsComplete(query) {
  const rows = groupRows(query);
  return rows.length > 0 && reviewedCount(rows) === rows.length;
}

function visibleQueries() {
  if (!state.unreviewedOnly) return state.queries;
  return state.queries.filter((query) => !queryIsComplete(query));
}

function formatTime(rawSeconds) {
  const total = Math.max(0, Number(rawSeconds) || 0);
  const minutes = Math.floor(total / 60);
  const seconds = Math.floor(total % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function setNotice(message, type = "") {
  elements.notice.textContent = message;
  elements.notice.className = `notice ${type}`.trim();
}

function fillSelect(select, values, labels) {
  select.replaceChildren();
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = labels[value] || value;
    select.append(option);
  });
}

function renderProgress() {
  const rows = state.reviewPlan === "quick" ? state.quickRows : state.rows;
  const total = rows.length;
  const reviewed = reviewedCount(rows);
  const percent = total ? Math.round((reviewed / total) * 100) : 0;
  const noun = state.reviewPlan === "quick" ? "escuchas evaluadas" : "filas evaluadas";
  elements.progressText.textContent = `${reviewed} de ${total} ${noun}`;
  elements.progressPercent.textContent = `${percent}%`;
  elements.progressBar.style.width = `${percent}%`;
}

function renderControls() {
  const quick = state.reviewPlan === "quick";
  elements.reviewPlan.value = state.reviewPlan;
  elements.modelSelect.disabled = quick;
  elements.modeSelect.disabled = quick;
  elements.planHelp.textContent = quick
    ? "Top 1 de FIGMA y MuQ en Segmento e Híbrido. Los duplicados se puntúan una sola vez."
    : "Vista de auditoría completa por modelo, modo y consulta.";
}

function renderSidebar() {
  const queries = visibleQueries();
  elements.queryList.replaceChildren();
  state.queries.forEach((query, index) => {
    if (!queries.includes(query)) return;
    const rows = groupRows(query);
    const count = reviewedCount(rows);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `query-item${query === state.query ? " active" : ""}${count === rows.length && rows.length ? " complete" : ""}`;
    button.innerHTML = `<span class="query-number">${String(index + 1).padStart(2, "0")}</span><span class="query-copy"></span><span class="query-progress">${count}/${rows.length}</span>`;
    button.querySelector(".query-copy").textContent = query;
    button.addEventListener("click", () => {
      state.query = query;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    elements.queryList.append(button);
  });
  const currentIndex = state.queries.indexOf(state.query) + 1;
  elements.queryCounter.textContent = `${currentIndex}/${state.queries.length}`;
}

function scoreButton(row, score, card) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `score-button score-${score}${row.human_score === String(score) ? " selected" : ""}`;
  button.textContent = String(score);
  button.title = ["Irrelevante", "Débil", "Bueno", "Excelente"][score];
  button.addEventListener("click", () => persist(row, { human_score: String(score) }, card));
  return button;
}

function triStateButton(row, field, label, card) {
  const button = document.createElement("button");
  button.type = "button";
  const value = row[field] || "blank";
  button.className = `criterion state-${value}${field === "contradiction" ? " contradiction" : ""}`;
  const symbol = value === "yes" ? "✓" : value === "no" ? "×" : "·";
  button.innerHTML = `<span>${label}</span><strong>${symbol}</strong>`;
  button.title = `${label}: ${value === "yes" ? "sí" : value === "no" ? "no" : "sin evaluar"}. Pulsa para cambiar.`;
  button.addEventListener("click", () => {
    const next = value === "blank" ? "yes" : value === "yes" ? "no" : "";
    persist(row, { [field]: next }, card);
  });
  return button;
}

function renderResults() {
  const rows = groupRows();
  elements.results.replaceChildren();
  rows.forEach((row) => {
    const fragment = elements.resultTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".result-card");
    card.dataset.rowIndex = row.row_index;
    if (row.human_score !== "") card.classList.add("reviewed");
    fragment.querySelector(".rank").textContent = state.reviewPlan === "quick" ? "TOP" : `#${row.rank}`;
    fragment.querySelector(".track-title").textContent = row.title;
    fragment.querySelector(".track-meta").textContent = row.album;
    const systems = row.systems || [];
    fragment.querySelector(".model-score").textContent = state.reviewPlan === "quick"
      ? `${systems.length} sistema${systems.length === 1 ? "" : "s"}`
      : `sim ${Number(row.score).toFixed(4)}`;
    const badges = fragment.querySelector(".system-badges");
    systems.forEach((system) => {
      const badge = document.createElement("span");
      badge.className = "system-badge";
      badge.textContent = `${modelLabels[system.model] || system.model} · ${modeLabels[system.mode] || system.mode}`;
      badges.append(badge);
    });
    badges.hidden = systems.length === 0;
    const start = Number(row.best_segment_start);
    const end = Number(row.best_segment_end);
    fragment.querySelector(".segment-time").textContent = `${formatTime(start)}–${formatTime(end)} · ${Math.round(end - start)} s`;
    fragment.querySelector(".play-segment").addEventListener("click", () => playRow(row, false));
    fragment.querySelector(".play-full").addEventListener("click", () => playRow(row, true));

    const scoreButtons = fragment.querySelector(".score-buttons");
    [0, 1, 2, 3].forEach((score) => scoreButtons.append(scoreButton(row, score, card)));
    fragment.querySelector(".clear-score").addEventListener("click", () => persist(row, { human_score: "" }, card));

    const grid = fragment.querySelector(".criteria-grid");
    criteria.forEach(([field, label]) => grid.append(triStateButton(row, field, label, card)));

    const notes = fragment.querySelector(".notes");
    notes.value = row.notes;
    notes.addEventListener("input", () => {
      const prior = state.noteTimers.get(row.row_index);
      if (prior) window.clearTimeout(prior);
      const saveState = card.querySelector(".save-state");
      saveState.textContent = "Escribiendo…";
      saveState.className = "save-state pending";
      state.noteTimers.set(row.row_index, window.setTimeout(() => {
        persist(row, { notes: notes.value }, card);
        state.noteTimers.delete(row.row_index);
      }, 500));
    });
    const saveState = fragment.querySelector(".save-state");
    saveState.textContent = row.human_score === "" ? "Sin puntuar" : `Puntuado ${row.human_score}/3`;
    saveState.className = `save-state${row.human_score === "" ? "" : " saved"}`;
    elements.results.append(fragment);
  });
}

function renderHeader() {
  elements.contextLabel.textContent = state.reviewPlan === "quick"
    ? "Revisión rápida · Top 1 · FIGMA frente a MuQ"
    : `${modelLabels[state.model] || state.model} · ${modeLabels[state.mode] || state.mode}`;
  elements.queryTitle.textContent = state.query;
  const index = state.queries.indexOf(state.query);
  elements.previousQuery.disabled = index <= 0;
  elements.nextQuery.disabled = index >= state.queries.length - 1;
}

function render() {
  renderControls();
  renderProgress();
  renderSidebar();
  renderHeader();
  renderResults();
}

async function persist(row, changes, card) {
  const previous = Object.fromEntries(Object.keys(changes).map((field) => [field, row[field]]));
  Object.assign(row, changes);
  const saveState = card.querySelector(".save-state");
  saveState.textContent = "Guardando…";
  saveState.className = "save-state pending";
  try {
    const response = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        row_index: row.row_index,
        changes,
        propagate_equivalent: state.reviewPlan === "quick",
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "No se pudo guardar");
    state.summary = payload.summary;
    const affected = new Set(payload.row_indices || [row.row_index]);
    state.rows.forEach((sourceRow) => {
      if (affected.has(sourceRow.row_index)) Object.assign(sourceRow, changes);
    });
    state.quickRows.forEach((quickRow) => {
      if (quickRow.equivalent_row_indices.some((index) => affected.has(index))) Object.assign(quickRow, changes);
    });
    saveState.textContent = row.human_score === "" ? "Guardado" : `Puntuado ${row.human_score}/3`;
    saveState.className = "save-state saved";
    card.classList.toggle("reviewed", row.human_score !== "");
    renderProgress();
    renderSidebar();
    if (!("notes" in changes)) renderResults();
    const propagated = affected.size > 1 ? ` y propagados a ${affected.size} filas equivalentes` : "";
    setNotice(`Cambios guardados${propagated} en el CSV.`, "success");
  } catch (error) {
    Object.assign(row, previous);
    saveState.textContent = "Error al guardar";
    saveState.className = "save-state error";
    setNotice(error.message, "error");
  }
}

function playRow(row, fullTrack) {
  const start = fullTrack ? 0 : Number(row.best_segment_start);
  const end = fullTrack ? Number.POSITIVE_INFINITY : Number(row.best_segment_end);
  state.activeRange = { row, start, end, fullTrack };
  const source = new URL(row.audio_url, window.location.href).href;
  const begin = () => {
    elements.audioPlayer.currentTime = start;
    elements.audioPlayer.play().catch((error) => setNotice(`No se pudo reproducir: ${error.message}`, "error"));
  };
  if (elements.audioPlayer.src !== source) {
    elements.audioPlayer.src = source;
    elements.audioPlayer.load();
    elements.audioPlayer.addEventListener("loadedmetadata", begin, { once: true });
  } else {
    begin();
  }
  const rangeLabel = fullTrack ? "pista completa" : `${formatTime(start)}–${formatTime(end)}`;
  elements.nowPlaying.textContent = `${row.title} · ${rangeLabel}`;
  elements.playerPulse.classList.add("active");
}

function moveQuery(offset) {
  const index = state.queries.indexOf(state.query);
  const target = Math.max(0, Math.min(state.queries.length - 1, index + offset));
  state.query = state.queries[target];
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function moveToNextPending() {
  const start = state.queries.indexOf(state.query);
  for (let distance = 1; distance <= state.queries.length; distance += 1) {
    const index = (start + distance) % state.queries.length;
    if (!queryIsComplete(state.queries[index])) {
      state.query = state.queries[index];
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
  }
  setNotice("Todas las consultas de este modelo y modo están puntuadas.", "success");
}

function bindEvents() {
  elements.reviewPlan.addEventListener("change", () => {
    state.reviewPlan = elements.reviewPlan.value;
    render();
    setNotice(
      state.reviewPlan === "quick"
        ? "Modo rápido: 45 escuchas únicas. La relevancia es suficiente; el resto es opcional."
        : "Modo completo activado. Las valoraciones existentes se conservan.",
      "success",
    );
  });
  elements.modelSelect.addEventListener("change", () => {
    state.model = elements.modelSelect.value;
    render();
  });
  elements.modeSelect.addEventListener("change", () => {
    state.mode = elements.modeSelect.value;
    render();
  });
  elements.unreviewedOnly.addEventListener("change", () => {
    state.unreviewedOnly = elements.unreviewedOnly.checked;
    renderSidebar();
  });
  elements.previousQuery.addEventListener("click", () => moveQuery(-1));
  elements.nextQuery.addEventListener("click", () => moveQuery(1));
  elements.nextPending.addEventListener("click", moveToNextPending);
  elements.audioPlayer.addEventListener("timeupdate", () => {
    if (!state.activeRange || !Number.isFinite(state.activeRange.end)) return;
    if (elements.audioPlayer.currentTime >= state.activeRange.end) {
      if (elements.repeatSegment.checked) {
        elements.audioPlayer.currentTime = state.activeRange.start;
        elements.audioPlayer.play();
      } else {
        elements.audioPlayer.pause();
      }
    }
  });
  elements.audioPlayer.addEventListener("pause", () => elements.playerPulse.classList.remove("active"));
  elements.audioPlayer.addEventListener("play", () => elements.playerPulse.classList.add("active"));
  window.addEventListener("keydown", (event) => {
    if (event.target.matches("textarea, input, select, button")) return;
    if (event.key === "ArrowLeft") moveQuery(-1);
    if (event.key === "ArrowRight") moveQuery(1);
  });
}

async function initialize() {
  try {
    const response = await fetch("/api/bootstrap");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "No se pudieron cargar los datos");
    Object.assign(state, payload);
    state.quickRows = payload.quick_review.rows;
    state.model = state.models[0];
    state.mode = state.modes[0];
    state.query = state.queries[0];
    fillSelect(elements.modelSelect, state.models, modelLabels);
    fillSelect(elements.modeSelect, state.modes, modeLabels);
    bindEvents();
    render();
    setNotice("CSV cargado. Las puntuaciones se guardan automáticamente.", "success");
  } catch (error) {
    setNotice(error.message, "error");
    elements.queryTitle.textContent = "No se pudo iniciar el revisor";
  }
}

initialize();
