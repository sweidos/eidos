// Module-scope declarations — action functions are registered here so they
// survive page refreshes and are available for queue replay on reconnect.
import { resource, action } from '@eidos/core';
// ── Resources ─────────────────────────────────────────────────────────────────
export const productsResource = resource('/api/products', {
    offline: true,
});
// ── Actions ───────────────────────────────────────────────────────────────────
export const createOrder = action(async (payload) => {
    const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok)
        throw new Error(`Order failed: ${res.status}`);
    return res.json();
}, {
    reliability: 'neverLose',
    name: 'createOrder',
});
