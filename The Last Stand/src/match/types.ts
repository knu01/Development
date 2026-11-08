import type {
  ClaimBasis, Move, MoveApplicationError, MoveInput,
  PieceType, PositionKey, RuleState, Side, Square,
} from '../engine';

declare const pieceIdBrand: unique symbol;
export type PieceId = string & { readonly [pieceIdBrand]: true };

export interface MatchPiece {
  readonly id: PieceId;
  readonly side: Side;
  readonly currentType: PieceType;
  readonly status: 'active' | 'captured';
  readonly initialSquare: Square;
}

export interface MatchInitialConfig {
  readonly gameId: string;
  readonly initialState?: RuleState;
}

export interface MatchMoveEvent {
  readonly kind: 'move';
  readonly gameId: string;
  readonly eventSeq: number;
  readonly ply: number;
  readonly movingSide: Side;
  readonly move: Move;
  readonly moverPieceId: PieceId;
  readonly capturedPieceId: PieceId | null;
  readonly positionKey: PositionKey;
  readonly repetitionCount: number;
  readonly halfmoveClock: number;
}

export type ClaimOutcome =
  | 'accepted'
  | 'rejected_condition_not_met'
  | 'rejected_illegal_move';

export interface MatchClaimEvent {
  readonly kind: 'claim';
  readonly gameId: string;
  readonly eventSeq: number;
  readonly ply: number;
  readonly claimant: Side;
  readonly basis: ClaimBasis;
  readonly intendedMove: MoveInput | null;
  readonly outcome: ClaimOutcome;
  readonly intendedMoveExecuted: boolean;
}

export type MatchResultReason =
  | 'checkmate'
  | 'stalemate'
  | 'fivefold_repetition'
  | 'seventy_five_moves'
  | 'dead_position'
  | 'threefold_claim'
  | 'fifty_move_claim'
  | 'resignation'
  | 'resignation_no_mating_potential';

export type MatchResult =
  | { readonly outcome: 'draw'; readonly reason: Exclude<MatchResultReason, 'checkmate' | 'resignation'> }
  | { readonly outcome: 'white_win' | 'black_win'; readonly reason: 'checkmate' | 'resignation' };

export interface MatchResultEvent {
  readonly kind: 'result';
  readonly gameId: string;
  readonly eventSeq: number;
  readonly ply: number;
  readonly result: MatchResult;
}

export type MatchEvent = MatchMoveEvent | MatchClaimEvent | MatchResultEvent;
export type MatchStatus = 'in-progress' | 'finished';

export interface Match {
  readonly gameId: string;
  readonly initialState: RuleState;
  readonly state: RuleState;
  readonly positionHistory: readonly PositionKey[];
  readonly status: MatchStatus;
  readonly result: MatchResult | null;
  readonly ply: number;
  readonly nextEventSeq: number;
  readonly pieceIdsBySquare: readonly (PieceId | null)[];
  readonly piecesById: Readonly<Record<PieceId, MatchPiece>>;
  readonly events: readonly MatchEvent[];
}

export interface ClaimDrawInput {
  readonly claimant: Side;
  readonly basis: ClaimBasis;
  readonly intendedMove?: MoveInput;
}

export type MatchCommandErrorCode = 'WRONG_SIDE_TO_CLAIM' | 'GAME_OVER' | 'MATCH_STATE_INCONSISTENT';

export interface MatchCommandError {
  readonly kind: 'command' | 'match';
  readonly code: MatchCommandErrorCode;
  readonly message: string;
  readonly engineError?: MoveApplicationError;
}

export type ClaimTransition =
  | { readonly ok: true; readonly match: Match; readonly claimEvent: MatchClaimEvent }
  | { readonly ok: false; readonly match: Match; readonly error: MatchCommandError };

export interface MatchIntegrityError {
  readonly kind: 'match';
  readonly code: 'MATCH_STATE_INCONSISTENT' | 'GAME_OVER';
  readonly message: string;
}

export interface EngineCommitError {
  readonly kind: 'engine';
  readonly error: MoveApplicationError;
}

export type CommitMoveError = MatchIntegrityError | EngineCommitError;

export type MatchTransition =
  | { readonly ok: true; readonly match: Match; readonly event: MatchMoveEvent }
  | { readonly ok: false; readonly match: Match; readonly error: CommitMoveError };

export type { MoveInput };

export type MatchReplayErrorCode =
  | 'REPLAY_GAME_ID_MISMATCH'
  | 'REPLAY_EVENT_SEQUENCE_MISMATCH'
  | 'REPLAY_PLY_MISMATCH'
  | 'REPLAY_EVENT_FACTS_MISMATCH'
  | 'REPLAY_MOVE_REJECTED';

export class MatchReplayError extends Error {
  readonly code: MatchReplayErrorCode;

  constructor(code: MatchReplayErrorCode, message: string) {
    super(message);
    this.name = 'MatchReplayError';
    this.code = code;
  }
}

export class MatchConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MatchConfigurationError';
  }
}
