import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div id={id} className="scroll-mt-5">
      <p className="text-[10px] uppercase tracking-[0.24em] text-eidos-muted">{eyebrow}</p>
      <div className="mt-1 flex items-center gap-2">
        <a
          href={`#${id}`}
          aria-label={`Link to ${title} section`}
          className="text-eidos-border transition-colors hover:text-eidos-accent"
          tabIndex={-1}
        >
          #
        </a>
        <h1 className="text-base font-semibold text-eidos-text md:text-lg">{title}</h1>
      </div>
      {description && (
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-eidos-text-dim">{description}</p>
      )}
    </div>
  );
}

export function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded border border-eidos-border bg-eidos-elevated px-1.5 py-0.5 font-mono text-[11px] text-eidos-accent">
      {children}
    </code>
  );
}

// Splits on backtick spans and renders them as inline code.
function parseBullet(text: string): ReactNode {
  const parts = text.split(/`([^`]+)`/);
  if (parts.length === 1) return text;
  return (
    <>{parts.map((part, i) => (i % 2 === 1 ? <InlineCode key={i}>{part}</InlineCode> : part))}</>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm leading-relaxed text-eidos-text-dim">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-eidos-accent" />
          <span>{parseBullet(item)}</span>
        </li>
      ))}
    </ul>
  );
}

export function Collapse({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-eidos-border bg-eidos-surface">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-eidos-text transition-colors hover:bg-eidos-elevated cursor-pointer"
      >
        {open ? (
          <ChevronDown size={13} className="shrink-0 text-eidos-accent" />
        ) : (
          <ChevronRight size={13} className="shrink-0 text-eidos-muted" />
        )}
        {title}
      </button>
      {open && (
        <div className="border-t border-eidos-border bg-eidos-elevated/20 p-4">{children}</div>
      )}
    </div>
  );
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function OnThisPage({ items }: { items: string[] }) {
  return (
    <nav
      aria-label="On this page"
      className="sticky top-0 z-10 flex flex-wrap gap-2 rounded-xl border border-eidos-border bg-eidos-surface/90 p-3 text-xs backdrop-blur-sm"
    >
      <span className="shrink-0 text-2xs uppercase tracking-[0.24em] text-eidos-muted self-center">
        On this page
      </span>
      {items.map((item) => (
        <a
          key={item}
          href={`#${slugify(item)}`}
          className="rounded-full border border-eidos-border px-2.5 py-1 text-eidos-text-dim transition-colors hover:border-eidos-accent hover:text-eidos-text"
        >
          {item}
        </a>
      ))}
    </nav>
  );
}

export interface DocPage {
  slug: string;
  label: string;
  file: string;
}

export const DOC_PAGES: DocPage[] = [
  { slug: 'quickstart', label: 'Quick start', file: 'QuickStart.tsx' },
  { slug: 'api', label: 'API reference', file: 'ApiReference.tsx' },
  { slug: 'examples', label: 'Examples', file: 'Examples.tsx' },
  { slug: 'hooks', label: 'Hooks & stores', file: 'Hooks.tsx' },
  { slug: 'advanced', label: 'Advanced', file: 'Advanced.tsx' },
  { slug: 'references', label: 'Further reading', file: 'References.tsx' },
];

export const DOCS_GITHUB_BASE =
  'https://github.com/iamadi11/eidos/edit/main/apps/playground/src/pages/docs/';
