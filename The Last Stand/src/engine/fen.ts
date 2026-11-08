import { createRuleState } from './state';
import type { CastlingRight, PieceType, RuleState, Side, Square } from './types';

const FEN_TYPES: Readonly<Record<string, PieceType>> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};
const TYPE_TO_FEN: Readonly<Record<PieceType, string>> = {
  pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k',
};
const RIGHT_ORDER: readonly CastlingRight[] = ['K', 'Q', 'k', 'q'];

export type FenErrorCode =
  | 'FEN_FIELD_COUNT'
  | 'FEN_RANK_COUNT'
  | 'FEN_RANK_WIDTH'
  | 'FEN_INVALID_PIECE'
  | 'FEN_ACTIVE_COLOR'
  | 'FEN_CASTLING'
  | 'FEN_EN_PASSANT'
  | 'FEN_HALFMOVE_CLOCK'
  | 'FEN_FULLMOVE_NUMBER';

export class FenParseError extends Error {
  readonly code: FenErrorCode;
  constructor(code: FenErrorCode, message: string) {
    super(message);
    this.name = 'FenParseError';
    this.code = code;
  }
}

export type EnginePositionErrorCode =
  | 'ENGINE_POSITION_BOARD_LENGTH'
  | 'ENGINE_POSITION_WHITE_KING_COUNT'
  | 'ENGINE_POSITION_BLACK_KING_COUNT'
  | 'ENGINE_POSITION_KINGS_ADJACENT'
  | 'ENGINE_POSITION_PAWN_ON_BACK_RANK'
  | 'ENGINE_POSITION_CASTLING_KING_MISSING'
  | 'ENGINE_POSITION_CASTLING_ROOK_MISSING'
  | 'ENGINE_POSITION_EN_PASSANT_RANK'
  | 'ENGINE_POSITION_EN_PASSANT_OCCUPIED'
  | 'ENGINE_POSITION_EN_PASSANT_PAWN_MISSING';

export interface EnginePositionValidationError {
  readonly code: EnginePositionErrorCode;
  readonly message: string;
}

export type EnginePositionValidation =
  | { readonly valid: true; readonly errors: readonly [] }
  | { readonly valid: false; readonly errors: readonly EnginePositionValidationError[] };

export class InvalidEnginePositionError extends Error {
  readonly errors: readonly EnginePositionValidationError[];
  constructor(errors: readonly EnginePositionValidationError[]) {
    super(`Position is structurally unsuitable for engine operations: ${errors.map((error) => error.code).join(', ')}.`);
    this.name = 'InvalidEnginePositionError';
    this.errors = errors;
  }
}

const fail = (code: FenErrorCode, message: string): never => { throw new FenParseError(code, message); };

export function parseFen(fen: string): RuleState {
  const fields = fen.trim().split(/\s+/);
  if (fields.length !== 6) fail('FEN_FIELD_COUNT', 'FEN must contain exactly six fields.');
  const [placement, active, castling, ep, halfmove, fullmove] = fields;
  const ranks = placement.split('/');
  if (ranks.length !== 8) fail('FEN_RANK_COUNT', 'Piece placement must contain eight ranks.');
  const board: (RuleState['board'][number])[] = [];
  for (const rank of ranks) {
    let width = 0;
    for (const symbol of rank) {
      if (/^[1-8]$/.test(symbol)) {
        width += Number(symbol);
        for (let count = Number(symbol); count > 0; count -= 1) board.push(null);
      } else {
        const type = FEN_TYPES[symbol.toLowerCase()];
        if (!type) fail('FEN_INVALID_PIECE', `Invalid piece symbol: ${symbol}.`);
        board.push({ side: symbol === symbol.toUpperCase() ? 'white' : 'black', type });
        width += 1;
      }
    }
    if (width !== 8) fail('FEN_RANK_WIDTH', 'Each piece-placement rank must describe exactly eight squares.');
  }
  if (board.length !== 64) fail('FEN_RANK_WIDTH', 'Piece placement must describe exactly 64 squares.');
  if (active !== 'w' && active !== 'b') fail('FEN_ACTIVE_COLOR', 'Active color must be w or b.');
  let rights: CastlingRight[] = [];
  if (castling !== '-') {
    if (!/^(?!.*(.).*\1)[KQkq]+$/.test(castling)) fail('FEN_CASTLING', 'Castling field must be -, or unique KQkq letters.');
    rights = RIGHT_ORDER.filter((right) => castling.includes(right));
  }
  if (ep !== '-' && !/^[a-h][36]$/.test(ep)) fail('FEN_EN_PASSANT', 'En-passant field must be - or a square on rank 3 or 6.');
  if (!/^\d+$/.test(halfmove) || !Number.isSafeInteger(Number(halfmove))) fail('FEN_HALFMOVE_CLOCK', 'Halfmove clock must be a non-negative safe integer.');
  if (!/^[1-9]\d*$/.test(fullmove) || !Number.isSafeInteger(Number(fullmove))) fail('FEN_FULLMOVE_NUMBER', 'Fullmove number must be a positive safe integer.');
  const enPassantTarget: Square | null = ep === '-' ? null : (8 - Number(ep[1])) * 8 + ep.charCodeAt(0) - 97;
  return createRuleState({
    board,
    sideToMove: active === 'w' ? 'white' : 'black',
    castlingRights: rights,
    enPassantTarget,
    halfmoveClock: Number(halfmove),
    fullmoveNumber: Number(fullmove),
  });
}

