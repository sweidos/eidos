import { ExternalLink } from 'lucide-react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { DOC_PAGES, DOCS_GITHUB_BASE } from './shared';

export function DocsLayout() {
  const { pathname } = useLocation();
  const slug = pathname.replace(/^\/docs\/?/, '');
  const index = DOC_PAGES.findIndex((p) => p.slug === slug);
  const current = DOC_PAGES[index];
  const prev = index > 0 ? DOC_PAGES[index - 1] : undefined;
  const next = index >= 0 && index < DOC_PAGES.length - 1 ? DOC_PAGES[index + 1] : undefined;

  return (
    <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:px-6 animate-fade-in">
      <nav
        aria-label="Docs sections"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:sticky lg:top-4 lg:mx-0 lg:h-fit lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
      >
        <div className="hidden text-2xs uppercase tracking-[0.24em] text-eidos-muted lg:block lg:px-3 lg:pb-1">
          Docs
        </div>
        {DOC_PAGES.map((page) => (
          <NavLink
            key={page.slug}
            to={`/docs/${page.slug}`}
            className={({ isActive }) =>
              `shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition-colors lg:rounded-lg lg:border-transparent lg:px-3 lg:py-2 ${
                isActive
                  ? 'border-eidos-accent bg-eidos-accent-dim text-eidos-text'
                  : 'border-eidos-border text-eidos-text-dim hover:border-eidos-accent hover:bg-eidos-elevated/40 hover:text-eidos-text lg:border-transparent'
              }`
            }
          >
            {page.label}
          </NavLink>
        ))}
      </nav>

      <div className="min-w-0 space-y-5">
        <Outlet />

        <div className="flex flex-col gap-2 border-t border-eidos-border pt-4 sm:flex-row sm:items-center sm:justify-between sm:flex-wrap">
          {current && (
            <a
              href={`${DOCS_GITHUB_BASE}${current.file}`}
              target="_blank"
              rel="noopener noreferrer"
              className="order-first inline-flex items-center gap-1.5 text-xs text-eidos-muted transition-colors hover:text-eidos-text sm:order-none sm:basis-full"
            >
              <ExternalLink size={11} />
              Edit this page on GitHub
            </a>
          )}
          {prev ? (
            <Link
              to={`/docs/${prev.slug}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-eidos-border px-3 py-2 text-xs text-eidos-text-dim transition-colors hover:border-eidos-accent hover:text-eidos-text"
            >
              ← {prev.label}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              to={`/docs/${next.slug}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-eidos-border px-3 py-2 text-xs text-eidos-text-dim transition-colors hover:border-eidos-accent hover:text-eidos-text"
            >
              {next.label} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
