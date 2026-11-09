import { applyLegalMove } from './apply-move';
import { positionKey } from './draw-rules';
import { isInCheck, legalMoves } from './move-generation';
import type { Move, RuleState, Side } from './types';

export type DeadPositionResult =
  | { readonly kind: 'LIVE'; readonly matingSide: Side; readonly witness: readonly Move[]; readonly nodes: number }
  | { readonly kind: 'DEAD'; readonly nodes: number }
  | { readonly kind: 'UNDETERMINED'; readonly reason: 'CANCELLED' | 'SEARCH_ERROR'; readonly nodes: number };

export interface DeadPositionOptions {
  readonly batchSize?: number;
  readonly onProgress?: (nodes: number) => void;
  readonly shouldCancel?: () => boolean;
}

interface SearchNode { readonly state: RuleState; readonly parent: number; readonly move: Move | null }
interface SideSearch { readonly witness: readonly Move[] | null; readonly nodes: number; readonly cancelled: boolean }

function witnessFor(nodes: readonly SearchNode[], index: number, last: Move | null): readonly Move[] {
  const reversed: Move[] = last ? [last] : [];
  for (let cursor = index; cursor > 0; cursor = nodes[cursor].parent) {
    const move = nodes[cursor].move;
    if (move) reversed.push(move);
  }
  return Object.freeze(reversed.reverse());
}

async function searchForMate(state: RuleState, matingSide: Side, options: DeadPositionOptions): Promise<SideSearch> {
  const nodes: SearchNode[] = [{ state, parent: -1, move: null }];
  const seen = new Set([positionKey(state)]);
  const batchSize = Math.max(1, options.batchSize ?? 256);
  const pending = [0];
  let visited = 0;
  while (pending.length) {
    if (options.shouldCancel?.()) return { witness: null, nodes: nodes.length, cancelled: true };
    const index = pending.pop()!;
    const node = nodes[index];
    const moves = legalMoves(node.state);
    if (moves.length === 0 && node.state.sideToMove !== matingSide && isInCheck(node.state, node.state.sideToMove)) {
      return { witness: witnessFor(nodes, index, null), nodes: nodes.length, cancelled: false };
    }
    for (const move of [...moves].sort((a, b) => Number(b.givesCheck) - Number(a.givesCheck))) {
      const next = applyLegalMove(node.state, move);
      const key = positionKey(next);
      if (seen.has(key)) continue;
      seen.add(key);
      const child = nodes.length;
      nodes.push({ state: next, parent: index, move });
      if (next.sideToMove !== matingSide && legalMoves(next).length === 0 && isInCheck(next, next.sideToMove)) {
        return { witness: witnessFor(nodes, child, null), nodes: nodes.length, cancelled: false };
      }
      pending.push(child);
    }
    visited += 1;
    if (visited % batchSize === 0) {
      options.onProgress?.(nodes.length);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }
  return { witness: null, nodes: nodes.length, cancelled: false };
}

/**
 * Exhaustive finite-state reachability using production legal moves. It has no
 * wall-clock/node cutoff: cancellation is the only non-definitive exit. State
 * identity retains side, rights, and legally available en passant, while clocks
 * are omitted as required by the dead-position definition.
 */
export async function detectDeadPosition(state: RuleState, options: DeadPositionOptions = {}): Promise<DeadPositionResult> {
  let totalNodes = 0;
  try {
    for (const matingSide of ['white', 'black'] as const) {
      const result = await searchForMate(state, matingSide, options);
      totalNodes += result.nodes;
      if (result.cancelled) return Object.freeze({ kind: 'UNDETERMINED', reason: 'CANCELLED', nodes: totalNodes });
      if (result.witness) {
        let current = state;
        for (const move of result.witness) current = applyLegalMove(current, move);
        if (current.sideToMove === matingSide || legalMoves(current).length !== 0 || !isInCheck(current, current.sideToMove)) {
          return Object.freeze({ kind: 'UNDETERMINED', reason: 'SEARCH_ERROR', nodes: totalNodes });
        }
        return Object.freeze({ kind: 'LIVE', matingSide, witness: result.witness, nodes: totalNodes });
      }
    }
    return Object.freeze({ kind: 'DEAD', nodes: totalNodes });
  } catch {
    // Allocation failures, worker/runtime failures, and engine errors are never
    // evidence of deadness or live play.
    return Object.freeze({ kind: 'UNDETERMINED', reason: 'SEARCH_ERROR', nodes: totalNodes });
  }
}
