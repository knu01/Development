export type Side = 'white' | 'black';
export type PieceType = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';
export type Square = number;

export interface Piece {
  readonly side: Side;
  readonly type: PieceType;
}

export interface Move {
  readonly from: Square;
  readonly to: Square;
}

export interface RuleState {
  readonly board: readonly (Piece | null)[];
  readonly sideToMove: Side;
}
