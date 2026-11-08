import { describe, expect, it } from 'vitest';
import { applyLegalMove, createInitialRuleState, createRuleState, legalMoves } from '../../src/engine';
import type { Piece } from '../../src/engine';

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

  it('interns and freezes pieces and owns a defensive copy of a supplied board', () => {
    const mutablePiece: { side: 'white'; type: 'king' | 'queen' } = { side: 'white', type: 'king' };
    const inputBoard = Array(64).fill(null) as (Piece | null)[];
    inputBoard[60] = mutablePiece;
    const state = createRuleState({ board: inputBoard, sideToMove: 'white' });

    inputBoard[60] = null;
    inputBoard[4] = mutablePiece;
    mutablePiece.type = 'queen';

    expect(state.board[60]).toEqual({ side: 'white', type: 'king' });
    expect(state.board[4]).toBeNull();
    expect(Object.isFrozen(state.board)).toBe(true);
    expect(Object.isFrozen(state.board[60])).toBe(true);
    expect(state.board[60]).toBe(createInitialRuleState().board[60]);
    expect(() => { (state.board as unknown[])[60] = null; }).toThrow();
  });
});
