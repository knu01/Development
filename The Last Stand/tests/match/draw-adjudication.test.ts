import { describe, expect, it } from 'vitest';
import { parseFen, positionKey } from '../../src/engine';
import { claimDraw, commitMove, createMatch, replayMatch } from '../../src/match';
import type { Match, MatchEvent, MoveInput } from '../../src/match';

const square = (name: string) => (8 - Number(name[1])) * 8 + name.charCodeAt(0) - 97;
const move = (from: string, to: string): MoveInput => ({ from: square(from), to: square(to) });
const play = (match: Match, moves: readonly MoveInput[]): Match => {
  let current = match;
  for (const input of moves) {
    const transition = commitMove(current, input);
    if (!transition.ok) throw new Error(`Move rejected: ${transition.error.kind}`);
    current = transition.match;
  }
  return current;
};
const knightCycle = [move('g1', 'f3'), move('g8', 'f6'), move('f3', 'g1'), move('f6', 'g8')];

describe('Match draw rules and replay', () => {
  it('starts repetition history from the current FEN position only', () => {
    const initialState = parseFen('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    const match = createMatch({ gameId: 'fen-history', initialState });
    expect(match.positionHistory).toEqual([positionKey(initialState)]);
    expect(match.positionHistory).toHaveLength(1);
  });

  it('tracks shuffle repetition counts and permits a claim before the third occurrence move', () => {
    let match = play(createMatch({ gameId: 'threefold' }), [...knightCycle, ...knightCycle.slice(0, 3)]);
    const before = match;
    const claim = claimDraw(match, { claimant: 'black', basis: 'threefold', intendedMove: move('f6', 'g8') });
    expect(claim.ok).toBe(true);
    if (!claim.ok) return;
    expect(claim.match.events.at(-2)).toMatchObject({
      kind: 'claim', outcome: 'accepted', intendedMoveExecuted: false,
    });
    expect(claim.match.events.at(-1)).toMatchObject({
      kind: 'result', result: { outcome: 'draw', reason: 'threefold_claim' },
    });
    expect(claim.match.events.slice(-2).map(({ eventSeq, ply }) => [eventSeq, ply])).toEqual([[8, 7], [9, 7]]);
    expect(claim.match.nextEventSeq).toBe(10);
    expect(claim.match.state).toEqual(before.state);
    expect(claim.match.ply).toBe(before.ply);
  });

  it('accepts a current threefold claim after the third occurrence', () => {
    const match = play(createMatch({ gameId: 'threefold-current' }), [...knightCycle, ...knightCycle]);
    expect(match.positionHistory.filter((key) => key === positionKey(match.state))).toHaveLength(3);
    const claim = claimDraw(match, { claimant: 'white', basis: 'threefold' });
    expect(claim.ok).toBe(true);
    if (!claim.ok) return;
    expect(claim.claimEvent.outcome).toBe('accepted');
    expect(claim.match.result).toEqual({ outcome: 'draw', reason: 'threefold_claim' });
  });

  it('rejects a current threefold claim when the position occurred only once', () => {
    const match = createMatch({ gameId: 'threefold-invalid' });
    const claim = claimDraw(match, { claimant: 'white', basis: 'threefold' });
    expect(claim.ok).toBe(true);
    if (!claim.ok) return;
    expect(claim.claimEvent.outcome).toBe('rejected_condition_not_met');
    expect(claim.match.status).toBe('in-progress');
  });

  it('executes a legal intended move when an intended threefold claim is incorrect', () => {
    const match = createMatch({ gameId: 'threefold-intended-invalid' });
    const claim = claimDraw(match, { claimant: 'white', basis: 'threefold', intendedMove: move('e2', 'e4') });
    expect(claim.ok).toBe(true);
    if (!claim.ok) return;
    expect(claim.match.events.slice(-2).map((event) => event.kind)).toEqual(['claim', 'move']);
    expect(claim.claimEvent.outcome).toBe('rejected_condition_not_met');
    expect(claim.claimEvent.intendedMoveExecuted).toBe(true);
    expect(claim.match.ply).toBe(1);
  });

  it('records two, three, four, and five occurrences at plies 4, 8, 12, and 16', () => {
    let match = createMatch({ gameId: 'fivefold' });
    const counts = new Map<number, number>();
    for (let cycle = 1; cycle <= 4; cycle += 1) {
      match = play(match, knightCycle);
      counts.set(match.ply, match.positionHistory.filter((key) => key === positionKey(match.state)).length);
    }
    expect([...counts.entries()]).toEqual([[4, 2], [8, 3], [12, 4], [16, 5]]);
    expect(match.status).toBe('finished');
    expect(match.result).toEqual({ outcome: 'draw', reason: 'fivefold_repetition' });
    expect(match.events.at(-1)).toMatchObject({ kind: 'result', result: match.result });
  });

  it('resets repetition history after pawn moves and captures', () => {
    let match = play(createMatch({ gameId: 'reset-pawn' }), [move('e2', 'e4')]);
    expect(match.positionHistory).toHaveLength(1);
    match = play(createMatch({ gameId: 'reset-capture' }), [
      move('e2', 'e4'), move('d7', 'd5'), move('e4', 'd5'),
    ]);
    expect(match.positionHistory).toHaveLength(1);
    expect(match.positionHistory[0]).toBe(positionKey(match.state));
  });

  it('keeps history across castling-right loss while the key changes', () => {
    const initialState = parseFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    const match = play(createMatch({ gameId: 'rights-history', initialState }), [move('e1', 'e2')]);
    expect(match.positionHistory).toHaveLength(2);
    expect(match.positionHistory[0]).not.toBe(match.positionHistory[1]);
  });

  it('accepts a current fifty-move claim and records a separate result event', () => {
    const match = createMatch({
      gameId: 'fifty-current',
      initialState: parseFen('4k3/8/8/8/8/8/8/4K3 w - - 100 1'),
    });
    const claim = claimDraw(match, { claimant: 'white', basis: 'fifty_move' });
    expect(claim.ok).toBe(true);
    if (!claim.ok) return;
    expect(claim.match.events.slice(-2).map((event) => event.kind)).toEqual(['claim', 'result']);
    expect(claim.match.result).toEqual({ outcome: 'draw', reason: 'fifty_move_claim' });
    expect(claim.match.state).toEqual(match.state);
  });

  it('rejects a current claim whose condition is not met and keeps the game active', () => {
    const match = createMatch({
      gameId: 'fifty-invalid',
      initialState: parseFen('4k3/8/8/8/8/8/8/4K3 w - - 99 1'),
    });
    const claim = claimDraw(match, { claimant: 'white', basis: 'fifty_move' });
    expect(claim.ok).toBe(true);
    if (!claim.ok) return;
    expect(claim.match.events.at(-1)).toMatchObject({ kind: 'claim', outcome: 'rejected_condition_not_met' });
    expect(claim.match.status).toBe('in-progress');
    expect(claim.match.state).toEqual(match.state);
  });

  it('rejects a wrong-side claim as a command error without an event', () => {
    const match = createMatch({ gameId: 'wrong-side' });
    const claim = claimDraw(match, { claimant: 'black', basis: 'threefold' });
    expect(claim.ok).toBe(false);
    if (claim.ok) return;
    expect(claim.match).toBe(match);
    expect(claim.error.code).toBe('WRONG_SIDE_TO_CLAIM');
    expect(match.events).toHaveLength(0);
  });

  it('rejects commands after an automatic result without changing history', () => {
    const match = play(createMatch({ gameId: 'game-over' }), [...knightCycle, ...knightCycle, ...knightCycle, ...knightCycle]);
    const moveAfterResult = commitMove(match, move('e2', 'e4'));
    const claimAfterResult = claimDraw(match, { claimant: 'white', basis: 'threefold' });
    expect(moveAfterResult.ok).toBe(false);
    expect(claimAfterResult.ok).toBe(false);
    expect(moveAfterResult.match).toBe(match);
    expect(claimAfterResult.match).toBe(match);
  });

  it('accepts a valid intended fifty-move claim before playing a mating move', () => {
    const match = createMatch({
      gameId: 'intended-fifty-valid',
      initialState: parseFen('7k/5Q2/6K1/8/8/8/8/8 w - - 99 1'),
    });
    const claim = claimDraw(match, { claimant: 'white', basis: 'fifty_move', intendedMove: move('f7', 'g7') });
    expect(claim.ok).toBe(true);
    if (!claim.ok) return;
    expect(claim.match.ply).toBe(0);
    expect(claim.match.state).toEqual(match.state);
    expect(claim.match.events.slice(-2).map((event) => event.kind)).toEqual(['claim', 'result']);
    expect(claim.match.events.at(-2)).toMatchObject({ outcome: 'accepted', intendedMoveExecuted: false });
    expect(claim.match.result).toEqual({ outcome: 'draw', reason: 'fifty_move_claim' });
  });

  it('executes a legal intended move when a fifty-move claim is incorrect, then adjudicates mate', () => {
    const match = createMatch({
      gameId: 'intended-fifty-invalid',
      initialState: parseFen('7k/5Q2/6K1/8/8/8/8/8 w - - 98 1'),
    });
    const claim = claimDraw(match, { claimant: 'white', basis: 'fifty_move', intendedMove: move('f7', 'g7') });
    expect(claim.ok).toBe(true);
    if (!claim.ok) return;
    expect(claim.match.events.slice(-3).map((event) => event.kind)).toEqual(['claim', 'move', 'result']);
    expect(claim.match.events.at(-3)).toMatchObject({ outcome: 'rejected_condition_not_met', intendedMoveExecuted: true });
    expect(claim.match.events.at(-1)).toMatchObject({ result: { outcome: 'white_win', reason: 'checkmate' } });
    expect(claim.match.ply).toBe(1);
  });

  it('records an illegal intended move claim without evaluating or playing it', () => {
    const match = createMatch({ gameId: 'intended-illegal' });
    const claim = claimDraw(match, { claimant: 'white', basis: 'fifty_move', intendedMove: move('e2', 'e5') });
    expect(claim.ok).toBe(true);
    if (!claim.ok) return;
    expect(claim.match.events).toHaveLength(1);
    expect(claim.match.events[0]).toMatchObject({
      kind: 'claim', outcome: 'rejected_illegal_move', intendedMoveExecuted: false,
    });
    expect(claim.match.state).toEqual(match.state);
    expect(claim.match.ply).toBe(0);
  });

  it('records a 75-move automatic draw after a quiet move at halfmove 149', () => {
    const match = createMatch({
      gameId: 'seventy-five',
      initialState: parseFen('4k3/8/8/8/8/8/8/4K3 w - - 149 1'),
    });
    const next = commitMove(match, move('e1', 'e2'));
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.match.result).toEqual({ outcome: 'draw', reason: 'seventy_five_moves' });
    expect(next.match.events.slice(-2).map((event) => event.kind)).toEqual(['move', 'result']);
  });

  it('gives checkmate precedence over the 75-move draw', () => {
    const match = createMatch({
      gameId: 'mate-at-75',
      initialState: parseFen('7k/5Q2/6K1/8/8/8/8/8 w - - 149 1'),
    });
    const next = commitMove(match, move('f7', 'g7'));
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.match.result).toEqual({ outcome: 'white_win', reason: 'checkmate' });
  });

  it('records stalemate and fool’s-mate results', () => {
    const stalemate = createMatch({
      gameId: 'initial-stalemate',
      initialState: parseFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'),
    });
    expect(stalemate.result).toEqual({ outcome: 'draw', reason: 'stalemate' });

    const foolsMate = play(createMatch({ gameId: 'fools-mate' }), [
      move('f2', 'f3'), move('e7', 'e5'), move('g2', 'g4'), move('d8', 'h4'),
    ]);
    expect(foolsMate.result).toEqual({ outcome: 'black_win', reason: 'checkmate' });
  });

  it('replays claims and results independently and rejects a tampered claim outcome', () => {
    const match = play(createMatch({ gameId: 'claim-replay' }), [...knightCycle, ...knightCycle.slice(0, 3)]);
    const claimed = claimDraw(match, { claimant: 'black', basis: 'threefold', intendedMove: move('f6', 'g8') });
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    expect(replayMatch({ gameId: 'claim-replay' }, claimed.match.events)).toEqual(claimed.match);
    const corrupted = claimed.match.events.map((event) => event.kind === 'claim'
      ? { ...event, outcome: 'rejected_condition_not_met' as const }
      : event) as readonly MatchEvent[];
    expect(() => replayMatch({ gameId: 'claim-replay' }, corrupted)).toThrow(/claim/i);
  });

  it.each([
    ['position key', (event: MatchEvent) => event.kind === 'move' ? { ...event, positionKey: 'tampered' } : event],
    ['repetition count', (event: MatchEvent) => event.kind === 'move' ? { ...event, repetitionCount: 99 } : event],
    ['halfmove clock', (event: MatchEvent) => event.kind === 'move' ? { ...event, halfmoveClock: 99 } : event],
    ['result reason', (event: MatchEvent) => event.kind === 'result' ? { ...event, result: { outcome: 'draw' as const, reason: 'stalemate' as const } } : event],
  ])('rejects replay when the recorded %s is tampered', (_label, mutate) => {
    const completed = play(createMatch({ gameId: `tamper-${_label}` }), [
      move('f2', 'f3'), move('e7', 'e5'), move('g2', 'g4'), move('d8', 'h4'),
    ]);
    const tampered = completed.events.map(mutate) as readonly MatchEvent[];
    expect(() => replayMatch({ gameId: `tamper-${_label}` }, tampered)).toThrow();
  });

  it('leaves the original Match byte-identical while checking an intended-move claim', () => {
    const match = createMatch({
      gameId: 'atomic-claim',
      initialState: parseFen('7k/5Q2/6K1/8/8/8/8/8 w - - 99 1'),
    });
    const before = JSON.stringify(match);
    claimDraw(match, { claimant: 'white', basis: 'fifty_move', intendedMove: move('f7', 'g7') });
    expect(JSON.stringify(match)).toBe(before);
  });
});
