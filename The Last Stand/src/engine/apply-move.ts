import { legalMoves } from './move-generation';
import { createRuleState, internPiece } from './state';
import { validateEnginePosition } from './fen';
import type { Move, MoveApplicationError, MoveApplicationResult, MoveInput, PromotionPieceType, RuleState, Side } from './types';

const otherSide = (side: Side): Side => side === 'white' ? 'black' : 'white';
const isSquare = (value: number): boolean => Number.isInteger(value) && value >= 0 && value < 64;
const PROMOTION_CHOICES: readonly PromotionPieceType[] = ['queen', 'rook', 'bishop', 'knight'];

export class MoveApplicationException extends Error implements MoveApplicationError {
  readonly code: MoveApplicationError['code'];
  readonly validationCodes?: readonly string[];
  constructor(error: MoveApplicationError) {
    super(error.message);
    this.name = 'MoveApplicationException';
    this.code = error.code;
    this.validationCodes = error.validationCodes;
  }
}

function fail(code: MoveApplicationError['code'], message: string): MoveApplicationResult {
  return Object.freeze({ ok: false, error: Object.freeze({ code, message }) });
}

function updateCastlingRights(state: RuleState, move: Move): RuleState['castlingRights'] {
  const rights = new Set(state.castlingRights);
  const removeRookRight = (square: number) => {
    if (square === 63) rights.delete('K');
    if (square === 56) rights.delete('Q');
    if (square === 7) rights.delete('k');
    if (square === 0) rights.delete('q');
  };
  if (move.piece.type === 'king') {
    if (move.piece.side === 'white') { rights.delete('K'); rights.delete('Q'); }
    else { rights.delete('k'); rights.delete('q'); }
  }
  if (move.piece.type === 'rook') removeRookRight(move.from);
  if (move.capture?.piece.type === 'rook') removeRookRight(move.capture.square);
  return [...(['K', 'Q', 'k', 'q'] as const).filter((right) => rights.has(right))];
}

function applyCanonicalMove(state: RuleState, move: Move): RuleState {
  const board = state.board.slice();
  board[move.to] = move.promotion ? internPiece(move.piece.side, move.promotion) : move.piece;
  board[move.from] = null;
  if (move.capture && move.capture.square !== move.to) board[move.capture.square] = null;
  if (move.castle) {
    const rank = Math.floor(move.from / 8);
    const kingSide = move.castle === 'kingSide';
    const rookFrom = rank * 8 + (kingSide ? 7 : 0);
    const rookTo = rank * 8 + (kingSide ? 5 : 3);
    board[rookTo] = board[rookFrom];
    board[rookFrom] = null;
  }
  const isPawnMove = move.piece.type === 'pawn';
  const enPassantTarget = move.doublePawnPush ? (move.from + move.to) / 2 : null;
  return createRuleState({
    board,
    sideToMove: otherSide(state.sideToMove),
    castlingRights: updateCastlingRights(state, move),
    enPassantTarget,
    halfmoveClock: isPawnMove || move.capture ? 0 : state.halfmoveClock + 1,
    fullmoveNumber: state.fullmoveNumber + (state.sideToMove === 'black' ? 1 : 0),
  });
}

/** Canonicalizes, validates, and applies through the one legal-move path. */
export function tryApplyMove(state: RuleState, input: MoveInput): MoveApplicationResult {
  const positionValidation = validateEnginePosition(state);
  if (!positionValidation.valid) {
    return Object.freeze({
      ok: false,
      error: Object.freeze({
        code: 'INVALID_ENGINE_POSITION',
        message: 'Position is structurally unsuitable for engine operations.',
        validationCodes: Object.freeze(positionValidation.errors.map(({ code }) => code)),
      }),
    });
  }
  if (!isSquare(input.from) || !isSquare(input.to) || input.from === input.to) {
    return fail('INVALID_MOVE_INPUT', 'Move coordinates must be distinct board squares.');
  }
  if (input.promotion !== undefined && input.promotion !== null
    && !PROMOTION_CHOICES.includes(input.promotion as PromotionPieceType)) {
    return fail('INVALID_PROMOTION', 'Promotion choice must be queen, rook, bishop, or knight.');
  }
  const piece = state.board[input.from];
  if (!piece) return fail('NO_PIECE_AT_ORIGIN', 'There is no piece on the origin square.');
  if (piece.side !== state.sideToMove) return fail('WRONG_SIDE_TO_MOVE', 'The origin piece does not belong to the side to move.');
  const candidates = legalMoves(state).filter((candidate) => candidate.from === input.from && candidate.to === input.to);
  if (candidates.length === 0) return fail('ILLEGAL_MOVE', `Move from ${input.from} to ${input.to} is not legal.`);
  const promotionCandidates = candidates.filter((candidate) => candidate.promotion !== null);
  let move: Move | undefined;
  if (promotionCandidates.length > 0) {
    if (input.promotion === undefined || input.promotion === null) {
      return fail('PROMOTION_REQUIRED', 'A promotion move requires an explicit piece choice.');
    }
    move = promotionCandidates.find((candidate) => candidate.promotion === input.promotion);
    if (!move) return fail('INVALID_PROMOTION', 'The selected promotion does not match a legal move.');
  } else {
    if (input.promotion !== undefined && input.promotion !== null) {
      return fail('INVALID_PROMOTION', 'Promotion is only allowed when a pawn reaches the final rank.');
    }
    move = candidates[0];
  }
  if (input.captureSquare !== undefined && input.captureSquare !== move.capture?.square) {
    return fail('INVALID_MOVE_INPUT', 'The supplied capture square does not match the canonical move.');
  }
  if (input.castle !== undefined && input.castle !== null && input.castle !== move.castle) {
    return fail('INVALID_MOVE_INPUT', 'The supplied castling fact does not match the canonical move.');
  }
  if (input.doublePawnPush !== undefined && input.doublePawnPush !== move.doublePawnPush) {
    return fail('INVALID_MOVE_INPUT', 'The supplied double-push fact does not match the canonical move.');
  }
  return Object.freeze({ ok: true, move, state: applyCanonicalMove(state, move) });
}

/** Compatibility wrapper; delegates to the same canonical implementation. */
export function applyLegalMove(state: RuleState, input: MoveInput): RuleState {
  const result = tryApplyMove(state, input);
  if (!result.ok) throw new MoveApplicationException(result.error);
  return result.state;
}
