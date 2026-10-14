import { Link } from 'react-router';
import { PageIntro, StoryBox, BulletList } from './shared';

export function Safety() {
  return (
    <div className="space-y-8 animate-fade-in">
      <PageIntro
        title="When things break"
        lead="Honest answers — what Eidos promises, and what it does not."
        next={{ to: '/docs/recipes', label: 'Recipes' }}
      />

      <StoryBox>
        We keep your postcard. We do not promise the post office only ever opens it once. That is
        why the stamp number (idempotency key) matters on the server.
      </StoryBox>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-eidos-text">Offline</h2>
        <BulletList
          items={[
            'neverLose actions land in IndexedDB and wait.',
            'Offline reads come from the Service Worker cache when you registered `resource(..., { offline: true })`.',
            'Use header **sim offline** in this playground to practice without killing Wi‑Fi.',
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-eidos-text">Reload / crash mid-flight</h2>
        <BulletList
          items={[
            'Queued work survives reload because it lives in IndexedDB, not React state.',
            'Actions need a stable `name` so replay can find the function after boot.',
            'Multi-tab: Web Locks coordinate who replays — tabs do not steal each other’s live work.',
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-eidos-text">Uncertain response</h2>
        <BulletList
          items={[
            'Network died after the server may have succeeded → Eidos may retry.',
            'Same `idempotencyKey` is reused so your API can return the original result.',
            'This is **at-least-once delivery**, not magical exactly-once business logic.',
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-eidos-text">Server duties checklist</h2>
        <BulletList
          items={[
            'Accept and store idempotency keys for neverLose endpoints.',
            'Treat duplicate keys as the same business operation.',
            'Return clear 4xx when the client should stop retrying (conflict strategies can help).',
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-eidos-text">When not to use Eidos</h2>
        <BulletList
          items={[
            'You only need online cache + retry UI → TanStack Query is enough.',
            'You only need SW asset caching → Workbox may be enough.',
            'You need multiplayer CRDT sync as the core product → look at dedicated CRDT tools (Eidos has optional packages; they are not the main pitch).',
          ]}
        />
      </section>

      <p className="text-sm text-eidos-text-dim">
        Deeper guides in the repo:{' '}
        <a
          className="text-eidos-accent hover:text-green-400"
          href="https://github.com/sweidos/eidos/blob/main/docs/guides/guarantees.md"
          target="_blank"
          rel="noopener noreferrer"
        >
          guarantees.md
        </a>
        {' · '}
        <a
          className="text-eidos-accent hover:text-green-400"
          href="https://github.com/sweidos/eidos/blob/main/docs/guides/troubleshooting.md"
          target="_blank"
          rel="noopener noreferrer"
        >
          troubleshooting.md
        </a>
        {' · '}
        <Link to="/docs/advanced" className="text-eidos-accent hover:text-green-400">
          Advanced docs
        </Link>
      </p>
    </div>
  );
}
