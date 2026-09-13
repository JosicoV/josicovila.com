import { barsToBeats, beatsPerBar, type MidiNote, type TimeSignature } from '../project';

export type SuggestionVariation = 'low' | 'medium' | 'high';
export interface CompositionSuggestionRequest {
  tempo: number;
  timeSignature: TimeSignature;
  barsRequested: 1 | 2;
  variation: SuggestionVariation;
  instrumentId?: string;
  notes: MidiNote[];
  insertionBeat: number;
  seed?: number;
}
export interface CompositionSuggestionResult { proposalId: string; notes: Array<Omit<MidiNote, 'id'>>; }
export interface CompositionAssistant { suggestContinuation(request: CompositionSuggestionRequest): Promise<CompositionSuggestionResult>; }

export class InsufficientCompositionContextError extends Error {}

export class LocalRuleBasedCompositionAssistant implements CompositionAssistant {
  async suggestContinuation(request: CompositionSuggestionRequest): Promise<CompositionSuggestionResult> {
    const source = request.notes.filter((note) => note.startBeat + note.durationBeats <= request.insertionBeat)
      .sort((a, b) => a.startBeat - b.startBeat).slice(-24);
    if (source.length < 3) throw new InsufficientCompositionContextError('Add a few notes first so JV Studio has something to continue from.');
    const bar = beatsPerBar(request.timeSignature);
    const length = barsToBeats(request.barsRequested, request.timeSignature);
    const windowStart = Math.max(0, request.insertionBeat - bar * 4);
    const context = source.filter((note) => note.startBeat >= windowStart);
    const rhythm = context.length >= 3 ? context.slice(-Math.min(8, context.length)).map((note) => note.durationBeats) : [0.5, 0.5, 1];
    const pitches = context.map((note) => note.midi);
    const maxStep = request.variation === 'low' ? 3 : request.variation === 'high' ? 7 : 5;
    const pitchClassWeights = new Map<number, number>();
    for (const pitch of pitches) pitchClassWeights.set(pitch % 12, (pitchClassWeights.get(pitch % 12) ?? 0) + 1);
    const preferredClasses = [...pitchClassWeights.entries()].sort((a, b) => b[1] - a[1]).map(([pitchClass]) => pitchClass);
    const lastPitch = pitches[pitches.length - 1];
    const previousPitch = pitches.length > 1 ? pitches[pitches.length - 2] : lastPitch;
    const contour = Math.max(-maxStep, Math.min(maxStep, lastPitch - previousPitch));
    const output: Array<Omit<MidiNote, 'id'>> = [];
    let seed = (request.seed ?? 1) >>> 0;
    const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
    let beat = request.insertionBeat;
    let index = 0;
    while (beat < request.insertionBeat + length - Number.EPSILON && output.length < 32) {
      const duration = Math.min(Math.max(0.125, rhythm[index % rhythm.length]), request.insertionBeat + length - beat);
      const targetClass = preferredClasses[index % Math.max(1, Math.min(preferredClasses.length, request.variation === 'high' ? 4 : 2))] ?? (lastPitch % 12);
      const octave = Math.round((lastPitch - targetClass) / 12);
      const tonalPitch = targetClass + octave * 12;
      const direction = contour === 0 ? (random() < 0.5 ? -1 : 1) : Math.sign(contour);
      const offset = Math.max(-maxStep, Math.min(maxStep, tonalPitch - lastPitch + direction * Math.floor(random() * 2)));
      const pitch = Math.max(0, Math.min(127, lastPitch + offset));
      output.push({ midi: pitch, startBeat: beat, durationBeats: duration, velocity: Math.max(0.2, Math.min(1, context[index % context.length].velocity)) });
      beat += duration;
      index += 1;
    }
    return { proposalId: `local-${Date.now().toString(36)}-${index}`, notes: output };
  }
}

export function validateCompositionSuggestion(result: CompositionSuggestionResult, request: CompositionSuggestionRequest): CompositionSuggestionResult {
  const end = request.insertionBeat + barsToBeats(request.barsRequested, request.timeSignature);
  const notes = result.notes.filter((note) => Number.isFinite(note.midi) && Number.isFinite(note.startBeat) && Number.isFinite(note.durationBeats)
    && Number.isFinite(note.velocity) && Number.isInteger(note.midi) && note.midi >= 0 && note.midi <= 127
    && note.startBeat >= request.insertionBeat && note.durationBeats > 0 && note.startBeat + note.durationBeats <= end + Number.EPSILON)
    .map((note, index) => ({ ...note, id: `suggested-${index}`, velocity: Math.max(0, Math.min(1, note.velocity)) }));
  if (!notes.length) throw new Error('The composition suggestion was outside the requested range.');
  return { proposalId: result.proposalId, notes };
}
