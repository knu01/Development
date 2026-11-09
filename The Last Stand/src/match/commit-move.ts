import { evaluateAutomaticOutcome, positionKey, repetitionCount, tryApplyMove } from '../engine';
import type { Match, MatchIntegrityError, MatchPiece, MatchTransition, MoveInput, PieceId } from './types';
import { appendResult, resultFromAutomaticOutcome } from './result-events';

function integrityFailure(match: Match, message: string, code: MatchIntegrityError['code'] | 'ADJUDICATION_PENDING' = 'MATCH_STATE_INCONSISTENT'): MatchTransition {
  const error: MatchIntegrityError = Object.freeze({
    kind: 'match',
    code,
    message,
  });
  return Object.freeze({ ok: false, match, error });
}

function updateRecord(records: Record<PieceId, MatchPiece>, id: PieceId, update: Partial<MatchPiece>): void {
  const existing = records[id];
  records[id] = Object.freeze({ ...existing, ...update });
}

export function commitMove(match: Match, input: MoveInput): MatchTransition {
  if (match.status === 'finished') return integrityFailure(match, 'The match is already finished.', 'GAME_OVER');
  if (match.status === 'adjudication-pending') return integrityFailure(match, 'Dead-position adjudication is pending.', 'ADJUDICATION_PENDING');
  const applied = tryApplyMove(match.state, input);
  if (!applied.ok) {
    return Object.freeze({
      ok: false,
      match,
      error: Object.freeze({ kind: 'engine', error: applied.error }),
    });
  }

  const { move } = applied;
  const moverPieceId = match.pieceIdsBySquare[move.from];
  const moverRecord = moverPieceId ? match.piecesById[moverPieceId] : undefined;
  if (!moverPieceId || !moverRecord || moverRecord.status !== 'active'
    || moverRecord.side !== move.piece.side || moverRecord.currentType !== move.piece.type) {
    return integrityFailure(match, 'The mover identity does not match the engine position.');
  }

  let capturedPieceId: PieceId | null = null;
  if (move.capture) {
    capturedPieceId = match.pieceIdsBySquare[move.capture.square];
    const capturedRecord = capturedPieceId ? match.piecesById[capturedPieceId] : undefined;
    if (!capturedPieceId || !capturedRecord || capturedRecord.status !== 'active'
      || capturedRecord.side !== move.capture.piece.side || capturedRecord.currentType !== move.capture.piece.type) {
      return integrityFailure(match, 'The captured identity does not match the canonical engine capture fact.');
    }
  }

  let rookId: PieceId | null = null;
  let rookFrom = -1;
  let rookTo = -1;
  if (move.castle) {
    const rank = Math.floor(move.from / 8);
    const kingSide = move.castle === 'kingSide';
    rookFrom = rank * 8 + (kingSide ? 7 : 0);
    rookTo = rank * 8 + (kingSide ? 5 : 3);
    rookId = match.pieceIdsBySquare[rookFrom];
    const rookRecord = rookId ? match.piecesById[rookId] : undefined;
    if (!rookId || !rookRecord || rookRecord.status !== 'active'
      || rookRecord.side !== move.piece.side || rookRecord.currentType !== 'rook') {
      return integrityFailure(match, 'The castling rook identity does not match the engine position.');
    }
  }

  const pieceIdsBySquare = [...match.pieceIdsBySquare];
  pieceIdsBySquare[move.from] = null;
  if (move.capture) pieceIdsBySquare[move.capture.square] = null;
  if (rookId !== null) {
    pieceIdsBySquare[rookFrom] = null;
    pieceIdsBySquare[rookTo] = rookId;
  }
  pieceIdsBySquare[move.to] = moverPieceId;

  const piecesById: Record<PieceId, MatchPiece> = { ...match.piecesById };
  if (capturedPieceId) updateRecord(piecesById, capturedPieceId, { status: 'captured' });
  if (move.promotion) updateRecord(piecesById, moverPieceId, { currentType: move.promotion });

  const nextKey = positionKey(applied.state);
  const positionHistory = move.piece.type === 'pawn' || move.capture !== null
    ? Object.freeze([nextKey])
    : Object.freeze([...match.positionHistory, nextKey]);
  const event = Object.freeze({
    kind: 'move' as const,
    gameId: match.gameId,
    eventSeq: match.nextEventSeq,
    ply: match.ply + 1,
    movingSide: move.piece.side,
    move,
    moverPieceId,
    capturedPieceId,
    positionKey: nextKey,
    repetitionCount: repetitionCount(positionHistory, nextKey),
    halfmoveClock: applied.state.halfmoveClock,
  });
  const nextMatch: Match = Object.freeze({
    ...match,
    state: applied.state,
    status: 'adjudication-pending',
    positionHistory,
    ply: match.ply + 1,
    nextEventSeq: match.nextEventSeq + 1,
    pieceIdsBySquare: Object.freeze(pieceIdsBySquare),
    piecesById: Object.freeze(piecesById),
    events: Object.freeze([...match.events, event]),
  });
  const automaticOutcome = evaluateAutomaticOutcome(applied.state, positionHistory);
  const adjudicated = automaticOutcome
    ? appendResult(nextMatch, resultFromAutomaticOutcome(automaticOutcome))
    : nextMatch;
  return Object.freeze({ ok: true, match: adjudicated, event });
}
