import { Link } from 'react-router';
import { CodeBlock } from '../../components/CodeBlock';
import { BulletList, PageIntro, StoryBox } from './shared';

export function Save() {
  return (
    <div className="space-y-8 animate-fade-in">
      <PageIntro
        title="Never lose a save"
        lead="This is the reason Eidos exists. Reads are nice. Surviving a flaky Save is the product."
        next={{ to: '/docs/read', label: 'Read offline' }}
      />

      <StoryBox>
        Imagine every Save click is a postcard. Eidos writes the postcard in permanent ink before it
        leaves the house. If the mail truck crashes, the postcard is still on the table — with the
        same stamp number — so the post office knows it is one letter, not two.
      </StoryBox>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-eidos-text">The one option that matters</h2>
        <CodeBlock
          title="createOrder.ts"
          code={`import { action } from '@sweidos/eidos'
import type { ActionContext } from '@sweidos/eidos'

export const createOrder = action(
  async (payload, ctx: ActionContext) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': ctx.idempotencyKey, // ← same ticket on every retry
      },
      body: JSON.stringify(payload),
    })
    return res.json()
  },
  {
    reliability: 'neverLose', // ← keep the click
    name: 'createOrder',      // ← registration id after reload (not the ticket)
  },
)`}
        />
        <BulletList
          items={[
            'Set reliability to neverLose — persist to IndexedDB before / around the network call.',
            'Give every action a stable `name` so replay works after a full page reload.',
            'Forward `ctx.idempotencyKey` as `Idempotency-Key` (or in the body) so retries do not double-charge.',
            'Optional later: `priority`, `maxRetries`, `conflict`, optimistic callbacks.',
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-eidos-text">What you see in the UI</h2>
        <CodeBlock
          title="result shapes"
          code={`const result = await createOrder(payload)

// Online + success → your function's return value
// Offline / flaky → { queued: true, id, message, idempotencyKey }`}
        />
        <p className="text-sm text-eidos-text-dim">
          Show a calm “Saved — syncing when online” toast when{' '}
          <code className="font-mono text-eidos-blue">{`'queued' in result`}</code>. Do not pretend
          the server already confirmed the order.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-eidos-text">Your server’s one job</h2>
        <p className="text-sm leading-relaxed text-eidos-text-dim">
          Eidos delivers <strong className="font-medium text-eidos-text">at least once</strong>. A
          retry after a dropped response may hit your API twice. Deduplicate with the stable{' '}
          <code className="font-mono text-eidos-blue">idempotencyKey</code> from{' '}
          <code className="font-mono text-eidos-blue">ActionContext</code> (also on{' '}
          <code className="font-mono text-eidos-blue">QueuedResult</code> when offline).
        </p>
        <CodeBlock
          title="server sketch"
          code={`// Prefer a dedicated Idempotency-Key header, or accept it in the body.
// Store key → response. Same key = same business result.`}
        />
        <Link
          to="/docs/safety"
          className="inline-flex text-sm font-medium text-eidos-accent hover:text-green-400"
        >
          Full safety checklist →
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-eidos-text">Watch the queue live</h2>
        <p className="text-sm text-eidos-text-dim">
          Playground → Actions shows pending / failed items. Header → sim offline forces the pocket
          path without killing Wi‑Fi.
        </p>
        <Link
          to="/actions"
          className="inline-flex min-h-10 items-center rounded-md border border-eidos-border px-4 text-sm font-medium text-eidos-text-dim transition-colors hover:border-eidos-accent hover:text-eidos-text"
        >
          Open action queue
        </Link>
      </section>
    </div>
  );
}
