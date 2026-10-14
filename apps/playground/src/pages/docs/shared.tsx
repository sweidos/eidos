import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';

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
        <h2 className="text-lg font-semibold text-eidos-text md:text-xl">{title}</h2>
      </div>
      {description && (
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-eidos-text-dim">{description}</p>
      )}
    </div>
  );
}

export function PageIntro({
  title,
  lead,
  next,
}: {
  title: string;
  lead: string;
  next?: { to: string; label: string };
}) {
  return (
    <header className="doc-intro space-y-3 border-b border-eidos-border/80 pb-6">
      <p className="text-[10px] uppercase tracking-[0.28em] text-eidos-accent">Docs</p>
      <h1 className="text-2xl font-semibold tracking-tight text-eidos-text text-balance md:text-3xl">
        {title}
      </h1>
      <p className="max-w-2xl text-[15px] leading-relaxed text-eidos-text-dim">{lead}</p>
      {next && (
        <Link
          to={next.to}
          className="inline-flex text-sm font-medium text-eidos-accent transition-colors hover:text-green-400"
        >
          Next: {next.label} →
        </Link>
      )}
    </header>
  );
}

export function StoryBox({ children }: { children: ReactNode }) {
  return (
    <aside className="rounded-lg border border-eidos-accent/25 bg-eidos-accent-dim px-4 py-3 text-sm leading-relaxed text-eidos-text-dim">
      {children}
    </aside>
  );
}

export function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded border border-eidos-border bg-eidos-elevated px-1.5 py-0.5 font-mono text-[11px] text-eidos-accent">
      {children}
    </code>
  );
}

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

export function Steps({ items }: { items: { title: string; body: ReactNode }[] }) {
  return (
    <ol className="space-y-4">
      {items.map((item, i) => (
        <li key={item.title} className="flex gap-4">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-eidos-accent/40 bg-eidos-accent-dim font-mono text-sm font-semibold text-eidos-accent"
            aria-hidden
          >
            {i + 1}
          </span>
          <div className="min-w-0 space-y-1.5 pt-0.5">
            <h3 className="text-sm font-semibold text-eidos-text">{item.title}</h3>
            <div className="text-sm leading-relaxed text-eidos-text-dim">{item.body}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Collapse({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-eidos-border bg-eidos-surface/60">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-eidos-text transition-colors hover:bg-eidos-elevated/40 cursor-pointer"
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
      className="sticky top-0 z-10 flex flex-wrap gap-2 rounded-lg border border-eidos-border bg-eidos-surface/90 p-3 text-xs backdrop-blur-sm"
    >
      <span className="shrink-0 self-center text-2xs uppercase tracking-[0.24em] text-eidos-muted">
        On this page
      </span>
      {items.map((item) => (
        <a
          key={item}
          href={`#${slugify(item)}`}
          className="rounded-md border border-eidos-border px-2.5 py-1 text-eidos-text-dim transition-colors hover:border-eidos-accent hover:text-eidos-text"
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
  { slug: 'start', label: 'Start here', file: 'Start.tsx' },
  { slug: 'save', label: 'Never lose a save', file: 'Save.tsx' },
  { slug: 'read', label: 'Read offline', file: 'Read.tsx' },
  { slug: 'safety', label: 'When things break', file: 'Safety.tsx' },
  { slug: 'recipes', label: 'Recipes', file: 'Recipes.tsx' },
  { slug: 'api', label: 'API cheat sheet', file: 'ApiReference.tsx' },
  { slug: 'advanced', label: 'Advanced', file: 'Advanced.tsx' },
];

export const DOCS_GITHUB_BASE =
  'https://github.com/sweidos/eidos/edit/main/apps/playground/src/pages/docs/';
