import { describe, expect, it } from 'vitest';
import { createNote } from '../project';
import { InsufficientCompositionContextError, LocalRuleBasedCompositionAssistant, validateCompositionSuggestion } from './assistant';

const notes = [0, 1, 2].map((startBeat, index) => createNote({ id: `n${index}`, midi: 60 + index * 2, startBeat, durationBeats: 1, velocity: .7 }));
describe('local composition assistant', () => {
  it('requires existing musical context', async () => { await expect(new LocalRuleBasedCompositionAssistant().suggestContinuation({ tempo: 120, timeSignature: [4, 4], barsRequested: 1, variation: 'medium', notes: notes.slice(0, 2), insertionBeat: 4 })).rejects.toBeInstanceOf(InsufficientCompositionContextError); });
  it('generates bounded notes after the insertion point', async () => { const request = { tempo: 120, timeSignature: [4, 4] as [number, number], barsRequested: 2 as const, variation: 'medium' as const, notes, insertionBeat: 4 }; const result = await new LocalRuleBasedCompositionAssistant().suggestContinuation(request); const validated = validateCompositionSuggestion(result, request); expect(validated.notes.every((note) => note.startBeat >= 4 && note.startBeat + note.durationBeats <= 12)).toBe(true); });
  it('changes the proposal when the generation seed changes', async () => { const assistant = new LocalRuleBasedCompositionAssistant(); const request = { tempo: 120, timeSignature: [4, 4] as [number, number], barsRequested: 1 as const, variation: 'medium' as const, notes, insertionBeat: 4 }; const first = await assistant.suggestContinuation({ ...request, seed: 1 }); const second = await assistant.suggestContinuation({ ...request, seed: 2 }); expect(second.notes).not.toEqual(first.notes); });
  it('rejects invalid engine output', () => { const request = { tempo: 120, timeSignature: [4, 4] as [number, number], barsRequested: 1 as const, variation: 'low' as const, notes, insertionBeat: 4 }; expect(() => validateCompositionSuggestion({ proposalId: 'x', notes: [{ midi: 200, startBeat: 4, durationBeats: 1, velocity: 1 }] }, request)).toThrow(); });
});
