import { describe, expect, it } from 'vitest';
import {
  assessMatingPotential, ENGINE_CAPABILITIES, evaluateAutomaticOutcome, evaluateClaim,
  parseFen, positionKey, repetitionCount,
} from '../../src/engine';

describe('draw-rule engine facts', () => {
  it('keys repetition identity by placement, side, castling rights, and legal en passant only', () => {
    const start = parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(positionKey(start)).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -');
    expect(positionKey(parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 57 28')))
      .not.toBe(positionKey(start));
    expect(positionKey(parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1')))
      .not.toBe(positionKey(start));
    expect(positionKey(parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 37 22')))
      .toBe(positionKey(start));

    const legalEp = parseFen('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
    expect(positionKey(legalEp)).toBe('4k3/8/8/3pP3/8/8/8/4K3 w - d6');
    const noCapturer = parseFen('4k3/8/8/3p4/8/8/8/4K3 w - d6 0 1');
    expect(positionKey(noCapturer)).toBe('4k3/8/8/3p4/8/8/8/4K3 w - -');
  });

  it('ignores en-passant metadata when the only capture exposes its king', () => {
    const pinnedEp = parseFen('4k3/8/8/4KPpr/8/8/8/8 w - g6 0 1');
    const noEp = parseFen('4k3/8/8/4KPpr/8/8/8/8 w - - 0 1');
    expect(positionKey(pinnedEp)).toBe(positionKey(noEp));
  });

  it('counts supplied history occurrences without owning or inferring that history', () => {
    expect(repetitionCount(['a', 'b', 'a', 'a'], 'a')).toBe(3);
    expect(repetitionCount([], 'a')).toBe(0);
  });

  it('reports checkmate before the 75-move automatic draw', () => {
    const beforeMate = parseFen('7k/5Q2/6K1/8/8/8/8/8 w - - 149 1');
    const afterMate = parseFen('7k/6Q1/6K1/8/8/8/8/8 b - - 150 1');
    expect(evaluateAutomaticOutcome(afterMate, [])).toEqual({ kind: 'checkmate', winner: 'white' });
    expect(evaluateAutomaticOutcome(beforeMate, [])).toBeNull();
  });

  it('detects stalemate and fivefold repetition as automatic draws', () => {
    const stalemate = parseFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    expect(evaluateAutomaticOutcome(stalemate, [])).toEqual({ kind: 'stalemate' });
    const start = parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    const key = positionKey(start);
    expect(evaluateAutomaticOutcome(start, [key, key, key, key, key]))
      .toEqual({ kind: 'fivefold_repetition' });
  });

  it('evaluates current-position and intended-move claims without changing RuleState', () => {
    const state = parseFen('7k/5Q2/6K1/8/8/8/8/8 w - - 99 1');
    const before = JSON.stringify(state);
    expect(evaluateClaim(state, [], { basis: 'fifty_move' }))
      .toEqual({ kind: 'condition-not-met', intendedMove: null });
    expect(evaluateClaim(state, [], {
      basis: 'fifty_move', intendedMove: { from: 13, to: 14 },
    })).toMatchObject({ kind: 'valid', intendedMove: { from: 13, to: 14 } });
    expect(JSON.stringify(state)).toBe(before);
    expect(evaluateClaim(state, [], {
      basis: 'fifty_move', intendedMove: { from: 13, to: 14, promotion: 'queen' },
    })).toMatchObject({ kind: 'illegal-intended-move' });
  });

  it('keeps dead-position detection explicitly unavailable instead of guessing', () => {
    expect(ENGINE_CAPABILITIES.deadPositionDetection).toBe('experimental');
    expect(assessMatingPotential(parseFen('4k3/8/8/8/8/8/8/4K3 w - - 0 1'), 'white', {
      maxNodes: 1000, timeBudgetMs: 10,
    })).toEqual({ kind: 'undetermined', reason: 'NOT_IMPLEMENTED' });
  });
});
