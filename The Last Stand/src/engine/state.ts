import type { Piece, PieceType, RuleState, RuleStateInput, Side } from './types';

const BACK_RANK: readonly PieceType[] = [
  'rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook',
];

const SIDES: readonly Side[] = ['white', 'black'];
const PIECE_TYPES: readonly PieceType[] = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];
const PIECES = new Map<string, Piece>();
for (const side of SIDES) {
  for (const type of PIECE_TYPES) PIECES.set(`${side}:${type}`, Object.freeze({ side, type }));
}

export function internPiece(side: Side, type: PieceType): Piece {
  const piece = PIECES.get(`${side}:${type}`);
  if (!piece) throw new Error(`Unknown piece ${side}:${type}.`);
  return piece;
}

export function createRuleState(input: RuleStateInput): RuleState {
  if (input.board.length !== 64) throw new Error('RuleState board must have 64 squares.');
  const board = input.board.map((piece) => piece === null
    ? null
    : internPiece(piece.side, piece.type));
  const rights = [...(input.castlingRights ?? [])];
  const orderedRights = (['K', 'Q', 'k', 'q'] as const).filter((right) => rights.includes(right));
  if (orderedRights.length !== rights.length) throw new Error('Castling rights contain a duplicate or invalid value.');
  const enPassantTarget = input.enPassantTarget ?? null;
  if (enPassantTarget !== null && (!Number.isInteger(enPassantTarget) || enPassantTarget < 0 || enPassantTarget > 63)) {
    throw new Error('En-passant target must be a board square or null.');
  }
  const halfmoveClock = input.halfmoveClock ?? 0;
  const fullmoveNumber = input.fullmoveNumber ?? 1;
  if (!Number.isSafeInteger(halfmoveClock) || halfmoveClock < 0) throw new Error('Halfmove clock must be a non-negative safe integer.');
  if (!Number.isSafeInteger(fullmoveNumber) || fullmoveNumber < 1) throw new Error('Fullmove number must be a positive safe integer.');
  return Object.freeze({
    board: Object.freeze(board),
    sideToMove: input.sideToMove,
    castlingRights: Object.freeze(orderedRights),
    enPassantTarget,
    halfmoveClock,
    fullmoveNumber,
  });
}

export function createInitialRuleState(): RuleState {
  const board: (Piece | null)[] = Array(64).fill(null);
  for (let file = 0; file < 8; file += 1) {
    board[file] = internPiece('black', BACK_RANK[file]);
    board[8 + file] = internPiece('black', 'pawn');
    board[48 + file] = internPiece('white', 'pawn');
    board[56 + file] = internPiece('white', BACK_RANK[file]);
  }
  return createRuleState({ board, sideToMove: 'white', castlingRights: ['K', 'Q', 'k', 'q'] });
}
