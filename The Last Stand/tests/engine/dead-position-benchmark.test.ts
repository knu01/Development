import { describe, expect, it } from 'vitest';
import { detectDeadPosition, parseFen } from '../../src/engine';

const cases = [
  ['K vs K', '4k3/8/8/8/8/8/8/4K3 w - - 0 1'],
  ['Starting position after 1.e4', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'],
  ['K+N vs K', '4k3/8/8/8/8/8/6N1/4K3 w - - 0 1'],
  ['FUN 2022 Position 1, blocked pawns and bishops', '8/1p3k2/pPp3p1/P1Pp1pPp/2bP1P1P/5K2/8/8 b - - 0 1'],
  ['FUN 2022 Position 2, Buchanan pawn a4', 'Bb1k1b2/bKp1p1p1/1pP1PP2/1P6/p5P1/P7/8/8 w - - 0 1'],
  ['FUN 2022 Position 2, Buchanan pawn a5', 'Bb1k1b2/bKp1p1p1/1pP1PP2/pP6/6P1/P7/8/8 w - - 0 1'],
  ['Queen vs king', '4k3/8/8/8/8/8/6Q1/4K3 w - - 0 1'],
  ['Castling rights', 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'],
  ['Legal en-passant right', '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1'],
  ['K+B vs K+B, same-colour bishops', '5k1b/8/8/8/8/8/8/2B1K3 w - - 0 1'],
] as const;

describe('dead-position performance corpus', () => {
  it.each(cases)('records bounded cost for %s', async (name, fen) => {
    const nodeProcess = (globalThis as typeof globalThis & { process?: { memoryUsage(): { heapUsed: number } } }).process;
    const beforeHeap = nodeProcess?.memoryUsage().heapUsed ?? null;
    const startedAt = performance.now();
    const result = await detectDeadPosition(parseFen(fen), {
      maxNodes: 800_000,
      timeBudgetMs: 10_000,
      batchSize: 512,
    });
    const elapsedMs = performance.now() - startedAt;
    const heapDeltaBytes = beforeHeap === null || !nodeProcess ? null : nodeProcess.memoryUsage().heapUsed - beforeHeap;
    console.info(`DEAD_POSITION_BENCH ${JSON.stringify({ name, result: result.kind, reason: result.kind === 'UNDETERMINED' ? result.reason : null, nodes: result.nodes, sideNodes: result.sideNodes, elapsedMs: Number(elapsedMs.toFixed(1)), heapDeltaBytes })}`);
    expect(result.nodes).toBeGreaterThan(0);
    expect(elapsedMs).toBeGreaterThanOrEqual(0);
  }, 30_000);
});
