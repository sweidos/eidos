# Eidos Troubleshooting Guide

Each section below corresponds to a specific symptom. Find your message or
behaviour, read the cause, then copy the fix.

All `[eidos]` warnings appear in the browser DevTools console. They are emitted
only in development builds (`import.meta.env.DEV = true`) and are stripped from
production bundles.

---

## Console warnings

### `[eidos] Service workers are not supported in this context.`

**Full message**

```
[eidos] Service workers are not supported in this context. Offline support and
SW-side caching are disabled. Service workers require a modern browser with a
secure context (HTTPS or localhost).
```

**Cause** — `navigator.serviceWorker` is absent. This happens in:

- Internet Explorer / legacy browsers that never shipped SW support.
- Test environments (jsdom, happy-dom) without a SW mock.
- Server-side rendering — `navigator` is `undefined` on Node.
- Some in-app WebViews that strip browser APIs.

**Fix**

For production browsers this warning should never appear — all modern browsers
ship SW support. If you see it in a test environment, the warning is expected:
Eidos degrades gracefully (the queue and stores still work; only SW-side caching
is absent). No code change needed for testing.

If you see it in a real browser that should support service workers, check that
you are serving over HTTPS (or localhost) — some browsers disable `serviceWorker`
entirely on non-secure origins even when the API exists.

---

### `[eidos] Service workers require a secure context (HTTPS or localhost).`

**Full message**

```
[eidos] Service workers require a secure context (HTTPS or localhost).
initEidos() was called on "http://192.168.1.x:5173" — the browser will silently
disable offline support. Switch to localhost for development or deploy to HTTPS.
```

**Cause** — `window.isSecureContext` is `false`. The browser refuses SW
registration on non-`localhost` HTTP origins. The most common trigger is
accessing your dev server by LAN IP (e.g. to test on a phone on the same WiFi).

**Fix — option A: use localhost**

Access your dev server via `localhost` on the same machine. SW registration
succeeds, offline features work.

**Fix — option B: Vite HTTPS**

Install `@vitejs/plugin-basic-ssl` and enable HTTPS in `vite.config.ts`:

```ts
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [basicSsl()],
});
```

Then access `https://192.168.1.x:5173` — the self-signed cert will trigger a
browser warning but SW registration will succeed.

**Fix — option C: disable for that device only**

In Chrome on Android: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
→ add your LAN URL → relaunch. Development only; never do this in production.

---

### `[eidos] Service worker file not found at "/eidos-sw.js".`

**Full message**

```
[eidos] Service worker file not found at "/eidos-sw.js". Did you add the eidos()
plugin to your vite.config.ts? If you're not using Vite, copy the file manually:
node_modules/@sweidos/eidos/dist/eidos-sw.js → public/eidos-sw.js
```

**Cause** — The browser fetched `/eidos-sw.js` and got a 404. The SW file
is not in your `public/` folder.

**Fix — Vite projects (recommended)**

Add the `eidos()` Vite plugin — it copies the SW file automatically on every
build and dev-server start:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { eidos } from '@sweidos/eidos/vite';

export default defineConfig({
  plugins: [eidos()],
});
```

**Fix — non-Vite projects**

Copy the SW file into your public directory once and commit it:

```sh
cp node_modules/@sweidos/eidos/dist/eidos-sw.js public/eidos-sw.js
```

Re-run this after upgrading `@sweidos/eidos` so the SW and the package stay
in sync. Add a `postinstall` script if you want it automated:

```json
// package.json
{
  "scripts": {
    "postinstall": "cp node_modules/@sweidos/eidos/dist/eidos-sw.js public/eidos-sw.js"
  }
}
```

**Fix — custom SW path**

If you keep your public assets at a non-root path or use a different filename,
pass `swPath` to `initEidos()`:

```ts
initEidos({ swPath: '/assets/eidos-sw.js' });
```

Make sure the file actually exists at that path — the warning will include
whatever `swPath` was passed.

---

### `[eidos] Service worker registration failed: …`

**Full message**

```
[eidos] Service worker registration failed: SecurityError: Failed to register a
ServiceWorker: The script has an unsupported MIME type ('text/html').
```

(The suffix varies — it's the raw browser error.)

**Cause** — Registration failed for a reason other than a 404: wrong MIME type
(the server returned HTML instead of JS), SW scope conflict, or a browser
security policy.

**Common sub-causes and fixes**

| Browser message                                  | Cause                                                               | Fix                                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `unsupported MIME type ('text/html')`            | Server returned an error HTML page instead of the JS file           | Confirm the file exists at the path and your server doesn't rewrite it to `index.html` |
| `The scope must be a subdirectory of the script` | `scope` wider than the SW file's directory                          | Move the SW to the root (`/eidos-sw.js`) or adjust `swPath`                            |
| `SecurityError` / `NotAllowedError`              | Browser policy, incognito with some settings, or extension conflict | Test in a normal window; disable extensions                                            |

**Debug steps**

1. Run `eidosDebug()` in the browser console:
   ```js
   // paste in DevTools console
   (await import('/eidos-sw.js')).toString(); // should NOT return HTML
   ```
2. Check `eidosDebug().swError` — the full error string is stored there.
3. Open DevTools → Application → Service Workers to see what the browser reports.

---

## Runtime issues (no console warning)

### SW is stuck in `waiting` / app never picks up updates

**Symptom** — DevTools shows a new SW "waiting to activate". Refreshing doesn't
help. `eidosDebug()` shows `swStatus: 'active'` but you're on an old version.

**Cause** — Another tab with the old SW is open. Browsers won't activate the
waiting SW until all tabs using the old SW are closed, unless `skipWaiting` is
set.

**Fix — default behaviour (skipWaiting: true)**

By default `skipWaiting: true` is set in `initEidos()` — the new SW should
activate automatically without needing to close other tabs. If it's not
activating, check that `initEidos()` is actually being called in the other tabs
(e.g. tab opened before you deployed the Eidos provider).

**Fix — if you set skipWaiting: false**

You opted into the toast-then-reload pattern. Call `triggerSwUpdate()` from
your toast confirm handler:

```ts
import { initEidos, triggerSwUpdate } from '@sweidos/eidos';

