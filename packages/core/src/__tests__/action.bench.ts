import { bench, describe } from 'vitest';
import { action } from '../action';
import { useEidosStore } from '../store';

const onlineAction = action(async () => 'ok', {
  name: 'bench-online-best-effort',
});

const neverLoseAction = action(async () => 'ok', {
  name: 'bench-online-neverlose',
  reliability: 'neverLose',
});

const offlineAction = action(async () => 'ok', {
  name: 'bench-offline-neverlose',
  reliability: 'neverLose',
});

describe('action dispatch', () => {
  bench(
    'best-effort action, online, success',
    async () => {
      await onlineAction();
    },
    {
      setup: () => useEidosStore.setState(() => ({ isOnline: true })),
    },
  );

  bench(
    'neverLose action, online, success (no queueing)',
    async () => {
      await neverLoseAction();
    },
    {
      setup: () => useEidosStore.setState(() => ({ isOnline: true })),
    },
  );

  bench(
    'neverLose action, offline (persist + queue via IDB)',
    async () => {
      await offlineAction();
    },
    {
      setup: () => useEidosStore.setState(() => ({ isOnline: false })),
    },
  );
});
