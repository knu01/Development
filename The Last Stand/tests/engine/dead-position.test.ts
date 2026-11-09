import { describe, expect, it } from 'vitest';
import { detectDeadPosition, legalMoves, parseFen, tryApplyMove } from '../../src/engine';

describe('exhaustive dead-position detector', () => {
  it('proves bare kings dead by exhausting both sides’ reachable graph', async () => {
    const result = await detectDeadPosition(parseFen('4k3/8/8/8/8/8/8/4K3 w - - 0 1'), { batchSize: 2000 });
    expect(result.kind).toBe('DEAD');
    if (result.kind === 'DEAD') expect(result.nodes).toBeGreaterThan(0);
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
});