initEidos({
  skipWaiting: false,
  onUpdateAvailable: () => {
    showToast({ message: 'Update ready', action: { label: 'Reload', onClick: triggerSwUpdate } });
  },
});
```

You can also force-activate from the Eidos Devtools panel — open the "SW" tab
and click "Force update".

---

### `maxAge` doesn't seem to expire cached responses

**Symptom** — You set `maxAge: 60_000` but stale responses are still served
after 60 seconds.

**Cause** — Most likely the cache entries were written before `maxAge` enforcement
was added (Eidos < 2.2.0). Old entries have no `X-Eidos-Cached-At` timestamp
header and are treated as "fresh with unknown age" to avoid a cache stampede on
upgrade. They expire naturally the next time the SW writes a fresh response.

**Fix** — Invalidate the bucket manually to force a fresh fetch:

```ts
const products = resource('/api/products', { offline: true, maxAge: 60_000 });
await products.invalidate(); // clears the cache bucket + notifies TanStack Query
```

Or clear all Eidos caches from DevTools → Application → Storage → Clear site
data. The SW will re-populate on the next request with correct timestamps.

---

### `networkTimeoutMs` / requests hang longer than expected

**Symptom** — `network-first` resources take longer than `networkTimeoutMs` to
fall back to cache.

**Cause** — `networkTimeoutMs` is threaded to the SW via `postMessage` at
registration time (`EIDOS_REGISTER_RESOURCE`). If `initEidos()` completes before
`resource()` is called, the message is buffered and delivered once the SW
activates — this is normal. However if the SW is still `installing` when the
first fetch occurs, it will use the hardcoded default (3000 ms) for that first
request.

**Fix** — Call `resource()` before or immediately after `initEidos()`, so the
registration message is in the buffer when the SW activates:

```ts
await initEidos();
const api = resource('/api/data', { offline: true, networkTimeoutMs: 5000 });
```

---

## `eidosDebug()` reference

Call `eidosDebug()` in the browser DevTools console for a JSON snapshot of all
Eidos runtime state:

```ts
import { eidosDebug } from '@sweidos/eidos';
console.log(JSON.stringify(eidosDebug(), null, 2));
```

Key fields:

| Field                    | What it tells you                                                     |
| ------------------------ | --------------------------------------------------------------------- |
| `version`                | Package version — confirm you're on the right release                 |
| `swStatus`               | `'idle'` / `'registering'` / `'active'` / `'error'` / `'unsupported'` |
| `swError`                | Full browser error string when `swStatus === 'error'`                 |
| `swRegistration.active`  | Active SW script URL — confirms which SW version is running           |
| `swRegistration.waiting` | Non-null when an update is waiting to activate                        |
| `isOnline`               | Current online state (mirrors `navigator.onLine`)                     |
| `resourceCount`          | Number of registered `resource()` handles                             |
| `queue`                  | Full action queue with status, retry count, idempotency key           |
| `reliability`            | Cumulative `neverLose` outcome counters for this session              |

Attach `eidosDebug()` output to bug reports — it answers most "why is Eidos
doing X" questions without needing a full reproduction.
