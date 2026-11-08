import { createRuleState } from '../../src/engine';
import type { Piece, PieceType, RuleState, Side, Square } from '../../src/engine/types';

const piece = (side: Side, type: PieceType): Piece => ({ side, type });

export function position(
  rows: readonly string[],
  sideToMove: Side = 'white',
): RuleState {
  if (rows.length !== 8 || rows.some((row) => row.length !== 8)) {
    throw new Error('A test position must contain eight rows of eight squares.');
  }

  const types: Record<string, PieceType> = {
    P: 'pawn', N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king',
  };
  const board = rows.flatMap((row) => [...row].map((symbol) => {
    if (symbol === '.') return null;
    const type = types[symbol.toUpperCase()];
    if (!type) throw new Error(`Unknown test piece: ${symbol}`);
    return piece(symbol === symbol.toUpperCase() ? 'white' : 'black', type);
  }));

  return createRuleState({ board, sideToMove });
}

export const square = (file: string, rank: number): Square => {
  const fileIndex = file.charCodeAt(0) - 'a'.charCodeAt(0);
  if (fileIndex < 0 || fileIndex > 7 || rank < 1 || rank > 8) {
    throw new Error(`Invalid square ${file}${rank}`);
  }
  return (8 - rank) * 8 + fileIndex;
};
