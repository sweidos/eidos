import { ExternalLink } from 'lucide-react';
import { SectionHeading } from './shared';

const LINKS = [
  {
    label: 'Project README',
    href: 'https://github.com/iamadi11/eidos/blob/main/README.md',
  },
  {
    label: 'MDN - Service Worker API',
    href: 'https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API',
  },
  {
    label: 'MDN - Cache API',
    href: 'https://developer.mozilla.org/en-US/docs/Web/API/Cache',
  },
  {
    label: 'MDN - IndexedDB API',
    href: 'https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API',
  },
];

export function References() {
  return (
    <section id="references" className="space-y-3">
      <SectionHeading
        id="references"
        eyebrow="further reading"
        title="Primary references"
        description="Open these when you want the underlying platform docs or the project README."
      />

      <div className="grid gap-3 md:grid-cols-2">
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl border border-eidos-border bg-eidos-surface px-4 py-3 text-sm text-eidos-text-dim transition-colors hover:border-eidos-accent hover:bg-eidos-accent-dim hover:text-eidos-text"
          >
            <span>{link.label}</span>
            <ExternalLink size={11} className="shrink-0 text-eidos-muted" />
          </a>
        ))}
      </div>
    </section>
  );
}
