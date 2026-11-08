import { describe, expect, it } from 'vitest';
import { applyLegalMove, legalMoves, parseFen, tryApplyMove } from '../../src/engine';
import { PUBLISHED_PERFT_FIXTURES } from '../fixtures/published-perft';

function perft(fen: string, depth: number): number {
  const state = parseFen(fen);
  if (depth === 0) return 1;
  return legalMoves(state).reduce((nodes, move) => nodes + perftFromState(applyLegalMove(state, move), depth - 1), 0);
}

function perftFromState(state: ReturnType<typeof parseFen>, depth: number): number {
  if (depth === 0) return 1;
  return legalMoves(state).reduce((nodes, move) => nodes + perftFromState(applyLegalMove(state, move), depth - 1), 0);
}

describe('published standard chess perft regression positions', () => {
  it.each(PUBLISHED_PERFT_FIXTURES)('$name matches published counts through depth 3', ({ fen, counts }) => {
    for (let depth = 1; depth <= 3; depth += 1) {
      expect(perft(fen, depth), `${fen} at depth ${depth}`).toBe(Number(counts[depth - 1]));
    }
  }, 120_000);
});

describe('legal move and immutable application consistency', () => {
  it.each(PUBLISHED_PERFT_FIXTURES)('$name generated root moves apply with identical canonical facts', ({ fen }) => {
    const state = parseFen(fen);
    for (const move of legalMoves(state)) {
      const result = tryApplyMove(state, move);
      expect(result.ok, `${fen}: ${move.from}-${move.to} ${move.promotion ?? ''}`).toBe(true);
      if (!result.ok) continue;
      expect(result.move).toEqual(move);
      expect(result.state).toEqual(applyLegalMove(state, move));
      expect(Object.isFrozen(result.state)).toBe(true);
      expect(Object.isFrozen(result.state.board)).toBe(true);
      if (move.capture) {
        expect(state.board[move.capture.square]).toEqual(move.capture.piece);
      }
    }
  });

  it('keeps en-passant canonical facts and application identical', () => {
    const state = parseFen('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
    const move = legalMoves(state).find((candidate) => candidate.from === 28 && candidate.to === 19);
    expect(move?.capture).toMatchObject({ square: 27, piece: { side: 'black', type: 'pawn' } });
    if (!move) return;
    const result = tryApplyMove(state, move);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.move).toEqual(move);
    expect(result.state).toEqual(applyLegalMove(state, move));
    expect(result.state.board[27]).toBeNull();
    expect(state.board[27]).toMatchObject({ side: 'black', type: 'pawn' });
  });
});
