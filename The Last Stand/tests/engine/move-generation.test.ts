import { describe, expect, it } from 'vitest';
import { isInCheck, legalMoves } from '../../src/engine';
import { position, square } from '../fixtures/m1-vectors';

const hasMove = (rows: readonly string[], from: string, to: string, side: 'white' | 'black' = 'white') =>
  legalMoves(position(rows, side)).some((move) => move.from === square(from[0], Number(from[1])) && move.to === square(to[0], Number(to[1])));

describe('ordinary legal move generation', () => {
  it('moves a pawn one or two squares from its starting rank', () => {
    const rows = ['....k...', '........', '........', '........', '........', '........', '....P...', 'K.......'];
    expect(hasMove(rows, 'e2', 'e3')).toBe(true);
    expect(hasMove(rows, 'e2', 'e4')).toBe(true);
  });

  it('does not treat a promotion-required pawn move as an ordinary move', () => {
    const rows = ['.......k', '....P...', '........', '........', '........', '........', '........', 'K.......'];
    expect(hasMove(rows, 'e7', 'e8')).toBe(false);
  });

  it('moves knights without being blocked by adjacent pieces', () => {
    const rows = ['.......k', '........', '........', '........', '........', '........', '...NP...', 'K.......'];
    expect(hasMove(rows, 'd2', 'e4')).toBe(true);
    expect(hasMove(rows, 'd2', 'c4')).toBe(true);
  });

  it('moves bishops, rooks, and queens along clear rays and stops at blockers', () => {
    const bishop = ['.......k', '........', '........', '........', '........', '........', '.B......', 'K.......'];
    const rook = ['.......k', '........', '........', '........', '........', '........', '.R......', 'K.......'];
    const queen = ['.......k', '........', '........', '........', '........', '........', '.Q......', 'K.......'];
    expect(hasMove(bishop, 'b2', 'e5')).toBe(true);
    expect(hasMove(rook, 'b2', 'b7')).toBe(true);
    expect(hasMove(queen, 'b2', 'e5')).toBe(true);
    expect(hasMove(queen, 'b2', 'b7')).toBe(true);
  });

  it('allows king steps that are not attacked', () => {
    const rows = ['.......k', '........', '........', '........', '........', '........', '........', '....K...'];
    expect(hasMove(rows, 'e1', 'e2')).toBe(true);
  });

  it('filters moves that leave the king in check from a pin', () => {
    const rows = ['....r..k', '........', '........', '........', '........', '........', '....R...', '....K...'];
    expect(hasMove(rows, 'e2', 'd2')).toBe(false);
    expect(hasMove(rows, 'e2', 'e3')).toBe(true);
  });

  it('recognizes check and permits a move that blocks the checking ray', () => {
    const rows = ['....r..k', '........', '........', '........', '........', '........', '...B....', '....K...'];
    const state = position(rows);
    expect(isInCheck(state, 'white')).toBe(true);
    expect(legalMoves(state).some((move) => move.from === square('d', 2) && move.to === square('e', 3))).toBe(true);
  });

  it('does not allow a side to capture its own piece or move a slider through a blocker', () => {
    const rows = ['.......k', '........', '........', '........', '........', '........', 'R.P.....', 'K.......'];
    expect(hasMove(rows, 'a2', 'c2')).toBe(false);
    expect(hasMove(rows, 'a2', 'a1')).toBe(false);
  });
});
