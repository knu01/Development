import { describe, expect, it } from 'vitest';
import { detectDeadPosition, legalMoves, parseFen, positionKey, tryApplyMove } from '../../src/engine';

describe('exhaustive dead-position detector', () => {
  it('proves bare kings dead by exhausting both sides’ reachable graph', async () => {
    const result = await detectDeadPosition(parseFen('4k3/8/8/8/8/8/8/4K3 w - - 0 1'), { batchSize: 2000 });
    expect(result.kind).toBe('DEAD');
    if (result.kind === 'DEAD') {
      expect(result.nodes).toBeGreaterThan(0);
      expect(result.sideNodes.white).toBeGreaterThan(0);
      expect(result.sideNodes.black).toBeGreaterThan(0);
    }
  }, 30000);

  it('returns a production-legal replayable witness for a mating-capable position', async () => {
    const state = parseFen('4k3/8/8/8/8/8/6Q1/4K3 w - - 0 1');
    const result = await detectDeadPosition(state);
    expect(result.kind).toBe('LIVE');
    if (result.kind !== 'LIVE') return;
    let current = state;
    for (const move of result.witness) {
      expect(legalMoves(current).some((legal) => legal.from === move.from && legal.to === move.to && legal.promotion === move.promotion)).toBe(true);
      const applied = tryApplyMove(current, move);
      expect(applied.ok).toBe(true);
      if (!applied.ok) return;
      current = applied.state;
    }
    expect(legalMoves(current)).toHaveLength(0);
  }, 30000);

  it('never treats cancellation as a definitive classification', async () => {
    const result = await detectDeadPosition(parseFen('4k3/8/8/8/8/8/8/4K3 w - - 0 1'), { shouldCancel: () => true });
    expect(result.kind).toBe('UNDETERMINED');
  });

  it('returns UNDETERMINED when a node budget is exhausted', async () => {
    const result = await detectDeadPosition(parseFen('4k3/8/8/8/8/8/6N1/4K3 w - - 0 1'), { maxNodes: 1, timeBudgetMs: 30_000 });
    expect(result).toMatchObject({ kind: 'UNDETERMINED', reason: 'RESOURCE_LIMIT' });
  });

  it('uses all rule-relevant identity fields and omits clocks', () => {
    const bareKings = '4k3/8/8/8/8/8/8/4K3 w - -';
    expect(positionKey(parseFen(`${bareKings} 0 1`))).toBe(positionKey(parseFen(`${bareKings} 99 70`)));

    const rooks = 'r3k2r/8/8/8/8/8/8/R3K2R w';
    expect(positionKey(parseFen(`${rooks} KQkq - 0 1`))).not.toBe(positionKey(parseFen(`${rooks} - - 0 1`)));

    const ep = '4k3/8/8/3pP3/8/8/8/4K3 w -';
    expect(positionKey(parseFen(`${ep} d6 0 1`))).not.toBe(positionKey(parseFen(`${ep} - 0 1`)));
    const pinned = '8/8/8/KPp4r/8/8/8/7k w -';
    expect(positionKey(parseFen(`${pinned} c6 0 1`))).toBe(positionKey(parseFen(`${pinned} - 0 1`)));
  });
});
