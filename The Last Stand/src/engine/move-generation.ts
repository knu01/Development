import type { Move, Piece, PieceType, PromotionPieceType, RuleState, Side, Square } from './types';
import { internPiece } from './state';
import { assertEnginePosition } from './fen';

const PROMOTION_CHOICES: readonly PromotionPieceType[] = ['queen', 'rook', 'bishop', 'knight'];

const KNIGHT_STEPS = [
  [1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1],
] as const;
const KING_STEPS = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
] as const;
const DIAGONALS = [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const;
const ORTHOGONALS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

const opposite = (side: Side): Side => side === 'white' ? 'black' : 'white';
const inBounds = (file: number, rankIndex: number): boolean =>
  file >= 0 && file < 8 && rankIndex >= 0 && rankIndex < 8;
const squareAt = (file: number, rankIndex: number): Square => rankIndex * 8 + file;
interface MoveCoordinates extends Pick<Move, 'from' | 'to'> {
  readonly captureSquare?: Square;
  readonly promotion?: PromotionPieceType;
}

export function isSquareAttacked(board: readonly (Piece | null)[], target: Square, by: Side): boolean {
  const file = target % 8;
  const rankIndex = Math.floor(target / 8);

  const pawnSourceRank = rankIndex + (by === 'white' ? 1 : -1);
  for (const pawnFile of [file - 1, file + 1]) {
    if (inBounds(pawnFile, pawnSourceRank)) {
      const piece = board[squareAt(pawnFile, pawnSourceRank)];
      if (piece?.side === by && piece.type === 'pawn') return true;
    }
  }

  for (const [df, dr] of KNIGHT_STEPS) {
    const sourceFile = file + df;
    const sourceRank = rankIndex + dr;
    if (!inBounds(sourceFile, sourceRank)) continue;
    const piece = board[squareAt(sourceFile, sourceRank)];
    if (piece?.side === by && piece.type === 'knight') return true;
  }

  for (const [df, dr] of KING_STEPS) {
    const sourceFile = file + df;
    const sourceRank = rankIndex + dr;
    if (!inBounds(sourceFile, sourceRank)) continue;
    const piece = board[squareAt(sourceFile, sourceRank)];
    if (piece?.side === by && piece.type === 'king') return true;
  }

  return rayAttacks(board, file, rankIndex, by, DIAGONALS, ['bishop', 'queen'])
    || rayAttacks(board, file, rankIndex, by, ORTHOGONALS, ['rook', 'queen']);
}

function rayAttacks(
  board: readonly (Piece | null)[],
  file: number,
  rankIndex: number,
  by: Side,
  directions: readonly (readonly [number, number])[],
  attackers: readonly PieceType[],
): boolean {
  for (const [df, dr] of directions) {
    let x = file + df;
    let y = rankIndex + dr;
    while (inBounds(x, y)) {
      const piece = board[squareAt(x, y)];
      if (piece) {
        if (piece.side === by && attackers.includes(piece.type)) return true;
        break;
      }
      x += df;
      y += dr;
    }
  }
  return false;
}

export function isInCheck(state: RuleState, side: Side): boolean {
  assertEnginePosition(state);
  const king = state.board.findIndex((piece) => piece?.side === side && piece.type === 'king');
  if (king < 0) throw new Error(`RuleState has no ${side} king.`);
  return isSquareAttacked(state.board, king, opposite(side));
}

function pseudoLegalMoves(state: RuleState): MoveCoordinates[] {
  const moves: MoveCoordinates[] = [];
  for (let from = 0; from < 64; from += 1) {
    const piece = state.board[from];
    if (!piece || piece.side !== state.sideToMove) continue;
    const file = from % 8;
    const rankIndex = Math.floor(from / 8);
    const addIfAvailable = (toFile: number, toRank: number): boolean => {
      if (!inBounds(toFile, toRank)) return false;
      const to = squareAt(toFile, toRank);
      const target = state.board[to];
      if (target?.side === piece.side || target?.type === 'king') return false;
      moves.push({ from, to });
      return target === null;
    };

    if (piece.type === 'pawn') {
      const forward = piece.side === 'white' ? -1 : 1;
      const oneRank = rankIndex + forward;
      const addPawnMove = (to: Square, captureSquare?: Square) => {
        const toRank = Math.floor(to / 8);
        const reachesPromotionRank = toRank === (piece.side === 'white' ? 0 : 7);
        if (reachesPromotionRank) {
          for (const promotion of PROMOTION_CHOICES) moves.push({ from, to, captureSquare, promotion });
        } else {
          moves.push({ from, to, captureSquare });
        }
      };
      if (inBounds(file, oneRank) && state.board[squareAt(file, oneRank)] === null) {
        addPawnMove(squareAt(file, oneRank));
        const startRank = piece.side === 'white' ? 6 : 1;
        const twoRank = rankIndex + forward * 2;
        if (rankIndex === startRank && state.board[squareAt(file, twoRank)] === null) {
          moves.push({ from, to: squareAt(file, twoRank) });
        }
      }
      for (const targetFile of [file - 1, file + 1]) {
        if (!inBounds(targetFile, oneRank)) continue;
        const targetSquare = squareAt(targetFile, oneRank);
        const target = state.board[targetSquare];
        if (target && target.side !== piece.side && target.type !== 'king') {
          addPawnMove(targetSquare);
        } else if (targetSquare === state.enPassantTarget && target === null) {
          const captureSquare = targetSquare + (piece.side === 'white' ? 8 : -8);
          const capturedPawn = state.board[captureSquare];
          if (capturedPawn?.side === opposite(piece.side) && capturedPawn.type === 'pawn') {
            moves.push({ from, to: targetSquare, captureSquare });
          }
        }
      }
      continue;
    }

    if (piece.type === 'knight' || piece.type === 'king') {
      const steps = piece.type === 'knight' ? KNIGHT_STEPS : KING_STEPS;
      for (const [df, dr] of steps) addIfAvailable(file + df, rankIndex + dr);
      if (piece.type === 'king') addCastlingMoves(state, from, moves);
      continue;
    }

    const directions = piece.type === 'bishop'
      ? DIAGONALS
      : piece.type === 'rook'
        ? ORTHOGONALS
        : [...DIAGONALS, ...ORTHOGONALS];
    for (const [df, dr] of directions) {
      let x = file + df;
      let y = rankIndex + dr;
      while (inBounds(x, y)) {
        const canContinue = addIfAvailable(x, y);
        if (!canContinue) break;
        x += df;
        y += dr;
      }
    }
  }
  return moves;
}

function addCastlingMoves(state: RuleState, kingFrom: Square, moves: MoveCoordinates[]): void {
  const side = state.sideToMove;
  const homeRank = side === 'white' ? 7 : 0;
  const expectedKingFrom = homeRank * 8 + 4;
  if (kingFrom !== expectedKingFrom) return;
  const opponent = opposite(side);
  if (isSquareAttacked(state.board, kingFrom, opponent)) return;

  const options = [
    { right: side === 'white' ? 'K' : 'k', castle: 'kingSide' as const, rookFile: 7, kingToFile: 6, rookToFile: 5, emptyFiles: [5, 6] },
    { right: side === 'white' ? 'Q' : 'q', castle: 'queenSide' as const, rookFile: 0, kingToFile: 2, rookToFile: 3, emptyFiles: [1, 2, 3] },
  ] as const;
  for (const option of options) {
    if (!state.castlingRights.includes(option.right)) continue;
    const rookFrom = homeRank * 8 + option.rookFile;
    if (state.board[rookFrom]?.side !== side || state.board[rookFrom]?.type !== 'rook') continue;
    if (option.emptyFiles.some((emptyFile) => state.board[homeRank * 8 + emptyFile] !== null)) continue;

    const transitFile = option.castle === 'kingSide' ? 5 : 3;
    const transitBoard = state.board.slice();
    transitBoard[kingFrom] = null;
    transitBoard[homeRank * 8 + transitFile] = state.board[kingFrom];
    if (isSquareAttacked(transitBoard, homeRank * 8 + transitFile, opponent)) continue;

    const kingTo = homeRank * 8 + option.kingToFile;
    const finalBoard = state.board.slice();
    finalBoard[kingFrom] = null;
    finalBoard[kingTo] = state.board[kingFrom];
    finalBoard[homeRank * 8 + option.rookToFile] = state.board[rookFrom];
    finalBoard[rookFrom] = null;
    if (isSquareAttacked(finalBoard, kingTo, opponent)) continue;
    moves.push({ from: kingFrom, to: kingTo });
  }
}

function moveLeavesKingSafe(state: RuleState, move: MoveCoordinates): boolean {
  const board = state.board.slice();
  board[move.to] = board[move.from];
  if (move.promotion) {
    const pawn = board[move.to];
    if (pawn) board[move.to] = internPiece(pawn.side, move.promotion);
  }
  board[move.from] = null;
  if (move.captureSquare !== undefined && move.captureSquare !== move.to) board[move.captureSquare] = null;
  const piece = state.board[move.from];
  if (piece?.type === 'king' && Math.abs(move.to - move.from) === 2) {
    const rank = Math.floor(move.from / 8);
    const kingSide = move.to > move.from;
    const rookFrom = rank * 8 + (kingSide ? 7 : 0);
    const rookTo = rank * 8 + (kingSide ? 5 : 3);
    board[rookTo] = board[rookFrom];
    board[rookFrom] = null;
  }
  const king = board.findIndex((piece) => piece?.side === state.sideToMove && piece.type === 'king');
  return king >= 0 && !isSquareAttacked(board, king, opposite(state.sideToMove));
}

export function legalMoves(state: RuleState, from?: Square): readonly Move[] {
  assertEnginePosition(state);
  const moves = pseudoLegalMoves(state)
    .filter((move) => (from === undefined || move.from === from) && moveLeavesKingSafe(state, move))
    .map((coords) => {
      const piece = state.board[coords.from];
      if (!piece) throw new Error('Generated move has no origin piece.');
      const captureSquare = coords.captureSquare ?? coords.to;
      const captured = state.board[captureSquare];
      const board = state.board.slice();
      board[coords.to] = internPiece(piece.side, coords.promotion ?? piece.type);
      board[coords.from] = null;
      if (coords.captureSquare !== undefined && coords.captureSquare !== coords.to) board[coords.captureSquare] = null;
      const castle = piece.type === 'king' && Math.abs(coords.to - coords.from) === 2
        ? (coords.to > coords.from ? 'kingSide' : 'queenSide')
        : null;
      if (castle) {
        const rank = Math.floor(coords.from / 8);
        const kingSide = castle === 'kingSide';
        const rookFrom = rank * 8 + (kingSide ? 7 : 0);
        const rookTo = rank * 8 + (kingSide ? 5 : 3);
        board[rookTo] = board[rookFrom];
        board[rookFrom] = null;
      }
      const opponent = opposite(piece.side);
      const king = board.findIndex((candidate) => candidate?.side === opponent && candidate.type === 'king');
      return Object.freeze({
        ...coords,
        piece: internPiece(piece.side, piece.type),
        capture: captured ? Object.freeze({ square: captureSquare, piece: internPiece(captured.side, captured.type) }) : null,
        promotion: coords.promotion ?? null,
        castle,
        doublePawnPush: piece.type === 'pawn' && Math.abs(coords.to - coords.from) === 16,
        givesCheck: king >= 0 && isSquareAttacked(board, king, piece.side),
      });
    });
  return Object.freeze(moves);
}
