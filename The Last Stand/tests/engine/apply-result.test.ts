import { describe, expect, it } from 'vitest';
import { applyLegalMove, createInitialRuleState, legalMoves, tryApplyMove } from '../../src/engine';

describe('canonical move application results', () => {
  it('returns canonical move facts and shares the same transition as the wrapper', () => {
    const state = createInitialRuleState();
    const input = { from: 52, to: 36 };
    const result = tryApplyMove(state, input);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected legal move');
    expect(result.move).toMatchObject({ from: 52, to: 36, piece: { side: 'white', type: 'pawn' }, capture: null, givesCheck: false });
    expect(applyLegalMove(state, input)).toEqual(result.state);
    expect(legalMoves(state)).toContainEqual(result.move);
  });

  it('reports stable failure codes and the wrapper throws the structured failure', () => {
    const state = createInitialRuleState();
    const result = tryApplyMove(state, { from: 52, to: 28 });
    expect(result).toMatchObject({ ok: false, error: { code: 'ILLEGAL_MOVE' } });
    expect(() => applyLegalMove(state, { from: 52, to: 28 })).toThrowError(expect.objectContaining({ code: 'ILLEGAL_MOVE' }));
  });

  it('updates FEN clocks and retains the target after an ordinary double pawn push', () => {
    const state = createInitialRuleState();
    const next = applyLegalMove(state, { from: 52, to: 36 });
    expect(next.enPassantTarget).toBe(44);
    expect(next.halfmoveClock).toBe(0);
    expect(next.fullmoveNumber).toBe(1);
  });
});
