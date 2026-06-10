import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

interface SearchEntry {
  label: string;
  description: string;
  path: string;
  keywords: string;
}

const INDEX: SearchEntry[] = [
  {
    label: 'Overview',
    description: 'Live demo + status panels',
    path: '/overview',
    keywords: 'home demo overview',
  },
  {
    label: 'Resources',
    description: 'Cached resources inspector',
    path: '/resources',
    keywords: 'cache resource resources',
  },
  {
    label: 'Actions',
    description: 'Offline action queue',
    path: '/actions',
    keywords: 'queue actions replay',
  },
  {
    label: 'Inspector',
    description: 'Service worker + cache inspector',
    path: '/inspector',
    keywords: 'sw cache inspector devtools',
  },
  {
    label: 'Quick start',
    description: 'Install, wrap, declare',
    path: '/docs#quick-start',
    keywords: 'install setup vite plugin getting started',
  },
  {
    label: 'resource(url, config)',
    description: 'Register a cacheable GET endpoint',
    path: '/docs#core',
    keywords: 'resource cache strategy maxAge offline',
  },
  {
    label: 'action(fn, config)',
    description: 'Queue offline-safe mutations',
    path: '/docs#core',
    keywords: 'action mutation reliability neverLose retries',
  },
  {
    label: 'EidosProvider',
    description: 'Register the SW + hydrate runtime',
    path: '/docs#core',
    keywords: 'provider swPath autoReplay',
  },
  {
    label: 'replayQueue()',
    description: 'Manually trigger queue replay',
    path: '/docs#core',
    keywords: 'replay queue retry',
  },
  {
    label: 'Examples',
    description: 'TanStack Query, TTLs, offline tests',
    path: '/docs#examples',
    keywords: 'examples tanstack query ttl test',
  },
  {
    label: 'React hooks',
    description: 'useEidosStatus, useEidosResource, useEidosQueueStats',
    path: '/docs#hooks',
    keywords:
      'hooks useEidosStatus useEidosResource useEidosQueueStats useEidosAction useEidosOnDrain',
  },
  {
    label: 'Framework-agnostic stores',
    description: 'eidosStatus, eidosQueue, eidosResource',
    path: '/docs#hooks',
    keywords: 'stores svelte vue vanilla subscribe',
  },
  {
    label: 'URL patterns',
    description: 'Wildcards, params, cross-origin',
    path: '/docs#advanced',
    keywords: 'url pattern wildcard cross-origin :param * **',
  },
  {
    label: 'Caching strategies',
    description: 'stale-while-revalidate, cache-first, network-first',
    path: '/docs#advanced',
    keywords: 'strategy cache-first network-first stale-while-revalidate',
  },
  {
    label: 'Testing utilities',
    description: 'mockOffline, drainQueue, resetEidos',
    path: '/docs#advanced',
    keywords: 'testing mockOffline mockOnline drainQueue resetEidos getCachedEntry',
  },
  {
    label: 'Types and limits',
    description: 'GET-only caching, module-scope actions, full reference',
    path: '/docs#advanced',
    keywords: 'limits types reference readme',
  },
  {
    label: 'Further reading',
    description: 'README, MDN service worker / cache / IndexedDB docs',
    path: '/docs#references',
    keywords: 'references readme mdn service worker cache indexeddb',
  },
];

function matches(entry: SearchEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    entry.label.toLowerCase().includes(q) ||
    entry.description.toLowerCase().includes(q) ||
    entry.keywords.toLowerCase().includes(q)
  );
}

export function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const results = INDEX.filter((entry) => matches(entry, query)).slice(0, 8);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setActiveIndex(0), [query]);

  function go(entry: SearchEntry) {
    const [path, hash] = entry.path.split('#');
    navigate(path);
    setOpen(false);
    if (hash) {
      let attempts = 0;
      const tryScroll = () => {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ block: 'start' });
        } else if (attempts++ < 20) {
          requestAnimationFrame(tryScroll);
        }
      };
      requestAnimationFrame(tryScroll);
    }
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault();
      go(results[activeIndex]);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search docs"
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-eidos-border px-3 text-2xs text-eidos-muted transition-colors hover:border-eidos-elevated hover:text-eidos-text-dim cursor-pointer"
      >
        <Search size={11} />
        <span className="hidden sm:inline">Search docs</span>
        <span className="hidden rounded border border-eidos-border px-1 text-[10px] sm:inline">
          ⌘K
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Search docs"
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh]"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl border border-eidos-border bg-eidos-surface shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-eidos-border px-4 py-3">
              <Search size={14} className="shrink-0 text-eidos-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Search APIs, hooks, sections..."
                className="w-full bg-transparent text-sm text-eidos-text outline-none placeholder:text-eidos-muted"
              />
              <kbd className="shrink-0 rounded border border-eidos-border px-1.5 py-0.5 text-[10px] text-eidos-muted">
                esc
              </kbd>
            </div>

            <ul className="max-h-80 overflow-y-auto p-2">
              {results.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-eidos-muted">
                  No matches for &ldquo;{query}&rdquo;. Try &ldquo;resource&rdquo;,
                  &ldquo;action&rdquo;, or &ldquo;hooks&rdquo;.
                </li>
              )}
              {results.map((entry, i) => (
                <li key={`${entry.label}-${entry.path}`}>
                  <button
                    type="button"
                    onClick={() => go(entry)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition-colors cursor-pointer ${
                      i === activeIndex
                        ? 'bg-eidos-accent-dim text-eidos-text'
                        : 'text-eidos-text-dim hover:bg-eidos-elevated'
                    }`}
                  >
                    <span className="text-sm font-medium">{entry.label}</span>
                    <span className="text-2xs text-eidos-muted">{entry.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
