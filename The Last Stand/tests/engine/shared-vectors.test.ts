import { describe, expect, it } from 'vitest';
import { applyLegalMove, createInitialRuleState, legalMoves } from '../../src/engine';

function perft(state: ReturnType<typeof createInitialRuleState>, depth: number): number {
  if (depth === 0) return 1;
  return legalMoves(state).reduce(
    (nodes, move) => nodes + perft(applyLegalMove(state, move), depth - 1),
    0,
  );
}

describe('shared M1 engine vectors', () => {
  it('generates 20 legal moves in the initial position', () => {
    expect(legalMoves(createInitialRuleState())).toHaveLength(20);
  });

  it('matches initial-position perft through depth two', () => {
    expect(perft(createInitialRuleState(), 2)).toBe(400);
  });
});
