// Post-build step: copy the SW and root README into dist so both ship with the npm package.
//   SW:     cp node_modules/@adityaraj/eidos/dist/eidos-sw.js public/eidos-sw.js
//   README: viewed on npmjs.com
import { copyFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../../..');

function copy(src, dest, label) {
  if (!existsSync(src)) {
    console.error(`[eidos] not found: ${src}`);
    process.exit(1);
  }
  copyFileSync(src, dest);
  console.log(`[eidos] ${label} ✓`);
}

copy(
  resolve(root, 'apps/playground/public/eidos-sw.js'),
  resolve(__dirname, '../dist/eidos-sw.js'),
  'eidos-sw.js → dist/eidos-sw.js',
);

copy(
  resolve(root, 'README.md'),
  resolve(__dirname, '../README.md'),
  'README.md → packages/core/README.md',
);
