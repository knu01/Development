import type { Move, MoveInput } from '../engine';
import { claimDraw } from './claim-draw';
import { commitMove } from './commit-move';
import { createMatch } from './create-match';
import type { Match, MatchEvent, MatchInitialConfig, MatchMoveEvent } from './types';
import { MatchReplayError } from './types';

function movesEqual(left: Move, right: Move): boolean {
  const captureEqual = left.capture === null || right.capture === null
    ? left.capture === right.capture
    : left.capture.square === right.capture.square
      && left.capture.piece.side === right.capture.piece.side
      && left.capture.piece.type === right.capture.piece.type;
  return left.from === right.from
    && left.to === right.to
    && left.piece.side === right.piece.side
    && left.piece.type === right.piece.type
    && captureEqual
    && left.promotion === right.promotion
    && left.castle === right.castle
    && left.doublePawnPush === right.doublePawnPush
    && left.givesCheck === right.givesCheck;
}

function moveInputsEqual(left: MoveInput | null, right: MoveInput | null): boolean {
  if (left === null || right === null) return left === right;
  return left.from === right.from && left.to === right.to
    && left.promotion === right.promotion
    && left.captureSquare === right.captureSquare
    && left.castle === right.castle
    && left.doublePawnPush === right.doublePawnPush;
}

function eventsEqual(left: MatchEvent, right: MatchEvent): boolean {
  if (left.kind !== right.kind || left.gameId !== right.gameId
    || left.eventSeq !== right.eventSeq || left.ply !== right.ply) return false;
  if (left.kind === 'move' && right.kind === 'move') {
    return left.movingSide === right.movingSide
      && left.moverPieceId === right.moverPieceId
      && left.capturedPieceId === right.capturedPieceId
      && left.positionKey === right.positionKey
      && left.repetitionCount === right.repetitionCount
      && left.halfmoveClock === right.halfmoveClock
      && movesEqual(left.move, right.move);
  }
  if (left.kind === 'claim' && right.kind === 'claim') {
    return left.claimant === right.claimant
      && left.basis === right.basis
      && left.outcome === right.outcome
      && left.intendedMoveExecuted === right.intendedMoveExecuted
      && moveInputsEqual(left.intendedMove, right.intendedMove);
  }
  if (left.kind === 'result' && right.kind === 'result') {
    return left.result.outcome === right.result.outcome && left.result.reason === right.result.reason;
  }
  return false;
}

function assertGeneratedEvents(expected: readonly MatchEvent[], generated: readonly MatchEvent[], context: string): void {
  if (generated.length > expected.length) {
    throw new MatchReplayError('REPLAY_EVENT_FACTS_MISMATCH', `Replay generated missing ${context} event(s).`);
  }
  for (let offset = 0; offset < generated.length; offset += 1) {
    if (!eventsEqual(expected[offset], generated[offset])) {
      const kind = generated[offset].kind;
      throw new MatchReplayError('REPLAY_EVENT_FACTS_MISMATCH', `Recorded ${kind} ${context} facts do not match independent replay.`);
    }
  }
}

function replayFailure(message: string): never {
  throw new MatchReplayError('REPLAY_EVENT_FACTS_MISMATCH', message);
}

export function replayMatch(config: MatchInitialConfig, events: readonly MatchEvent[]): Match {
  let match = createMatch(config);
  let index = 0;

  if (match.events.length > 0) {
    assertGeneratedEvents(events, match.events, 'initial result');
    index = match.events.length;
  }

  while (index < events.length) {
    const recorded = events[index];
    if (recorded.gameId !== match.gameId) {
      throw new MatchReplayError('REPLAY_GAME_ID_MISMATCH', 'An event belongs to a different game.');
    }
    if (recorded.eventSeq !== match.nextEventSeq) {
      throw new MatchReplayError('REPLAY_EVENT_SEQUENCE_MISMATCH', 'Event sequence is not contiguous.');
    }
    if (recorded.kind === 'result') {
      replayFailure('A result event was not produced by the preceding replayed action.');
    }

    const previousEventCount = match.events.length;
    if (recorded.kind === 'move') {
      if (recorded.ply !== match.ply + 1) {
        throw new MatchReplayError('REPLAY_PLY_MISMATCH', 'Move event ply does not follow the current Match ply.');
      }
      const transition = commitMove(match, recorded.move);
      if (!transition.ok) {
        throw new MatchReplayError('REPLAY_MOVE_REJECTED', `Recorded move could not be replayed: ${transition.error.kind === 'engine' ? transition.error.error.code : transition.error.code}.`);
      }
      match = transition.match;
      const generated = match.events.slice(previousEventCount);
      assertGeneratedEvents(events.slice(index), generated, 'move/result');
      index += generated.length;
      continue;
    }

    if (recorded.ply !== match.ply) {
      throw new MatchReplayError('REPLAY_PLY_MISMATCH', 'Claim event ply does not match the current Match ply.');
    }
    const claim = claimDraw(match, {
      claimant: recorded.claimant,
      basis: recorded.basis,
      intendedMove: recorded.intendedMove ?? undefined,
    });
    if (!claim.ok) replayFailure(`Recorded claim could not be independently evaluated: ${claim.error.code}.`);
    match = claim.match;
    const generated = match.events.slice(previousEventCount);
    assertGeneratedEvents(events.slice(index), generated, 'claim/move/result');
    index += generated.length;
  }
  return match;
}
