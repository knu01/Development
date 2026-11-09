import { evaluateClaim } from '../engine';
import type { Match, MatchClaimEvent, ClaimTransition, ClaimDrawInput, MatchCommandError, MoveInput } from './types';
import { commitMove } from './commit-move';
import { appendResult } from './result-events';

function commandFailure(match: Match, code: MatchCommandError['code'], message: string): ClaimTransition {
  return Object.freeze({
    ok: false,
    match,
    error: Object.freeze({ kind: 'command', code, message }),
  });
}

function snapshotMoveInput(input: MoveInput | undefined): MoveInput | null {
  if (!input) return null;
  const copy: {
    from: number; to: number; promotion?: MoveInput['promotion']; captureSquare?: number;
    castle?: MoveInput['castle']; doublePawnPush?: boolean;
  } = { from: input.from, to: input.to };
  if (input.promotion !== undefined) copy.promotion = input.promotion;
  if (input.captureSquare !== undefined) copy.captureSquare = input.captureSquare;
  if (input.castle !== undefined) copy.castle = input.castle;
  if (input.doublePawnPush !== undefined) copy.doublePawnPush = input.doublePawnPush;
  return Object.freeze(copy);
}

function appendClaim(match: Match, event: MatchClaimEvent): Match {
  return Object.freeze({
    ...match,
    nextEventSeq: match.nextEventSeq + 1,
    events: Object.freeze([...match.events, event]),
  });
}

export function claimDraw(match: Match, input: ClaimDrawInput): ClaimTransition {
  if (match.status === 'finished') return commandFailure(match, 'GAME_OVER', 'The match is already finished.');
  if (match.status === 'adjudication-pending') return commandFailure(match, 'ADJUDICATION_PENDING', 'Dead-position adjudication is pending.');
  if (input.claimant !== match.state.sideToMove) {
    return commandFailure(match, 'WRONG_SIDE_TO_CLAIM', 'Only the side to move may claim a draw.');
  }

  const intendedMoveInput = snapshotMoveInput(input.intendedMove);
  const evaluation = evaluateClaim(match.state, match.positionHistory, {
    basis: input.basis,
    intendedMove: intendedMoveInput ?? undefined,
  });
  const outcome = evaluation.kind === 'valid'
    ? 'accepted'
    : evaluation.kind === 'illegal-intended-move'
      ? 'rejected_illegal_move'
      : 'rejected_condition_not_met';
  const intendedMoveExecuted = evaluation.kind === 'condition-not-met' && evaluation.intendedMove !== null;
  const claimEvent: MatchClaimEvent = Object.freeze({
    kind: 'claim',
    gameId: match.gameId,
    eventSeq: match.nextEventSeq,
    ply: match.ply,
    claimant: input.claimant,
    basis: input.basis,
    intendedMove: intendedMoveInput,
    outcome,
    intendedMoveExecuted,
  });
  let next = appendClaim(match, claimEvent);

  if (evaluation.kind === 'valid') {
    next = appendResult(next, {
      outcome: 'draw',
      reason: input.basis === 'threefold' ? 'threefold_claim' : 'fifty_move_claim',
    });
  } else if (evaluation.kind === 'condition-not-met' && evaluation.intendedMove !== null) {
    const transition = commitMove(next, evaluation.intendedMove);
    if (!transition.ok) {
      const error = Object.freeze({
        kind: 'match' as const,
        code: transition.error.kind === 'engine' ? 'MATCH_STATE_INCONSISTENT' as const : transition.error.code,
        message: `The legal intended move could not be committed: ${transition.error.kind === 'engine' ? transition.error.error.code : transition.error.code}.`,
        ...(transition.error.kind === 'engine' ? { engineError: transition.error.error } : {}),
      });
      return Object.freeze({ ok: false, match, error });
    }
    next = transition.match;
  }

  return Object.freeze({ ok: true, match: next, claimEvent });
}
