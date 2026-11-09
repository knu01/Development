import { detectDeadPosition } from './dead-position';
import type { DeadPositionOptions } from './dead-position';
import type { RuleState } from './types';

interface RequestMessage { readonly state: RuleState; readonly options: Omit<DeadPositionOptions, 'signal' | 'shouldCancel' | 'onProgress'> }

self.addEventListener('message', (event: MessageEvent<RequestMessage>) => {
  void detectDeadPosition(event.data.state, event.data.options)
    .then((result) => self.postMessage(result))
    .catch(() => self.postMessage({ kind: 'UNDETERMINED', reason: 'SEARCH_ERROR', nodes: 0, sideNodes: { white: 0, black: 0 } }));
});
