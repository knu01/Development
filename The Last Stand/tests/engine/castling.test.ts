import { describe, expect, it } from 'vitest';
import {
  applyLegalMove, legalMoves, parseFen, toFen, tryApplyMove, validateEnginePosition,
} from '../../src/engine';
import { CASTLING_POSITIONS, KIWIPETE_CASTLING_FEN, KIWIPETE_CASTLING_PERFT_DEPTH_1 } from '../fixtures/m2-castling';

const square = (name: string) => (8 - Number(name[1])) * 8 + name.charCodeAt(0) - 97;
const hasCastle = (fen: string, from: string, to: string, castle: 'kingSide' | 'queenSide') =>
  legalMoves(parseFen(fen)).some((move) => move.from === square(from) && move.to === square(to) && move.castle === castle);

function perft(fen: string, depth: number): number {
  const state = parseFen(fen);
  if (depth === 0) return 1;
  return legalMoves(state).reduce((nodes, move) => nodes + perft(toFen(applyLegalMove(state, move)), depth - 1), 0);
}

describe('castling legality and transitions', () => {
  it('generates and applies all four castling moves with canonical facts', () => {
    expect(hasCastle(CASTLING_POSITIONS.white, 'e1', 'g1', 'kingSide')).toBe(true);
    expect(hasCastle(CASTLING_POSITIONS.white, 'e1', 'c1', 'queenSide')).toBe(true);
    expect(hasCastle(CASTLING_POSITIONS.black, 'e8', 'g8', 'kingSide')).toBe(true);
    expect(hasCastle(CASTLING_POSITIONS.black, 'e8', 'c8', 'queenSide')).toBe(true);

    const start = parseFen(CASTLING_POSITIONS.white);
    const result = tryApplyMove(start, { from: square('e1'), to: square('g1'), castle: 'kingSide' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.move).toMatchObject({ from: square('e1'), to: square('g1'), castle: 'kingSide', piece: { type: 'king' } });
    expect(result.state.board[square('g1')]).toMatchObject({ side: 'white', type: 'king' });
    expect(result.state.board[square('f1')]).toMatchObject({ side: 'white', type: 'rook' });
    expect(result.state.castlingRights).toEqual(['k', 'q']);
  });

  it('rejects castling when the king is in check, or crosses or lands on an attacked square', () => {
    const inCheck = '4r2k/8/8/8/8/8/8/R3K2R w KQ - 0 1';
    const transitAttacked = '4k3/8/8/8/8/8/5r2/R3K2R w KQ - 0 1';
    const destinationAttacked = '4k1r1/8/8/8/8/8/8/R3K2R w KQ - 0 1';
    const queenTransitAttacked = '4k3/8/8/8/6b1/8/8/R3K2R w KQ - 0 1';
    expect(hasCastle(inCheck, 'e1', 'g1', 'kingSide')).toBe(false);
    expect(hasCastle(inCheck, 'e1', 'c1', 'queenSide')).toBe(false);
    expect(hasCastle(transitAttacked, 'e1', 'g1', 'kingSide')).toBe(false);
    expect(hasCastle(destinationAttacked, 'e1', 'g1', 'kingSide')).toBe(false);
    expect(hasCastle(queenTransitAttacked, 'e1', 'c1', 'queenSide')).toBe(false);
  });

  it('requires the right, the correct king and rook, and empty intervening squares', () => {
    const noRight = '4k3/8/8/8/8/8/8/R3K2R w - - 0 1';
    const missingRook = parseFen('4k3/8/8/8/8/8/8/4K3 w K - 0 1');
    const blocked = '4k3/8/8/8/8/8/8/R3KN1R w KQ - 0 1';
    const blockedQueensideBFile = '4k3/8/8/8/8/8/8/RN2K2R w KQ - 0 1';
    expect(hasCastle(noRight, 'e1', 'g1', 'kingSide')).toBe(false);
    expect(validateEnginePosition(missingRook)).toMatchObject({
      valid: false,
      errors: [{ code: 'ENGINE_POSITION_CASTLING_ROOK_MISSING' }],
    });
    expect(hasCastle(blocked, 'e1', 'g1', 'kingSide')).toBe(false);
    expect(hasCastle(blocked, 'e1', 'c1', 'queenSide')).toBe(true);
    expect(hasCastle(blockedQueensideBFile, 'e1', 'c1', 'queenSide')).toBe(false);
    expect(hasCastle(blockedQueensideBFile, 'e1', 'g1', 'kingSide')).toBe(true);
  });

  it('revokes rights after king or rook movement and after a home rook is captured', () => {
    const start = parseFen(CASTLING_POSITIONS.white);
    const kingMoved = applyLegalMove(start, { from: square('e1'), to: square('e2') });
    expect(kingMoved.castlingRights).toEqual(['k', 'q']);
    const rookMoved = applyLegalMove(start, { from: square('h1'), to: square('h2') });
    expect(rookMoved.castlingRights).toEqual(['Q', 'k', 'q']);
    const otherRookMoved = applyLegalMove(start, { from: square('a1'), to: square('a2') });
    expect(otherRookMoved.castlingRights).toEqual(['K', 'k', 'q']);

    const captureStart = parseFen(CASTLING_POSITIONS.white);
    const blackRookCaptured = applyLegalMove(captureStart, { from: square('a1'), to: square('a8') });
    expect(blackRookCaptured.castlingRights).toEqual(['K', 'k']);
    const blackKingSideRookCaptured = applyLegalMove(captureStart, { from: square('h1'), to: square('h8') });
    expect(blackKingSideRookCaptured.castlingRights).toEqual(['Q', 'q']);
  });

  it('matches the published Kiwipete depth-one perft count', () => {
    // Depth two also includes an en-passant reply, which belongs to a later M2 stage.
    expect(perft(KIWIPETE_CASTLING_FEN, 1)).toBe(KIWIPETE_CASTLING_PERFT_DEPTH_1);
  });
});
