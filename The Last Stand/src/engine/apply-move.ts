import { legalMoves } from './move-generation';
import type { Move, RuleState, Side } from './types';

const otherSide = (side: Side): Side => side === 'white' ? 'black' : 'white';

export function applyLegalMove(state: RuleState, move: Move): RuleState {
  const isLegal = legalMoves(state).some((candidate) => candidate.from === move.from && candidate.to === move.to);
  if (!isLegal) throw new Error(`Illegal move from ${move.from} to ${move.to}.`);

  const board = state.board.slice();
  board[move.to] = board[move.from];
  board[move.from] = null;
  return Object.freeze({ board: Object.freeze(board), sideToMove: otherSide(state.sideToMove) });
}
