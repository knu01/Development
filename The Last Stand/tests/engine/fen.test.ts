import { describe, expect, it } from 'vitest';
import { InvalidEnginePositionError, legalMoves, parseFen, toFen, tryApplyMove, validateEnginePosition } from '../../src/engine';

describe('six-field FEN support', () => {
  const roundTrips = [
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    'r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 17 42',
    // The target is retained even though no pawn can capture en passant.
    '4k3/8/8/3p4/8/8/8/4K3 w - d6 0 23',
    '4k3/8/8/8/8/8/8/4K3 b - - 99 120',
  ];

  it.each(roundTrips)('round-trips all six FEN fields: %s', (fen) => {
    expect(toFen(parseFen(fen))).toBe(fen);
  });

  it('distinguishes syntactic errors from structural engine-position errors', () => {
    expect(() => parseFen('8/8 w - - 0 1')).toThrowError(expect.objectContaining({ code: 'FEN_RANK_COUNT' }));
    const parsed = parseFen('8/8/8/8/8/8/8/8 w - - 0 1');
    expect(toFen(parsed)).toBe('8/8/8/8/8/8/8/8 w - - 0 1');
    expect(validateEnginePosition(parsed)).toEqual({
      valid: false,
      errors: [
        { code: 'ENGINE_POSITION_WHITE_KING_COUNT', message: expect.any(String) },
        { code: 'ENGINE_POSITION_BLACK_KING_COUNT', message: expect.any(String) },
      ],
    });
    expect(tryApplyMove(parsed, { from: 0, to: 1 })).toMatchObject({
      ok: false,
      error: {
        code: 'INVALID_ENGINE_POSITION',
        validationCodes: ['ENGINE_POSITION_WHITE_KING_COUNT', 'ENGINE_POSITION_BLACK_KING_COUNT'],
      },
    });
    try {
      legalMoves(parsed);
      throw new Error('Expected structurally invalid position to be rejected.');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidEnginePositionError);
      expect((error as InvalidEnginePositionError).errors.map(({ code }) => code)).toEqual([
        'ENGINE_POSITION_WHITE_KING_COUNT', 'ENGINE_POSITION_BLACK_KING_COUNT',
      ]);
    }
  });

  it('checks structural suitability without claiming historical reachability', () => {
    const structurallyValid = parseFen('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    expect(validateEnginePosition(structurallyValid)).toEqual({ valid: true, errors: [] });
    expect(validateEnginePosition(parseFen('4k3/8/8/3p4/8/8/8/4K3 w - d6 0 23')).valid).toBe(true);
  });

  it.each([
    ['FEN_ACTIVE_COLOR', '8/8/8/8/8/8/8/8 x - - 0 1'],
    ['FEN_CASTLING', '8/8/8/8/8/8/8/8 w KK - 0 1'],
    ['FEN_EN_PASSANT', '8/8/8/8/8/8/8/8 w - e4 0 1'],
    ['FEN_HALFMOVE_CLOCK', '8/8/8/8/8/8/8/8 w - - -1 1'],
    ['FEN_FULLMOVE_NUMBER', '8/8/8/8/8/8/8/8 w - - 0 0'],
  ] as const)('reports stable syntax code %s', (code, fen) => {
    try {
      parseFen(fen);
      throw new Error('Expected invalid FEN.');
    } catch (error) {
      expect(error).toMatchObject({ code });
    }
  });
});
