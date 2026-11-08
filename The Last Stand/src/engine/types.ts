export type Side = 'white' | 'black';
export type PieceType = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';
export type PromotionPieceType = 'queen' | 'rook' | 'bishop' | 'knight';
export type Square = number;
export type CastlingRight = 'K' | 'Q' | 'k' | 'q';

export interface Piece {
  readonly side: Side;
  readonly type: PieceType;
}

export interface Move {
  readonly from: Square;
  readonly to: Square;
  readonly piece: Piece;
  readonly capture: { readonly square: Square; readonly piece: Piece } | null;
  readonly promotion: PromotionPieceType | null;
  readonly castle: 'kingSide' | 'queenSide' | null;
  readonly doublePawnPush: boolean;
  readonly givesCheck: boolean;
}

export interface MoveInput {
  readonly from: Square;
  readonly to: Square;
  readonly promotion?: PromotionPieceType | null;
  readonly captureSquare?: Square;
  readonly castle?: 'kingSide' | 'queenSide' | null;
  readonly doublePawnPush?: boolean;
}

export interface RuleState {
  readonly board: readonly (Piece | null)[];
  readonly sideToMove: Side;
  readonly castlingRights: readonly CastlingRight[];
  readonly enPassantTarget: Square | null;
  readonly halfmoveClock: number;
  readonly fullmoveNumber: number;
}

export interface RuleStateInput {
  readonly board: readonly (Piece | null)[];
  readonly sideToMove: Side;
  readonly castlingRights?: readonly CastlingRight[];
  readonly enPassantTarget?: Square | null;
  readonly halfmoveClock?: number;
  readonly fullmoveNumber?: number;
}

export type MoveApplicationErrorCode =
  | 'INVALID_MOVE_INPUT'
  | 'NO_PIECE_AT_ORIGIN'
  | 'WRONG_SIDE_TO_MOVE'
  | 'ILLEGAL_MOVE'
  | 'UNSUPPORTED_SPECIAL_MOVE'
  | 'PROMOTION_REQUIRED'
  | 'INVALID_PROMOTION'
  | 'INVALID_ENGINE_POSITION';

export interface MoveApplicationError {
  readonly code: MoveApplicationErrorCode;
  readonly message: string;
  readonly validationCodes?: readonly string[];
}

export type MoveApplicationResult =
  | { readonly ok: true; readonly state: RuleState; readonly move: Move }
  | { readonly ok: false; readonly error: MoveApplicationError };
