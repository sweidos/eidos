import { ExternalLink } from 'lucide-react';
import { BulletList, Collapse, InlineCode, SectionHeading } from './shared';
import { CodeBlock } from '../../components/CodeBlock';

export function Advanced() {
  return (
    <section id="advanced" className="space-y-3">
      <SectionHeading
        id="advanced"
        eyebrow="advanced"
        title="Keep the heavy reference tucked away"
        description="These are the details that are useful, but not worth putting in the main reading path."
      />

      <div className="space-y-3">
        <Collapse title="URL patterns and cross-origin resources">
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-eidos-text-dim">
              Use <InlineCode>*</InlineCode> for one path segment, <InlineCode>**</InlineCode> for
              nested paths, and <InlineCode>:param</InlineCode> for named segments. For external
              APIs, pass the full URL including origin. Patterns use{' '}
              <InlineCode>resourcePattern()</InlineCode> — the SW intercepts matching requests
              automatically, so the handle only exposes <InlineCode>invalidate()</InlineCode> and{' '}
              <InlineCode>unregister()</InlineCode>.
            </p>
            <CodeBlock
              title="patterns.ts"
              code={`resourcePattern('/api/products/*', { offline: true })
resourcePattern('/api/users/:id/orders', { offline: true })
resourcePattern('https://cdn.example.com/assets/**', { offline: true })`}
            />
          </div>
        </Collapse>

        <Collapse title="Caching strategies">
          <div className="space-y-3">
            <BulletList
              items={[
                '`stale-while-revalidate` is the default when `offline: true` is set.',
                '`cache-first` is best for data that rarely changes.',
                '`network-first` favors freshness and only falls back to cache when offline.',
              ]}
            />
            <CodeBlock
              title="strategies.ts"
              code={`resource('/api/products', { offline: true })
resource('/api/config', { offline: true, strategy: 'cache-first' })
resource('/api/feed', { offline: true, strategy: 'network-first' })`}
            />
          </div>
        </Collapse>

        <Collapse title="Framework adapters">
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-eidos-text-dim">
              The same <InlineCode>resource()</InlineCode> / <InlineCode>action()</InlineCode>{' '}
              primitives work outside React — each adapter swaps the storage and reactivity layer
              for the host environment.
            </p>

            <div className="space-y-2">
              <p className="text-xs font-medium text-eidos-text">
                Next.js App Router — <InlineCode>@sweidos/eidos/nextjs</InlineCode>
              </p>
              <p className="text-sm leading-relaxed text-eidos-text-dim">
                Pre-marked <InlineCode>&apos;use client&apos;</InlineCode> exports — drop hooks into
                a layout or page without a separate client wrapper.
              </p>
              <CodeBlock
                title="app/products/page.tsx"
                code={`import { useEidosResource } from '@sweidos/eidos/nextjs'

export default function ProductsPage() {
  const products = useEidosResource('/api/products')
  return <ProductList data={products.data} />
}`}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-eidos-text">
                Next.js Server Actions — <InlineCode>@sweidos/next</InlineCode>
              </p>
              <p className="text-sm leading-relaxed text-eidos-text-dim">
                <InlineCode>serverAction()</InlineCode> wraps a{' '}
                <InlineCode>&apos;use server&apos;</InlineCode> function with{' '}
                <InlineCode>action()</InlineCode> —{' '}
                <InlineCode>{`reliability: 'neverLose'`}</InlineCode> by default, deduped by{' '}
                <InlineCode>idempotencyKey</InlineCode>.
              </p>
              <CodeBlock
                title="app/actions.ts"
                code={`'use server'
import { serverAction, getActionContext } from '@sweidos/next'

export const createOrder = serverAction(async (payload: OrderPayload) => {
  const { idempotencyKey, attempt } = getActionContext()
  return db.orders.create({ ...payload, idempotencyKey })
})`}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-eidos-text">
                SvelteKit — <InlineCode>@sweidos/eidos/sveltekit</InlineCode>
              </p>
              <p className="text-sm leading-relaxed text-eidos-text-dim">
                Initialize once in <InlineCode>onMount</InlineCode>, then read framework-agnostic
                stores with Svelte&apos;s <InlineCode>$</InlineCode> auto-subscribe.
              </p>
              <CodeBlock
                title="+layout.svelte"
                code={`<script>
  import { onMount } from 'svelte'
  import { initEidosSvelteKit, eidosQueue, eidosStatus } from '@sweidos/eidos/sveltekit'

  onMount(() => initEidosSvelteKit())
</script>

{#if !$eidosStatus.isOnline}
  <p>Offline — {$eidosQueue.length} change(s) queued</p>
{/if}`}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-eidos-text">
                React Native — <InlineCode>@sweidos/eidos/react-native</InlineCode>
              </p>
              <p className="text-sm leading-relaxed text-eidos-text-dim">
                Same <InlineCode>action()</InlineCode> API, backed by AsyncStorage instead of a
                Service Worker — no extra setup beyond the provider.
              </p>
              <CodeBlock
                title="App.tsx"
                code={`import { EidosProvider } from '@sweidos/eidos/react-native'
import { createOrder } from './actions'

export default function App() {
  return (
    <EidosProvider>
      <Checkout onSubmit={createOrder} />
    </EidosProvider>
  )
}`}
              />
            </div>
          </div>
        </Collapse>

        <Collapse title="OpenAPI codegen">
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-eidos-text-dim">
              <InlineCode>eidos-gen</InlineCode> reads an OpenAPI 3.x spec (JSON or YAML) and writes
              typed <InlineCode>resource()</InlineCode> + <InlineCode>action()</InlineCode>{' '}
              declarations — including request/response interfaces from{' '}
              <InlineCode>$ref</InlineCode> schemas, <InlineCode>{'{id}'}</InlineCode> →{' '}
              <InlineCode>:id</InlineCode> path-param conversion, and DELETE body omission.
            </p>

            <CodeBlock
              language="bash"
              title="terminal"
              code={`npx eidos-gen openapi.json --out src/lib/eidos.generated.ts

eidos-gen: reading openapi.json
eidos-gen: wrote src/lib/eidos.generated.ts
           2 resource(s), 2 action(s)
           2 type(s)`}
            />

            <p className="text-xs font-medium text-eidos-text">Given this spec...</p>
            <CodeBlock
              language="json"
              title="openapi.json"
              code={`{
  "openapi": "3.0.0",
  "info": { "title": "Shop API", "version": "1.0.0" },
  "paths": {
    "/products": {
      "get": {
        "operationId": "listProducts",
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": { "$ref": "#/components/schemas/Product" }
                }
              }
            }
          }
        }
      },
      "post": {
        "operationId": "createProduct",
        "requestBody": {
          "content": {
            "application/json": { "schema": { "$ref": "#/components/schemas/Product" } }
          }
        },
        "responses": {
          "201": {
            "content": {
              "application/json": { "schema": { "$ref": "#/components/schemas/Product" } }
            }
          }
        }
      }
    },
    "/products/{id}": {
      "delete": { "operationId": "deleteProduct", "responses": { "204": {} } }
    }
  },
  "components": {
    "schemas": {
      "Product": {
        "type": "object",
        "required": ["id", "name"],
        "properties": {
          "id": { "type": "integer" },
          "name": { "type": "string" },
          "tags": { "type": "array", "items": { "type": "string" } }
        }
      }
    }
  }
}`}
            />

            <p className="text-xs font-medium text-eidos-text">...eidos-gen writes:</p>
            <CodeBlock
              title="eidos.generated.ts"
              code={`import { resource, action } from '@sweidos/eidos'

export interface Product {
  id: number
  name: string
  tags?: string[]
}

export const listProducts = resource('/products', { offline: true })

export const createProduct = action(
  async (payload: Product): Promise<Product> => {
    const res = await fetch('/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return res.json()
  },
  { reliability: 'neverLose', name: 'createProduct' },
)

export const deleteProduct = action(
  async (id: string | number) => {
    const res = await fetch(\`/products/\${id}\`, { method: 'DELETE' })
    if (!res.ok) throw new Error(\`Request failed: \${res.status}\`)
  },
  { reliability: 'neverLose', name: 'deleteProduct' },
)`}
            />

            <BulletList
              items={[
                '`--no-offline` — set `offline: false` on every generated `resource()`.',
                '`--eidos <pkg>` — import from a custom package path (e.g. a re-export with extra config).',
                'Re-run after the spec changes — the file is fully regenerated, so keep custom code in a separate module.',
              ]}
            />
          </div>
        </Collapse>

        <Collapse title="Testing utilities">
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-eidos-text-dim">
              <InlineCode>@sweidos/eidos/testing</InlineCode> gives Vitest, Jest, and Playwright
              suites direct control over the runtime — flip online/offline state, drain the action
              queue synchronously, inspect cached responses, and reset everything between tests.
              Everything runs at the JS layer, no real Service Worker required.
            </p>

            <div className="space-y-2">
              <p className="text-xs font-medium text-eidos-text">Reset state between tests</p>
              <CodeBlock
                title="setup.ts"
                code={`import { beforeEach } from 'vitest'
import { resetEidos } from '@sweidos/eidos/testing'

// Clears the action queue, resource cache, and online state
// before every test — start each test from a clean slate.
beforeEach(() => resetEidos())`}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-eidos-text">
                Simulate offline, then assert the write was queued
              </p>
              <CodeBlock
                title="orders.test.ts"
                code={`import { mockOffline, getEidosState } from '@sweidos/eidos/testing'
import { createOrder } from '../src/lib/eidos'

it('queues the order while offline', async () => {
  mockOffline({ stubFetch: true })

  const result = await createOrder({ productId: 1, quantity: 2 })

  expect(result.queued).toBe(true)
  expect(getEidosState().queue).toHaveLength(1)
  expect(getEidosState().queue[0].actionName).toBe('createOrder')
})`}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-eidos-text">
                Go back online and drain the queue
              </p>
              <CodeBlock
                title="orders.test.ts"
                code={`import { mockOffline, drainQueue, waitForQueueDrain, getEidosState } from '@sweidos/eidos/testing'
import { createOrder } from '../src/lib/eidos'

it('replays queued writes on reconnect', async () => {
  mockOffline()
  await createOrder({ productId: 1, quantity: 2 })

  // drainQueue() forces isOnline = true and replays immediately
  const result = await drainQueue()
  expect(result.succeeded).toBe(1)
  expect(result.failed).toBe(0)

  // ...or, for code that calls replayQueue() itself on the 'online' event:
  await waitForQueueDrain({ timeout: 2000 })
  expect(getEidosState().queue).toHaveLength(0)
})`}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-eidos-text">
                Inspect and clear the resource cache
              </p>
              <CodeBlock
                title="products.test.ts"
                code={`import { getCachedEntry, clearEidosCache } from '@sweidos/eidos/testing'

it('caches the products response for offline use', async () => {
  await products.json() // populates the cache

  const cached = await getCachedEntry('/api/products')
  expect(cached).toBeDefined()
  expect(await cached!.json()).toMatchObject({ length: 3 })
})

afterEach(() => clearEidosCache())`}
              />
            </div>
          </div>
        </Collapse>

        <Collapse title="Types and limits">
          <div className="space-y-3">
            <BulletList
              items={[
                'GET requests are cached; actions are queued separately through IndexedDB.',
                'Module-scope actions are required so replay can re-register them after refresh.',
              ]}
            />
            <a
              href="https://github.com/iamadi11/eidos/blob/main/README.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-eidos-border px-3 py-2 text-sm text-eidos-text-dim transition-colors hover:border-eidos-accent hover:text-eidos-text"
            >
              <span>Full API reference (README on GitHub)</span>
              <ExternalLink size={11} className="shrink-0 text-eidos-muted" />
            </a>
          </div>
        </Collapse>
      </div>
    </section>
  );
}
