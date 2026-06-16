// Prerenders key routes to static markup so crawlers get real content without
// executing JS. React hydrates over it on load.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { Landing } from '../src/pages/Landing.tsx';
import { QuickStart } from '../src/pages/docs/QuickStart.tsx';
import { ApiReference } from '../src/pages/docs/ApiReference.tsx';
import { Hooks } from '../src/pages/docs/Hooks.tsx';
import { Advanced } from '../src/pages/docs/Advanced.tsx';
import { References } from '../src/pages/docs/References.tsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '../dist');
const BASE_URL = 'https://sweidos.vercel.app';

const baseHtml = await readFile(resolve(distDir, 'index.html'), 'utf-8');

async function prerender({ path, component, title }) {
  let markup;
  try {
    markup = renderToStaticMarkup(
      createElement(MemoryRouter, { initialEntries: [path] }, createElement(component)),
    );
  } catch (e) {
    console.warn(`Skipped ${path}: ${e.message}`);
    return;
  }

  const canonicalUrl = `${BASE_URL}${path}`;
  let html = baseHtml
    .replace('<div id="root"></div>', `<div id="root">${markup}</div>`)
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(
      /<link rel="canonical" href="[^"]*" \/>/,
      `<link rel="canonical" href="${canonicalUrl}" />`,
    )
    .replace(
      /<meta property="og:url" content="[^"]*" \/>/,
      `<meta property="og:url" content="${canonicalUrl}" />`,
    )
    .replace(
      /<meta property="og:title" content="[^"]*" \/>/,
      `<meta property="og:title" content="${title}" />`,
    );

  const segments = path.replace(/^\//, '').split('/').filter(Boolean);
  const outDir = segments.length ? resolve(distDir, ...segments) : distDir;
  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, 'index.html'), html);
  console.log(`Prerendered ${path}`);
}

const routes = [
  { path: '/', component: Landing, title: 'Eidos — Never lose a write' },
  {
    path: '/docs/quickstart',
    component: QuickStart,
    title: 'Quick Start — Eidos (@sweidos/eidos)',
  },
  {
    path: '/docs/api',
    component: ApiReference,
    title: 'API Reference — Eidos (@sweidos/eidos)',
  },
  {
    path: '/docs/hooks',
    component: Hooks,
    title: 'React Hooks — Eidos (@sweidos/eidos)',
  },
  { path: '/docs/advanced', component: Advanced, title: 'Advanced — Eidos (@sweidos/eidos)' },
  {
    path: '/docs/references',
    component: References,
    title: 'References — Eidos (@sweidos/eidos)',
  },
];

for (const route of routes) {
  await prerender(route);
}
