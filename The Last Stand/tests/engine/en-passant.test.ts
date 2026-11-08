import { describe, expect, it } from 'vitest';
import {
  applyLegalMove, isInCheck, legalMoves, parseFen, toFen, tryApplyMove, validateEnginePosition,
} from '../../src/engine';
import type { RuleState } from '../../src/engine';
import { EN_PASSANT_POSITION_3_FEN, EN_PASSANT_POSITION_3_PERFT } from '../fixtures/m2-en-passant';

const square = (name: string) => (8 - Number(name[1])) * 8 + name.charCodeAt(0) - 97;
const hasMove = (state: RuleState, from: string, to: string) =>
  legalMoves(state).some((move) => move.from === square(from) && move.to === square(to));

function perft(state: RuleState, depth: number): number {
  if (depth === 0) return 1;
  return legalMoves(state).reduce((nodes, move) => nodes + perft(applyLegalMove(state, move), depth - 1), 0);
}

describe('en-passant legality and transitions', () => {
  it('generates en passant only when the target and adjacent pawns allow it', () => {
    const legal = parseFen('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
    expect(hasMove(legal, 'e5', 'd6')).toBe(true);

    const noAdjacentCapturer = parseFen('4k3/8/8/3p4/8/8/8/4K3 w - d6 0 1');
    expect(hasMove(noAdjacentCapturer, 'e5', 'd6')).toBe(false);
    expect(toFen(noAdjacentCapturer)).toContain(' w - d6 0 1');

    const staleTarget = parseFen('4k3/8/8/8/8/8/8/4K3 w - d6 0 1');
    expect(validateEnginePosition(staleTarget)).toMatchObject({
      valid: false,
      errors: [{ code: 'ENGINE_POSITION_EN_PASSANT_PAWN_MISSING' }],
    });
  });

  it('captures the pawn on its actual square and reports canonical capture facts', () => {
    const before = parseFen('4k3/8/8/3pP3/8/8/8/4K3 w - d6 7 1');
    const result = tryApplyMove(before, {
      from: square('e5'), to: square('d6'), captureSquare: square('d5'),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.move.capture).toMatchObject({
      square: square('d5'),
      piece: { side: 'black', type: 'pawn' },
    });
    expect(result.state.board[square('d5')]).toBeNull();
    expect(result.state.board[square('d6')]).toMatchObject({ side: 'white', type: 'pawn' });
    expect(result.state.enPassantTarget).toBeNull();
    expect(result.state.halfmoveClock).toBe(0);
    expect(before.board[square('d5')]).toMatchObject({ side: 'black', type: 'pawn' });
  });

  it('rejects en passant when moving both pawns exposes the king', () => {
    const exposedRook = parseFen('k7/8/8/K4Ppr/8/8/8/8 w - g6 0 1');
    expect(hasMove(exposedRook, 'f5', 'g6')).toBe(false);
    expect(tryApplyMove(exposedRook, {
      from: square('f5'), to: square('g6'), captureSquare: square('g5'),
    })).toMatchObject({ ok: false, error: { code: 'ILLEGAL_MOVE' } });
  });

  it('allows en passant to resolve check from the pawn being captured', () => {
    const inCheck = parseFen('4k3/8/8/3pP3/4K3/8/8/8 w - d6 0 1');
    expect(validateEnginePosition(inCheck).valid).toBe(true);
    expect(isInCheck(inCheck, 'white')).toBe(true);
    expect(hasMove(inCheck, 'e5', 'd6')).toBe(true);
    const after = applyLegalMove(inCheck, { from: square('e5'), to: square('d6') });
    expect(after.board[square('d5')]).toBeNull();
    expect(isInCheck(after, 'white')).toBe(false);
    expect(legalMoves(after).length).toBeGreaterThan(0);
  });

  it('sets the target after a double push, then clears it after the next move', () => {
    const start = parseFen('4k3/8/8/8/5p2/8/6P1/4K3 w - - 0 1');
    const afterDoublePush = applyLegalMove(start, { from: square('g2'), to: square('g4') });
    expect(toFen(afterDoublePush)).toContain(' b - g3 0 1');
    expect(hasMove(afterDoublePush, 'f4', 'g3')).toBe(true);
    const afterOtherMove = applyLegalMove(afterDoublePush, { from: square('e8'), to: square('e7') });
    expect(afterOtherMove.enPassantTarget).toBeNull();
    expect(toFen(afterOtherMove)).toContain(' w - - 1 2');
  });

  it('matches published Position 3 perft counts through depth three', () => {
    const start = parseFen(EN_PASSANT_POSITION_3_FEN);
    expect(perft(start, 1)).toBe(EN_PASSANT_POSITION_3_PERFT[0]);
    expect(perft(start, 2)).toBe(EN_PASSANT_POSITION_3_PERFT[1]);
    expect(perft(start, 3)).toBe(EN_PASSANT_POSITION_3_PERFT[2]);
  });
});
