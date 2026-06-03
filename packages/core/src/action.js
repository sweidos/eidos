import { useEidosStore } from './store';
import { idbAddToQueue, idbGetQueue, idbUpdateQueueItem, idbRemoveFromQueue, } from './idb';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _actionRegistry = new Map();
function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function action(fn, config) {
    const actionId = config.name ?? fn.name ?? uid();
    // Registering here means the function is available for replay after
    // the user refreshes the page (actions are defined at module scope).
    _actionRegistry.set(actionId, fn);
    const wrapped = async (...args) => {
        const { isOnline } = useEidosStore.getState();
        if (config.reliability === 'neverLose') {
            if (!isOnline) {
                return persistAndQueue(actionId, fn.name || actionId, args, config);
            }
            // Online + neverLose: execute, queue on failure
            try {
                return await fn(...args);
            }
            catch {
                return persistAndQueue(actionId, fn.name || actionId, args, config);
            }
        }
        // best-effort: execute directly, no queuing
        return fn(...args);
    };
    Object.defineProperty(wrapped, 'id', { value: actionId, writable: false });
    Object.defineProperty(wrapped, 'config', { value: config, writable: false });
    return wrapped;
}
async function persistAndQueue(actionId, actionName, args, config) {
    const id = uid();
    const item = {
        id,
        actionId,
        actionName,
        args,
        queuedAt: Date.now(),
        retryCount: 0,
        maxRetries: config.maxRetries ?? 3,
        status: 'pending',
    };
    await idbAddToQueue(item);
    useEidosStore.getState().addQueueItem(item);
    return {
        queued: true,
        id,
        message: `"${actionName}" queued — will execute when online`,
    };
}
export async function replayQueue() {
    const store = useEidosStore.getState();
    if (!store.isOnline)
        return;
    const queue = await idbGetQueue();
    const pending = queue.filter((item) => item.status === 'pending' || item.status === 'failed');
    for (const item of pending) {
        const fn = _actionRegistry.get(item.actionId);
        if (!fn)
            continue;
        store.updateQueueItem(item.id, { status: 'replaying' });
        await idbUpdateQueueItem(item.id, { status: 'replaying' });
        try {
            await fn(...item.args);
            const completedAt = Date.now();
            store.updateQueueItem(item.id, { status: 'succeeded', completedAt });
            await idbUpdateQueueItem(item.id, { status: 'succeeded', completedAt });
            // Remove from queue after a delay so the UI can show the success state
            setTimeout(() => {
                store.removeQueueItem(item.id);
                idbRemoveFromQueue(item.id);
            }, 3000);
        }
        catch (err) {
            const retryCount = item.retryCount + 1;
            if (retryCount >= item.maxRetries) {
                store.updateQueueItem(item.id, {
                    status: 'failed',
                    error: String(err),
                    retryCount,
                });
                await idbUpdateQueueItem(item.id, {
                    status: 'failed',
                    error: String(err),
                    retryCount,
                });
            }
            else {
                store.updateQueueItem(item.id, { status: 'pending', retryCount });
                await idbUpdateQueueItem(item.id, { status: 'pending', retryCount });
            }
        }
    }
}
