import { describe, expect, it } from 'vitest';
import { applyLegalMove, isInCheck, legalMoves, parseFen } from '../../src/engine';
import { adjudicatePendingMatch, commitMove, createMatch, replayMatch } from '../../src/match';
import type { MatchEvent } from '../../src/match';

describe('pending dead-position adjudication', () => {
  it('keeps a new nonterminal match pending until a verified LIVE result', async () => {
    const match = createMatch({ gameId: 'pending-live', initialState: parseFen('7k/8/5KQ1/8/8/8/8/8 w - - 0 1') });
    expect(legalMoves(match.state).some((move) => {
      const after = applyLegalMove(match.state, move);
      return legalMoves(after).length === 0 && isInCheck(after, after.sideToMove);
    })).toBe(true);
    expect(match.status).toBe('adjudication-pending');
    const blocked = commitMove(match, { from: 52, to: 36 });
    expect(blocked.ok).toBe(false);
    const resolved = await adjudicatePendingMatch(match, { maxNodes: 100_000, timeBudgetMs: 2_000 });
    expect(resolved.outcome.kind).toBe('LIVE');
    expect(resolved.match.status).toBe('in-progress');
    expect(resolved.match.events.at(-1)?.kind).toBe('adjudication');
    const firstMove = commitMove(resolved.match, { from: 22, to: 30 });
    expect(firstMove.ok).toBe(true);
    if (!firstMove.ok) return;
    expect(firstMove.match.status).toBe('adjudication-pending');
    expect(commitMove(firstMove.match, { from: 7, to: 15 }).ok).toBe(false);
  }, 30_000);

  it('records DEAD only after exhaustive proof and verifies it during replay', async () => {
    const match = createMatch({ gameId: 'pending-dead', initialState: parseFen('4k3/8/8/8/8/8/8/4K3 w - - 0 1') });
    const resolved = await adjudicatePendingMatch(match);
    expect(resolved.outcome.kind).toBe('DEAD');
    expect(resolved.match.result).toEqual({ outcome: 'draw', reason: 'dead_position' });
    expect(resolved.match.events.slice(-2).map((event) => event.kind)).toEqual(['adjudication', 'result']);
    await expect(replayMatch({ gameId: 'pending-dead', initialState: match.initialState }, resolved.match.events)).resolves.toEqual(resolved.match);
    const livePosition = parseFen('7k/8/5KQ1/8/8/8/8/8 w - - 0 1');
    const fabricated = [{ kind: 'adjudication' as const, gameId: 'forged-dead', eventSeq: 1, ply: 0,
      outcome: 'DEAD' as const, matingSide: null, witness: null }];
    await expect(replayMatch({ gameId: 'forged-dead', initialState: livePosition }, fabricated)).rejects.toThrow();
  }, 30_000);

  it('leaves cancellation and detector errors pending', async () => {
    const match = createMatch({ gameId: 'pending-cancel', initialState: parseFen('4k3/8/8/8/8/8/8/4K3 w - - 0 1') });
    const cancelled = await adjudicatePendingMatch(match, { signal: AbortSignal.abort() });
    expect(cancelled.outcome.kind).toBe('UNDETERMINED');
    expect(cancelled.match.status).toBe('adjudication-pending');
    const errored = await adjudicatePendingMatch(match, { detector: async () => { throw new Error('worker failed'); } });
    expect(errored.outcome.kind).toBe('UNDETERMINED');
    expect(errored.match).toBe(match);
  });
});
