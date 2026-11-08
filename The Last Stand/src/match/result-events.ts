import type { AutomaticOutcome } from '../engine';
import type { Match, MatchResult, MatchResultEvent } from './types';

export function resultFromAutomaticOutcome(outcome: AutomaticOutcome): MatchResult {
  switch (outcome.kind) {
    case 'checkmate':
      return { outcome: outcome.winner === 'white' ? 'white_win' : 'black_win', reason: 'checkmate' };
    case 'stalemate': return { outcome: 'draw', reason: 'stalemate' };
    case 'fivefold_repetition': return { outcome: 'draw', reason: 'fivefold_repetition' };
    case 'seventy_five_moves': return { outcome: 'draw', reason: 'seventy_five_moves' };
    case 'dead_position': return { outcome: 'draw', reason: 'dead_position' };
  }
}

export function appendResult(match: Match, result: MatchResult): Match {
  if (match.status === 'finished' || match.result !== null) return match;
  const event: MatchResultEvent = Object.freeze({
    kind: 'result',
    gameId: match.gameId,
    eventSeq: match.nextEventSeq,
    ply: match.ply,
    result: Object.freeze({ ...result }),
  });
  return Object.freeze({
    ...match,
    status: 'finished',
    result: event.result,
    nextEventSeq: match.nextEventSeq + 1,
    events: Object.freeze([...match.events, event]),
  });
}
