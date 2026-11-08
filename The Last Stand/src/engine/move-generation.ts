import type { Move, Piece, PieceType, RuleState, Side, Square } from './types';

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
  const king = state.board.findIndex((piece) => piece?.side === side && piece.type === 'king');
  if (king < 0) throw new Error(`RuleState has no ${side} king.`);
  return isSquareAttacked(state.board, king, opposite(side));
}

function pseudoLegalMoves(state: RuleState): Move[] {
  const moves: Move[] = [];
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
      if (oneRank === 0 || oneRank === 7) continue;
      if (inBounds(file, oneRank) && state.board[squareAt(file, oneRank)] === null) {
        moves.push({ from, to: squareAt(file, oneRank) });
        const startRank = piece.side === 'white' ? 6 : 1;
        const twoRank = rankIndex + forward * 2;
        if (rankIndex === startRank && state.board[squareAt(file, twoRank)] === null) {
          moves.push({ from, to: squareAt(file, twoRank) });
        }
      }
      for (const targetFile of [file - 1, file + 1]) {
        if (!inBounds(targetFile, oneRank)) continue;
        const target = state.board[squareAt(targetFile, oneRank)];
        if (target && target.side !== piece.side && target.type !== 'king') {
          moves.push({ from, to: squareAt(targetFile, oneRank) });
        }
      }
      continue;
    }

    if (piece.type === 'knight' || piece.type === 'king') {
      const steps = piece.type === 'knight' ? KNIGHT_STEPS : KING_STEPS;
      for (const [df, dr] of steps) addIfAvailable(file + df, rankIndex + dr);
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

function moveLeavesKingSafe(state: RuleState, move: Move): boolean {
  const board = state.board.slice();
  board[move.to] = board[move.from];
  board[move.from] = null;
  const king = board.findIndex((piece) => piece?.side === state.sideToMove && piece.type === 'king');
  return king >= 0 && !isSquareAttacked(board, king, opposite(state.sideToMove));
}

export function legalMoves(state: RuleState, from?: Square): readonly Move[] {
  if (state.board.length !== 64) throw new Error('RuleState board must have 64 squares.');
  const moves = pseudoLegalMoves(state)
    .filter((move) => (from === undefined || move.from === from) && moveLeavesKingSafe(state, move))
    .map((move) => Object.freeze(move));
  return Object.freeze(moves);
}
