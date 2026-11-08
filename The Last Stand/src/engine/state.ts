import type { Piece, PieceType, RuleState, Side } from './types';

const BACK_RANK: readonly PieceType[] = [
  'rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook',
];

function frozenPiece(side: Side, type: PieceType): Piece {
  return Object.freeze({ side, type });
}

export function createInitialRuleState(): RuleState {
  const board: (Piece | null)[] = Array(64).fill(null);
  for (let file = 0; file < 8; file += 1) {
    board[file] = frozenPiece('black', BACK_RANK[file]);
    board[8 + file] = frozenPiece('black', 'pawn');
    board[48 + file] = frozenPiece('white', 'pawn');
    board[56 + file] = frozenPiece('white', BACK_RANK[file]);
  }
  return Object.freeze({ board: Object.freeze(board), sideToMove: 'white' });
}
