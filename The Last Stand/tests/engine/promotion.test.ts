import { describe, expect, it } from 'vitest';
import {
  applyLegalMove, internPiece, isInCheck, legalMoves, parseFen, toFen, tryApplyMove,
} from '../../src/engine';
import type { RuleState } from '../../src/engine';
import { PROMOTION_POSITION_4_FEN, PROMOTION_POSITION_4_PERFT } from '../fixtures/m2-promotion';

const square = (name: string) => (8 - Number(name[1])) * 8 + name.charCodeAt(0) - 97;
const choices = ['queen', 'rook', 'bishop', 'knight'] as const;

function perft(state: RuleState, depth: number): number {
  if (depth === 0) return 1;
  return legalMoves(state).reduce((nodes, move) => nodes + perft(applyLegalMove(state, move), depth - 1), 0);
}

describe('pawn promotion', () => {
  it('generates four distinct quiet promotions and applies each as an interned piece', () => {
    const start = parseFen('4k3/6P1/8/8/8/8/8/4K3 w - - 0 1');
    const beforeBoard = start.board;
    const moves = legalMoves(start).filter((move) => move.from === square('g7') && move.to === square('g8'));
    expect(moves.map((move) => move.promotion).sort()).toEqual([...choices].sort());
    for (const promotion of choices) {
      const result = tryApplyMove(start, { from: square('g7'), to: square('g8'), promotion });
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.move.promotion).toBe(promotion);
      expect(result.state.board[square('g8')]).toBe(internPiece('white', promotion));
      expect(Object.isFrozen(result.state.board[square('g8')])).toBe(true);
      expect(result.state.board[square('g7')]).toBeNull();
      expect(Object.isFrozen(result.state.board)).toBe(true);
    }
    expect(start.board).toBe(beforeBoard);
    expect(start.board[square('g7')]).toBe(internPiece('white', 'pawn'));
  });

  it('supports capture promotion and preserves the captured piece and square', () => {
    const start = parseFen('k6r/6P1/8/8/8/8/8/4K3 w - - 0 1');
    const moves = legalMoves(start).filter((move) => move.from === square('g7') && move.to === square('h8'));
    expect(moves.map((move) => move.promotion).sort()).toEqual([...choices].sort());
    const result = tryApplyMove(start, { from: square('g7'), to: square('h8'), promotion: 'knight' });
    expect(result).toMatchObject({ ok: true, move: {
      promotion: 'knight', capture: { square: square('h8'), piece: { side: 'black', type: 'rook' } },
    } });
    if (result.ok) expect(result.state.board[square('h8')]).toBe(internPiece('white', 'knight'));
  });

  it('marks promotion checks and recognizes a promotion checkmate from available APIs', () => {
    const checking = parseFen('k7/2P5/8/8/8/8/8/1K6 w - - 0 1');
    const checkingMove = legalMoves(checking).find((move) =>
      move.from === square('c7') && move.to === square('c8') && move.promotion === 'rook');
    expect(checkingMove?.givesCheck).toBe(true);

    const mating = parseFen('k7/2P5/1K6/8/8/8/8/8 w - - 0 1');
    const mate = applyLegalMove(mating, { from: square('c7'), to: square('c8'), promotion: 'queen' });
    expect(isInCheck(mate, 'black')).toBe(true);
    expect(legalMoves(mate)).toHaveLength(0);
    expect(toFen(mate)).toBe('k1Q5/8/1K6/8/8/8/8/8 b - - 0 1');
  });

  it('requires an explicit legal promotion choice and rejects invalid choices', () => {
    const start = parseFen('4k3/6P1/8/8/8/8/8/4K3 w - - 0 1');
    expect(tryApplyMove(start, { from: square('g7'), to: square('g8') })).toMatchObject({
      ok: false, error: { code: 'PROMOTION_REQUIRED' },
    });
    for (const promotion of ['king', 'pawn']) {
      expect(tryApplyMove(start, {
        from: square('g7'), to: square('g8'), promotion: promotion as never,
      })).toMatchObject({ ok: false, error: { code: 'INVALID_PROMOTION' } });
    }
    expect(tryApplyMove(start, {
      from: square('e1'), to: square('e2'), promotion: 'queen',
    })).toMatchObject({ ok: false, error: { code: 'INVALID_PROMOTION' } });
  });

  it('allows a capture promotion to resolve check but rejects a promotion that leaves check', () => {
    const checkResolved = parseFen('4r2k/3P4/8/8/8/8/8/4K3 w - - 0 1');
    expect(isInCheck(checkResolved, 'white')).toBe(true);
    const capturePromotion = tryApplyMove(checkResolved, {
      from: square('d7'), to: square('e8'), promotion: 'queen',
    });
    expect(capturePromotion.ok).toBe(true);
    if (capturePromotion.ok) expect(isInCheck(capturePromotion.state, 'white')).toBe(false);

    const notResolved = parseFen('4r2k/P7/8/8/8/8/8/4K3 w - - 0 1');
    expect(isInCheck(notResolved, 'white')).toBe(true);
    expect(legalMoves(notResolved).some((move) => move.from === square('a7') && move.to === square('a8'))).toBe(false);
    expect(tryApplyMove(notResolved, {
      from: square('a7'), to: square('a8'), promotion: 'queen',
    })).toMatchObject({ ok: false, error: { code: 'ILLEGAL_MOVE' } });
  });

  it('prints the promoted piece correctly in FEN', () => {
    const start = parseFen('4k3/6P1/8/8/8/8/8/4K3 w - - 0 1');
    const after = applyLegalMove(start, { from: square('g7'), to: square('g8'), promotion: 'queen' });
    expect(toFen(after)).toBe('4k1Q1/8/8/8/8/8/8/4K3 b - - 0 1');
  });

  it('matches published promotion Position 4 perft counts through depth three', () => {
    const start = parseFen(PROMOTION_POSITION_4_FEN);
    expect(perft(start, 1)).toBe(PROMOTION_POSITION_4_PERFT[0]);
    expect(perft(start, 2)).toBe(PROMOTION_POSITION_4_PERFT[1]);
    expect(perft(start, 3)).toBe(PROMOTION_POSITION_4_PERFT[2]);
  });
});
