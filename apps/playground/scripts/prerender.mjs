// Prerenders the "/" landing route to static markup and inlines it into
// dist/index.html so crawlers (and first paint) get real content without
// running JS. React hydrates over it on load.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { Landing } from '../src/pages/Landing.tsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '../dist');
const indexPath = resolve(distDir, 'index.html');

const markup = renderToStaticMarkup(
  React.createElement(MemoryRouter, { initialEntries: ['/'] }, React.createElement(Landing)),
);

let html = await readFile(indexPath, 'utf-8');
html = html.replace('<div id="root"></div>', `<div id="root">${markup}</div>`);

await writeFile(indexPath, html);
console.log('Prerendered "/" into dist/index.html');
