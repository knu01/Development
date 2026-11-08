import { describe, expect, it } from 'vitest';
import { parseFen, toFen } from '../../src/engine';
import { commitMove, createMatch, replayMatch } from '../../src/match';
import type { Match, MoveInput, PieceId } from '../../src/match';

const square = (name: string) => (8 - Number(name[1])) * 8 + name.charCodeAt(0) - 97;
const input = (from: string, to: string, extras: Partial<MoveInput> = {}): MoveInput => ({
  from: square(from), to: square(to), ...extras,
});
const errorMessage = (error: import('../../src/match').CommitMoveError) =>
  error.kind === 'engine' ? error.error.message : error.message;
const idAt = (match: Match, location: string): PieceId => {
  const id = match.pieceIdsBySquare[square(location)];
  if (!id) throw new Error(`No piece ID on ${location}`);
  return id;
};

describe('Match foundation', () => {
  it('assigns deterministic stable IDs from the starting position', () => {
    const options = { gameId: 'match-seed-1' };
    const first = createMatch(options);
    const second = createMatch(options);
    expect(first.pieceIdsBySquare).toEqual(second.pieceIdsBySquare);
    expect(Object.keys(first.piecesById)).toHaveLength(32);
    expect(new Set(Object.values(first.pieceIdsBySquare).filter(Boolean)).size).toBe(32);
    expect(first.piecesById[idAt(first, 'e2')]).toMatchObject({ side: 'white', currentType: 'pawn', status: 'active' });
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.pieceIdsBySquare)).toBe(true);
    expect(Object.isFrozen(first.piecesById)).toBe(true);
  });

  it('commits an ordinary move without changing the mover identity', () => {
    const match = createMatch({ gameId: 'ordinary' });
    const pawnId = idAt(match, 'e2');
    const transition = commitMove(match, input('e2', 'e4'));
    expect(transition.ok).toBe(true);
    if (!transition.ok) return;
    expect(transition.event).toMatchObject({
      gameId: 'ordinary', eventSeq: 1, ply: 1, movingSide: 'white',
      moverPieceId: pawnId, capturedPieceId: null,
      move: { from: square('e2'), to: square('e4'), doublePawnPush: true },
    });
    expect(transition.match.pieceIdsBySquare[square('e2')]).toBeNull();
    expect(transition.match.pieceIdsBySquare[square('e4')]).toBe(pawnId);
    expect(toFen(transition.match.state)).toContain(' b KQkq e3 0 1');
    expect(match.pieceIdsBySquare[square('e2')]).toBe(pawnId);
    expect(match.pieceIdsBySquare[square('e4')]).toBeNull();
    expect(match.events).toHaveLength(0);
    expect(Object.isFrozen(transition.event)).toBe(true);
  });

  it('marks a captured piece inactive and preserves its ID in the registry', () => {
    let match = createMatch({ gameId: 'capture' });
    const victimId = idAt(match, 'd7');
    for (const move of [input('e2', 'e4'), input('d7', 'd5')]) {
      const transition = commitMove(match, move);
      if (!transition.ok) throw new Error(errorMessage(transition.error));
      match = transition.match;
    }
    const moverId = idAt(match, 'e4');
    const capture = commitMove(match, input('e4', 'd5'));
    expect(capture.ok).toBe(true);
    if (!capture.ok) return;
    expect(capture.event).toMatchObject({
      eventSeq: 3, ply: 3, moverPieceId: moverId, capturedPieceId: victimId,
      move: { capture: { square: square('d5'), piece: { side: 'black', type: 'pawn' } } },
    });
    expect(capture.match.piecesById[victimId]).toMatchObject({ status: 'captured', currentType: 'pawn' });
    expect(capture.match.pieceIdsBySquare[square('d5')]).toBe(moverId);
  });

  it('uses the canonical en-passant capture square to identify the victim', () => {
    const match = createMatch({
      gameId: 'en-passant',
      initialState: parseFen('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1'),
    });
    const victimId = idAt(match, 'd5');
    const moverId = idAt(match, 'e5');
    const transition = commitMove(match, input('e5', 'd6'));
    expect(transition.ok).toBe(true);
    if (!transition.ok) return;
    expect(transition.event).toMatchObject({
      moverPieceId: moverId,
      capturedPieceId: victimId,
      move: { capture: { square: square('d5') } },
    });
    expect(transition.match.pieceIdsBySquare[square('d5')]).toBeNull();
    expect(transition.match.pieceIdsBySquare[square('d6')]).toBe(moverId);
    expect(transition.match.piecesById[victimId]?.status).toBe('captured');
  });

  it.each([
    ['white', 'e1', 'g1', 'h1', 'f1', 'kingSide'],
    ['white', 'e1', 'c1', 'a1', 'd1', 'queenSide'],
    ['black', 'e8', 'g8', 'h8', 'f8', 'kingSide'],
    ['black', 'e8', 'c8', 'a8', 'd8', 'queenSide'],
  ] as const)('moves king and rook IDs during %s %s castling', (_side, kingFrom, kingTo, rookFrom, rookTo, castle) => {
    const fen = 'r3k2r/8/8/8/8/8/8/R3K2R';
    const state = parseFen(`${fen} ${_side === 'white' ? 'w' : 'b'} KQkq - 0 1`);
    const match = createMatch({ gameId: `castle-${_side}-${castle}`, initialState: state });
    const kingId = idAt(match, kingFrom);
    const rookId = idAt(match, rookFrom);
    const transition = commitMove(match, input(kingFrom, kingTo, { castle }));
    expect(transition.ok).toBe(true);
    if (!transition.ok) return;
    expect(transition.match.pieceIdsBySquare[square(kingTo)]).toBe(kingId);
    expect(transition.match.pieceIdsBySquare[square(rookTo)]).toBe(rookId);
    expect(transition.match.pieceIdsBySquare[square(kingFrom)]).toBeNull();
    expect(transition.match.pieceIdsBySquare[square(rookFrom)]).toBeNull();
  });

  it.each(['queen', 'rook', 'bishop', 'knight'] as const)('retains pawn identity when promoting to %s', (promotion) => {
    const match = createMatch({
      gameId: `promotion-${promotion}`,
      initialState: parseFen('4k3/6P1/8/8/8/8/8/4K3 w - - 0 1'),
    });
    const pawnId = idAt(match, 'g7');
    const transition = commitMove(match, input('g7', 'g8', { promotion }));
    expect(transition.ok).toBe(true);
    if (!transition.ok) return;
    expect(transition.match.pieceIdsBySquare[square('g8')]).toBe(pawnId);
    expect(transition.match.piecesById[pawnId]).toMatchObject({ currentType: promotion, status: 'active' });
    expect(transition.event.move.promotion).toBe(promotion);
  });

  it('records both capture and pawn identity for capture promotion', () => {
    const match = createMatch({
      gameId: 'capture-promotion',
      initialState: parseFen('k6r/6P1/8/8/8/8/8/4K3 w - - 0 1'),
    });
    const pawnId = idAt(match, 'g7');
    const rookId = idAt(match, 'h8');
    const transition = commitMove(match, input('g7', 'h8', { promotion: 'knight' }));
    expect(transition.ok).toBe(true);
    if (!transition.ok) return;
    expect(transition.event).toMatchObject({ moverPieceId: pawnId, capturedPieceId: rookId });
    expect(transition.match.pieceIdsBySquare[square('h8')]).toBe(pawnId);
    expect(transition.match.piecesById[pawnId]?.currentType).toBe('knight');
    expect(transition.match.piecesById[rookId]?.status).toBe('captured');
  });

  it('rejects an illegal move without changing any original Match field', () => {
    const match = createMatch({ gameId: 'rejected' });
    const previous = {
      state: match.state,
      pieceIdsBySquare: match.pieceIdsBySquare,
      piecesById: match.piecesById,
      events: match.events,
      ply: match.ply,
      nextEventSeq: match.nextEventSeq,
    };
    const rejected = commitMove(match, input('e2', 'e5'));
    expect(rejected.ok).toBe(false);
    if (rejected.ok) return;
    expect(rejected.match).toBe(match);
    expect(match).toMatchObject(previous);
    expect(match.events).toHaveLength(0);
  });

  it('advances event sequence and ply once per accepted move', () => {
    let match = createMatch({ gameId: 'sequence' });
    for (const [index, move] of [input('e2', 'e4'), input('e7', 'e5'), input('g1', 'f3')].entries()) {
      const transition = commitMove(match, move);
      expect(transition.ok).toBe(true);
      if (!transition.ok) return;
      expect(transition.event.eventSeq).toBe(index + 1);
      expect(transition.event.ply).toBe(index + 1);
      match = transition.match;
    }
    expect(match.nextEventSeq).toBe(4);
    expect(match.ply).toBe(3);
  });

  it('replays committed events to the identical immutable Match snapshot', () => {
    const options = { gameId: 'replay' };
    let match = createMatch(options);
    for (const move of [input('e2', 'e4'), input('d7', 'd5'), input('e4', 'd5')]) {
      const transition = commitMove(match, move);
      if (!transition.ok) throw new Error(errorMessage(transition.error));
      match = transition.match;
    }
    expect(replayMatch(options, match.events)).toEqual(match);
    expect(replayMatch(options, match.events).piecesById).toEqual(match.piecesById);
  });

  it.each([
    {
      gameId: 'replay-en-passant',
      initialState: parseFen('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1'),
      move: input('e5', 'd6'),
    },
    {
      gameId: 'replay-castling',
      initialState: parseFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'),
      move: input('e1', 'c1', { castle: 'queenSide' as const }),
    },
    {
      gameId: 'replay-promotion-capture',
      initialState: parseFen('k6r/6P1/8/8/8/8/8/4K3 w - - 0 1'),
      move: input('g7', 'h8', { promotion: 'knight' as const }),
    },
  ])('replays a special move with the same identity outcomes: $gameId', ({ gameId, initialState, move }) => {
    const options = { gameId, initialState };
    const created = createMatch(options);
    const transition = commitMove(created, move);
    expect(transition.ok).toBe(true);
    if (!transition.ok) return;
    expect(replayMatch(options, transition.match.events)).toEqual(transition.match);
  });

  it('takes ownership of a supplied initial RuleState', () => {
    const initialState = parseFen('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    const match = createMatch({ gameId: 'owned', initialState });
    expect(match.state).not.toBe(initialState);
    expect(Object.isFrozen(match.state.board)).toBe(true);
    expect(match.initialState).not.toBe(initialState);
  });
});
