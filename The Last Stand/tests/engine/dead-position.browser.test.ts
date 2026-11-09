import { describe, expect, it } from 'vitest';
import { parseFen, runDeadPositionAnalysis } from '../../src/engine';

describe('dead-position worker', () => {
  it('terminates cancelled work as UNDETERMINED', async () => {
    const controller = new AbortController();
    const analysis = runDeadPositionAnalysis(parseFen('4k3/8/8/8/8/8/6N1/4K3 w - - 0 1'), {
      signal: controller.signal,
      maxNodes: 800_000,
      timeBudgetMs: 10_000,
    });
    setTimeout(() => controller.abort(), 0);
    await expect(analysis).resolves.toMatchObject({ kind: 'UNDETERMINED', reason: 'CANCELLED' });
  }, 10_000);
});
