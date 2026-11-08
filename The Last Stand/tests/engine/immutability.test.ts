import { describe, expect, it } from 'vitest';
import { applyLegalMove, createInitialRuleState, legalMoves } from '../../src/engine';

describe('immutable RuleState operations', () => {
  it('does not change the input state or its board when applying a move', () => {
    const before = createInitialRuleState();
    const originalBoard = before.board.map((piece) => piece && { ...piece });
    const next = applyLegalMove(before, legalMoves(before)[0]);

    expect(before.board).toEqual(originalBoard);
    expect(before.sideToMove).toBe('white');
    expect(next).not.toBe(before);
    expect(next.board).not.toBe(before.board);
  });

  it('rejects an illegal move without mutating the prior state', () => {
    const before = createInitialRuleState();
    expect(() => applyLegalMove(before, { from: 52, to: 28 })).toThrow();
    expect(before.sideToMove).toBe('white');
    expect(before.board[52]).toEqual({ side: 'white', type: 'pawn' });
    expect(before.board[36]).toBeNull();
  });
});
