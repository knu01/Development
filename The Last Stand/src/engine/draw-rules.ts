import { legalMoves, isInCheck } from './move-generation';
import { assertEnginePosition, toFen } from './fen';
import { tryApplyMove } from './apply-move';
import type { Move, MoveApplicationError, MoveInput, RuleState, Side } from './types';

export type PositionKey = string;
export type PositionHistory = readonly PositionKey[];

export type AutomaticOutcome =
  | { readonly kind: 'checkmate'; readonly winner: Side }
  | { readonly kind: 'stalemate' }
  | { readonly kind: 'fivefold_repetition' }
  | { readonly kind: 'seventy_five_moves' }
  | { readonly kind: 'dead_position' };

export type ClaimBasis = 'threefold' | 'fifty_move';

export type ClaimEvaluation =
  | { readonly kind: 'valid'; readonly intendedMove: Move | null }
  | { readonly kind: 'condition-not-met'; readonly intendedMove: Move | null }
  | { readonly kind: 'illegal-intended-move'; readonly reason: MoveApplicationError };

export interface DrawClaimInput {
  readonly basis: ClaimBasis;
  readonly intendedMove?: MoveInput;
}

export interface MatingPotentialBudget {
  readonly maxNodes: number;
  readonly timeBudgetMs: number;
}

export type MatingPotentialResult =
  | { readonly kind: 'can-mate'; readonly witness: readonly Move[] }
  | { readonly kind: 'cannot-mate' }
  | { readonly kind: 'undetermined'; readonly reason: 'NOT_IMPLEMENTED' };

export const ENGINE_CAPABILITIES = Object.freeze({ deadPositionDetection: 'unimplemented' as const });

/**
 * FIDE repetition identity: placement, side to move, castling rights, and an
 * en-passant target only when a legal en-passant capture is available.
 * Move clocks and Match piece identities are intentionally excluded.
 */
export function positionKey(state: RuleState): PositionKey {
  assertEnginePosition(state);
  const fields = toFen(state).split(' ');
  const hasLegalEnPassant = state.enPassantTarget !== null
    && legalMoves(state).some((move) => move.to === state.enPassantTarget
      && move.piece.type === 'pawn'
      && move.capture !== null
      && move.capture.square !== move.to);
  return [fields[0], fields[1], fields[2], hasLegalEnPassant ? fields[3] : '-'].join(' ');
}

export function repetitionCount(history: PositionHistory, key: PositionKey): number {
  let count = 0;
  for (const occurrence of history) if (occurrence === key) count += 1;
  return count;
}

export function evaluateAutomaticOutcome(
  state: RuleState,
  history: PositionHistory,
): AutomaticOutcome | null {
  const moves = legalMoves(state);
  if (moves.length === 0) {
    return isInCheck(state, state.sideToMove)
      ? { kind: 'checkmate', winner: state.sideToMove === 'white' ? 'black' : 'white' }
      : { kind: 'stalemate' };
  }
  if (repetitionCount(history, positionKey(state)) >= 5) return { kind: 'fivefold_repetition' };
  if (state.halfmoveClock >= 150) return { kind: 'seventy_five_moves' };
  return null;
}

export function evaluateClaim(
  state: RuleState,
  history: PositionHistory,
  input: DrawClaimInput,
): ClaimEvaluation {
  let intendedMove: Move | null = null;
  let targetState = state;
  if (input.intendedMove !== undefined) {
    const hypothetical = tryApplyMove(state, input.intendedMove);
    if (!hypothetical.ok) {
      return { kind: 'illegal-intended-move', reason: hypothetical.error };
    }
    intendedMove = hypothetical.move;
    targetState = hypothetical.state;
  }

  const conditionMet = input.basis === 'threefold'
    ? repetitionCount(history, positionKey(targetState)) + (intendedMove ? 1 : 0) >= 3
    : targetState.halfmoveClock >= 100;
  return conditionMet ? { kind: 'valid', intendedMove } : { kind: 'condition-not-met', intendedMove };
}

/** Dead-position reachability is deliberately unimplemented in M3.2. */
export function assessMatingPotential(
  _position: RuleState,
  _winner: Side,
  _budget: MatingPotentialBudget,
): MatingPotentialResult {
  return { kind: 'undetermined', reason: 'NOT_IMPLEMENTED' };
}
