import { bench, describe } from 'vitest';
import type { ActionContext } from '@sweidos/eidos';
import { getActionContext, isActionContext, idempotencyHeaders } from '../action-context';

const ctx: ActionContext = { idempotencyKey: 'key-1', attempt: 0 };
const args = [{ id: 1 }, 'name', ctx];

describe('action-context helpers', () => {
  bench('isActionContext (match)', () => {
    isActionContext(ctx);
  });

  bench('isActionContext (non-match)', () => {
    isActionContext({ id: 1 });
  });

  bench('getActionContext (trailing arg present)', () => {
    getActionContext(args);
  });

  bench('getActionContext (no trailing context)', () => {
    getActionContext([{ id: 1 }, 'name']);
  });

  bench('idempotencyHeaders', () => {
    idempotencyHeaders(ctx);
  });
});
