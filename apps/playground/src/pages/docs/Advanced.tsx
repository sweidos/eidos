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

        <Collapse title="OpenAPI codegen">
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-eidos-text-dim">
              <InlineCode>eidos-gen</InlineCode> reads an OpenAPI spec and writes typed{' '}
              <InlineCode>resource()</InlineCode> + <InlineCode>action()</InlineCode> declarations —
              including path params, <InlineCode>$ref</InlineCode> resolution, request/response
              types, and DELETE body omission.
            </p>
            <CodeBlock
              language="bash"
              title="terminal"
              code={`npx eidos-gen openapi.json
# → writes eidos.generated.ts`}
            />
          </div>
        </Collapse>

        <Collapse title="Testing utilities">
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-eidos-text-dim">
              The testing helpers let you flip the runtime between online and offline states, drain
              the queue, and inspect cache entries.
            </p>
            <CodeBlock
              title="tests.ts"
              code={`import {
  mockOffline, mockOnline,
  drainQueue, resetEidos,
  getCachedEntry,
} from '@sweidos/eidos/testing'`}
            />
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
