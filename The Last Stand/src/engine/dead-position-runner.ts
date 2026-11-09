import { detectDeadPosition } from './dead-position';
import type { DeadPositionOptions, DeadPositionResult } from './dead-position';
import type { RuleState } from './types';

export type DeadPositionRunnerOptions = DeadPositionOptions;

function isDeadPositionResult(value: unknown): value is DeadPositionResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as Partial<DeadPositionResult>;
  if (typeof result.nodes !== 'number' || !Number.isFinite(result.nodes) || result.nodes < 0) return false;
  if (!result.sideNodes || !Number.isFinite(result.sideNodes.white) || !Number.isFinite(result.sideNodes.black)) return false;
  if (result.kind === 'DEAD') return true;
  if (result.kind === 'UNDETERMINED') return result.reason === 'CANCELLED' || result.reason === 'RESOURCE_LIMIT' || result.reason === 'SEARCH_ERROR';
  return result.kind === 'LIVE' && (result.matingSide === 'white' || result.matingSide === 'black') && Array.isArray(result.witness);
}

/** Runs analysis in a terminable browser worker; Node and worker-less hosts use the cooperative runner. */
export function runDeadPositionAnalysis(state: RuleState, options: DeadPositionRunnerOptions = {}): Promise<DeadPositionResult> {
  if (typeof Worker === 'undefined') return detectDeadPosition(state, options);
  if (options.signal?.aborted) return Promise.resolve(Object.freeze({ kind: 'UNDETERMINED', reason: 'CANCELLED', nodes: 0, sideNodes: Object.freeze({ white: 0, black: 0 }) }));
  const worker = new Worker(new URL('./dead-position.worker.ts', import.meta.url), { type: 'module' });
  return new Promise((resolve) => {
    let settled = false;
    const cleanup = () => {
      options.signal?.removeEventListener('abort', abort);
      worker.terminate();
      settled = true;
    };
    const abort = () => {
      if (settled) return;
      cleanup();
      resolve(Object.freeze({ kind: 'UNDETERMINED', reason: 'CANCELLED', nodes: 0, sideNodes: Object.freeze({ white: 0, black: 0 }) }));
    };
    worker.onmessage = (event: MessageEvent<unknown>) => {
      if (settled) return;
      cleanup();
      resolve(isDeadPositionResult(event.data)
        ? event.data
        : Object.freeze({ kind: 'UNDETERMINED', reason: 'SEARCH_ERROR', nodes: 0, sideNodes: Object.freeze({ white: 0, black: 0 }) }));
    };
    worker.onerror = () => {
      if (settled) return;
      cleanup();
      resolve(Object.freeze({ kind: 'UNDETERMINED', reason: 'SEARCH_ERROR', nodes: 0, sideNodes: Object.freeze({ white: 0, black: 0 }) }));
    };
    options.signal?.addEventListener('abort', abort, { once: true });
    const { signal: _signal, onProgress: _onProgress, shouldCancel: _shouldCancel, ...workerOptions } = options;
    if (options.signal?.aborted) {
      abort();
      return;
    }
    try {
      worker.postMessage({ state, options: workerOptions });
    } catch {
      if (!settled) {
        cleanup();
        resolve(Object.freeze({ kind: 'UNDETERMINED', reason: 'SEARCH_ERROR', nodes: 0, sideNodes: Object.freeze({ white: 0, black: 0 }) }));
      }
    }
  });
}
