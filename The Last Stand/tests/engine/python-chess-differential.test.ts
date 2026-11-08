import { describe, expect, it } from 'vitest';
import {
  evaluateAutomaticOutcome, evaluateClaim, isInCheck, legalMoves,
  parseFen, positionKey, toFen,
} from '../../src/engine';
import { commitMove, createMatch } from '../../src/match';
import type { Move, MoveInput } from '../../src/engine';
import oracle from '../fixtures/python-chess-draw-oracle.json';

interface OraclePosition {
  readonly fen: string;
  readonly key: string;
  readonly legalMoves: readonly string[];
  readonly inCheck: boolean;
  readonly checkmate: boolean;
  readonly stalemate: boolean;
  readonly halfmoveClock: number;
  readonly repetitionCount: number;
  readonly threefoldCurrent: boolean;
  readonly threefoldClaimAvailable: boolean;
  readonly fivefoldAutomatic: boolean;
  readonly fiftyCurrent: boolean;
  readonly fiftyClaimAvailable: boolean;
  readonly seventyFiveAutomatic: boolean;
}

interface OracleScenario {
  readonly name: string;
  readonly startFen: string;
  readonly moves: readonly string[];
  readonly positions: readonly OraclePosition[];
}

function squareFromUci(text: string): number {
  return (8 - Number(text[1])) * 8 + text.charCodeAt(0) - 97;
}

function inputFromUci(uci: string): MoveInput {
  const input: { from: number; to: number; promotion?: MoveInput['promotion'] } = {
    from: squareFromUci(uci.slice(0, 2)),
    to: squareFromUci(uci.slice(2, 4)),
  };
  const promotion = uci[4];
  if (promotion) input.promotion = ({ q: 'queen', r: 'rook', b: 'bishop', n: 'knight' } as const)[promotion];
  return input;
}

function moveToUci(move: Move): string {
  const name = (square: number) => `${String.fromCharCode(97 + square % 8)}${8 - Math.floor(square / 8)}`;
  const promotion = move.promotion ? ({ queen: 'q', rook: 'r', bishop: 'b', knight: 'n' } as const)[move.promotion] : '';
  return `${name(move.from)}${name(move.to)}${promotion}`;
}

function claimExists(state: ReturnType<typeof parseFen>, history: readonly string[], basis: 'threefold' | 'fifty_move') {
  if (evaluateClaim(state, history, { basis }).kind === 'valid') return true;
  return legalMoves(state).some((move) => evaluateClaim(state, history, { basis, intendedMove: inputFromUci(moveToUci(move)) }).kind === 'valid');
}

describe('python-chess 1.11.2 differential oracle', () => {
  it.each(oracle.scenarios)('matches legal moves, state facts and draw conditions: $name', (scenario) => {
    let match = createMatch({ gameId: `oracle-${scenario.name}`, initialState: parseFen(scenario.startFen) });
    expect(scenario.positions).toHaveLength(scenario.moves.length + 1);

    for (let ply = 0; ply < scenario.positions.length; ply += 1) {
      const expected = scenario.positions[ply];
      const state = match.state;
      const moves = legalMoves(state);
      const currentOccurrences = match.positionHistory.filter((key) => key === positionKey(state)).length;
      const automatic = evaluateAutomaticOutcome(state, match.positionHistory);
      expect(toFen(state)).toBe(expected.fen);
      expect(positionKey(state)).toBe(expected.key);
      expect(moves.map(moveToUci).sort()).toEqual(expected.legalMoves);
      expect(isInCheck(state, state.sideToMove)).toBe(expected.inCheck);
      expect(moves.length === 0 && expected.inCheck).toBe(expected.checkmate);
      expect(moves.length === 0 && !expected.inCheck).toBe(expected.stalemate);
      expect(state.halfmoveClock).toBe(expected.halfmoveClock);
      expect(currentOccurrences).toBe(expected.repetitionCount);
      expect(currentOccurrences >= 3).toBe(expected.threefoldCurrent);
      expect(currentOccurrences >= 5).toBe(expected.fivefoldAutomatic);
      expect(state.halfmoveClock >= 100).toBe(expected.fiftyCurrent);
      expect(claimExists(state, match.positionHistory, 'threefold')).toBe(expected.threefoldClaimAvailable);
      expect(claimExists(state, match.positionHistory, 'fifty_move')).toBe(expected.fiftyClaimAvailable);
      expect(automatic?.kind === 'seventy_five_moves').toBe(expected.seventyFiveAutomatic);

      if (ply < scenario.moves.length) {
        const committed = commitMove(match, inputFromUci(scenario.moves[ply]));
        expect(committed.ok).toBe(true);
        if (!committed.ok) return;
        match = committed.match;
      }
    }
  });
});
