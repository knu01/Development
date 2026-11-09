import { applyLegalMove, isInCheck, legalMoves, runDeadPositionAnalysis } from '../engine';
import type { DeadPositionOptions, DeadPositionResult } from '../engine';
import type { Match as MatchType } from './types';
import { appendResult } from './result-events';

export interface PendingAdjudicationOptions extends Omit<DeadPositionOptions, 'signal'> {
  readonly signal?: AbortSignal;
  readonly detector?: (state: MatchType['state'], options: DeadPositionOptions) => Promise<DeadPositionResult>;
}

export interface PendingAdjudicationTransition {
  readonly match: MatchType;
  readonly outcome: DeadPositionResult;
}

export function applyDefinitiveAdjudication(
  match: MatchType,
  result: Extract<DeadPositionResult, { kind: 'LIVE' | 'DEAD' }>,
): MatchType | null {
  if (match.status !== 'adjudication-pending') return null;
  if (result.kind === 'LIVE' && !validateLiveWitness(match, result)) return null;
  const event = Object.freeze({
    kind: 'adjudication' as const,
    gameId: match.gameId,
    eventSeq: match.nextEventSeq,
    ply: match.ply,
    outcome: result.kind,
    matingSide: result.kind === 'LIVE' ? result.matingSide : null,
    witness: result.kind === 'LIVE' ? Object.freeze([...result.witness]) : null,
  });
  const resolved: MatchType = Object.freeze({
    ...match,
    status: 'in-progress',
    nextEventSeq: match.nextEventSeq + 1,
    events: Object.freeze([...match.events, event]),
  });
  return result.kind === 'DEAD'
    ? appendResult(resolved, { outcome: 'draw', reason: 'dead_position' })
    : resolved;
}

function validateLiveWitness(match: MatchType, result: Extract<DeadPositionResult, { kind: 'LIVE' }>): boolean {
  try {
    let state = match.state;
    for (const move of result.witness) state = applyLegalMove(state, move);
    return state.sideToMove !== result.matingSide
      && legalMoves(state).length === 0
      && isInCheck(state, state.sideToMove);
  } catch {
    return false;
  }
}

export async function adjudicatePendingMatch(
  match: MatchType,
  options: PendingAdjudicationOptions = {},
): Promise<PendingAdjudicationTransition> {
  if (match.status !== 'adjudication-pending') {
    return Object.freeze({ match, outcome: Object.freeze({ kind: 'UNDETERMINED', reason: 'SEARCH_ERROR', nodes: 0, sideNodes: Object.freeze({ white: 0, black: 0 }) }) });
  }
  const detector = options.detector ?? runDeadPositionAnalysis;
  const { detector: _injectedDetector, ...searchOptions } = options;
  let outcome: DeadPositionResult;
  try {
    outcome = await detector(match.state, { ...searchOptions, signal: options.signal });
  } catch {
    outcome = Object.freeze({ kind: 'UNDETERMINED', reason: 'SEARCH_ERROR', nodes: 0, sideNodes: Object.freeze({ white: 0, black: 0 }) });
  }
  if (!outcome || typeof outcome !== 'object' || typeof outcome.nodes !== 'number'
    || !outcome.sideNodes || !Number.isFinite(outcome.sideNodes.white) || !Number.isFinite(outcome.sideNodes.black)) {
    outcome = Object.freeze({ kind: 'UNDETERMINED', reason: 'SEARCH_ERROR', nodes: 0, sideNodes: Object.freeze({ white: 0, black: 0 }) });
  }
  if (outcome.kind === 'UNDETERMINED' || options.signal?.aborted) {
    const unknown = options.signal?.aborted
      ? Object.freeze({ kind: 'UNDETERMINED' as const, reason: 'CANCELLED' as const, nodes: outcome.nodes, sideNodes: outcome.sideNodes })
      : outcome;
    return Object.freeze({ match, outcome: unknown });
  }
  if (outcome.kind !== 'LIVE' && outcome.kind !== 'DEAD') {
    return Object.freeze({ match, outcome: Object.freeze({ kind: 'UNDETERMINED', reason: 'SEARCH_ERROR', nodes: 0, sideNodes: Object.freeze({ white: 0, black: 0 }) }) });
  }
  const resolved = applyDefinitiveAdjudication(match, outcome);
  if (!resolved) {
    return Object.freeze({ match, outcome: Object.freeze({ kind: 'UNDETERMINED', reason: 'SEARCH_ERROR', nodes: outcome.nodes, sideNodes: outcome.sideNodes }) });
  }
  return Object.freeze({ match: resolved, outcome });
}
