import {
  applyLegalMove, createInitialRuleState, createRuleState, evaluateAutomaticOutcome, isInCheck, legalMoves, positionKey, tryApplyMove, validateEnginePosition,
} from '../engine';
import type { Match, MatchInitialConfig, MatchPiece, PieceId } from './types';
import { MatchConfigurationError } from './types';
import { appendResult, resultFromAutomaticOutcome } from './result-events';

function makePieceId(gameId: string, square: number): PieceId {
  return `${gameId}:piece:${square}` as PieceId;
}

export function createMatch(options: MatchInitialConfig): Match {
  if (!options.gameId.trim()) throw new MatchConfigurationError('gameId must not be empty.');
  const initialState = createRuleState(options.initialState ?? createInitialRuleState());
  const validation = validateEnginePosition(initialState);
  if (!validation.valid) {
    throw new MatchConfigurationError(`Initial position is unsuitable for a Match: ${validation.errors.map(({ code }) => code).join(', ')}.`);
  }

  const pieceIdsBySquare: (PieceId | null)[] = Array(64).fill(null);
  const piecesById: Record<PieceId, MatchPiece> = {};
  for (let square = 0; square < 64; square += 1) {
    const piece = initialState.board[square];
    if (!piece) continue;
    const id = makePieceId(options.gameId, square);
    pieceIdsBySquare[square] = id;
    piecesById[id] = Object.freeze({
      id,
      side: piece.side,
      currentType: piece.type,
      status: 'active',
      initialSquare: square,
    });
  }

  const key = positionKey(initialState);
  const hasVerifiedInitialMateWitness = options.initialState === undefined && verifyStandardOpeningWitness(initialState);
  const match: Match = Object.freeze({
    gameId: options.gameId,
    initialState,
    state: initialState,
    positionHistory: Object.freeze([key]),
    status: hasVerifiedInitialMateWitness ? 'in-progress' : 'adjudication-pending',
    result: null,
    ply: 0,
    nextEventSeq: 1,
    pieceIdsBySquare: Object.freeze(pieceIdsBySquare),
    piecesById: Object.freeze(piecesById),
    events: Object.freeze([]),
  });
  const automaticOutcome = evaluateAutomaticOutcome(initialState, match.positionHistory);
  return automaticOutcome ? appendResult(match, resultFromAutomaticOutcome(automaticOutcome)) : match;
}

function verifyStandardOpeningWitness(initialState: Match['state']): boolean {
  const line = [
    { from: 52, to: 36 }, { from: 12, to: 28 },
    { from: 61, to: 34 }, { from: 1, to: 18 },
    { from: 59, to: 31 }, { from: 6, to: 21 },
    { from: 31, to: 13 },
  ];
  try {
    let state = initialState;
    for (const move of line) {
      const applied = tryApplyMove(state, move);
      if (!applied.ok) return false;
      state = applyLegalMove(state, applied.move);
    }
    return state.sideToMove === 'black' && legalMoves(state).length === 0 && isInCheck(state, 'black');
  } catch {
    return false;
  }
}