export function toFen(state: RuleState): string {
  if (state.board.length !== 64) throw new Error('RuleState board must have 64 squares.');
  const ranks: string[] = [];
  for (let rank = 0; rank < 8; rank += 1) {
    let row = '';
    let empty = 0;
    for (let file = 0; file < 8; file += 1) {
      const piece = state.board[rank * 8 + file];
      if (!piece) { empty += 1; continue; }
      if (empty > 0) { row += empty; empty = 0; }
      const letter = TYPE_TO_FEN[piece.type];
      row += piece.side === 'white' ? letter.toUpperCase() : letter;
    }
    if (empty > 0) row += empty;
    ranks.push(row);
  }
  const castling = RIGHT_ORDER.filter((right) => state.castlingRights.includes(right)).join('') || '-';
  const ep = state.enPassantTarget === null
    ? '-'
    : `${String.fromCharCode(97 + state.enPassantTarget % 8)}${8 - Math.floor(state.enPassantTarget / 8)}`;
  return `${ranks.join('/')} ${state.sideToMove === 'white' ? 'w' : 'b'} ${castling} ${ep} ${state.halfmoveClock} ${state.fullmoveNumber}`;
}

export function validateEnginePosition(state: RuleState): EnginePositionValidation {
  const errors: EnginePositionValidationError[] = [];
  const add = (code: EnginePositionErrorCode, message: string) => errors.push(Object.freeze({ code, message }));
  if (state.board.length !== 64) {
    add('ENGINE_POSITION_BOARD_LENGTH', 'Engine operations require exactly 64 board squares.');
    return Object.freeze({ valid: false, errors: Object.freeze(errors) });
  }
  const whiteKings = state.board.reduce((n, piece) => n + Number(piece?.side === 'white' && piece.type === 'king'), 0);
  const blackKings = state.board.reduce((n, piece) => n + Number(piece?.side === 'black' && piece.type === 'king'), 0);
  if (whiteKings !== 1) add('ENGINE_POSITION_WHITE_KING_COUNT', 'Engine operations require exactly one white king.');
  if (blackKings !== 1) add('ENGINE_POSITION_BLACK_KING_COUNT', 'Engine operations require exactly one black king.');
  if (state.board.some((piece, square) => piece?.type === 'pawn' && (square < 8 || square >= 56))) {
    add('ENGINE_POSITION_PAWN_ON_BACK_RANK', 'Pawns cannot occupy the first or eighth rank.');
  }
  const whiteKing = state.board.findIndex((piece) => piece?.side === 'white' && piece.type === 'king');
  const blackKing = state.board.findIndex((piece) => piece?.side === 'black' && piece.type === 'king');
  if (whiteKing >= 0 && blackKing >= 0 && Math.abs(whiteKing % 8 - blackKing % 8) <= 1
    && Math.abs(Math.floor(whiteKing / 8) - Math.floor(blackKing / 8)) <= 1) {
    add('ENGINE_POSITION_KINGS_ADJACENT', 'Kings cannot occupy adjacent squares.');
  }
  const castlingHomes: Record<CastlingRight, { king: number; rook: number; side: Side }> = {
    K: { king: 60, rook: 63, side: 'white' }, Q: { king: 60, rook: 56, side: 'white' },
    k: { king: 4, rook: 7, side: 'black' }, q: { king: 4, rook: 0, side: 'black' },
  };
  for (const right of state.castlingRights) {
    const home = castlingHomes[right];
    if (state.board[home.king]?.side !== home.side || state.board[home.king]?.type !== 'king') {
      add('ENGINE_POSITION_CASTLING_KING_MISSING', `Castling right ${right} requires its king on the home square.`);
    }
    if (state.board[home.rook]?.side !== home.side || state.board[home.rook]?.type !== 'rook') {
      add('ENGINE_POSITION_CASTLING_ROOK_MISSING', `Castling right ${right} requires its rook on the home square.`);
    }
  }
  if (state.enPassantTarget !== null) {
    const target = state.enPassantTarget;
    const rank = Math.floor(target / 8);
    const expectedRank = state.sideToMove === 'white' ? 2 : 5;
    if (rank !== expectedRank) add('ENGINE_POSITION_EN_PASSANT_RANK', 'En-passant target rank must match the side to move.');
    if (state.board[target] !== null) add('ENGINE_POSITION_EN_PASSANT_OCCUPIED', 'En-passant target square must be empty.');
    const pawnSquare = target + (state.sideToMove === 'white' ? 8 : -8);
    const expectedSide = state.sideToMove === 'white' ? 'black' : 'white';
    if (state.board[pawnSquare]?.side !== expectedSide || state.board[pawnSquare]?.type !== 'pawn') {
      add('ENGINE_POSITION_EN_PASSANT_PAWN_MISSING', 'En-passant target requires the pawn that just double-pushed.');
    }
  }
  return errors.length === 0
    ? Object.freeze({ valid: true, errors: Object.freeze([]) as readonly [] })
    : Object.freeze({ valid: false, errors: Object.freeze(errors) });
}

export function assertEnginePosition(state: RuleState): void {
  const result = validateEnginePosition(state);
  if (!result.valid) throw new InvalidEnginePositionError(result.errors);
}
