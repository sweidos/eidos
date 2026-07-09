// Writes src/version.ts from package.json's version. Kept separate from the
// post-build copy-sw.mjs (which needs dist/ to exist) so `changeset version`
// can sync the VERSION constant without a full build — the version test
// (src/__tests__/version.test.ts) then passes on the release PR.
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));
const versionTsPath = resolve(__dirname, '../src/version.ts');
writeFileSync(versionTsPath, `export const VERSION = '${pkg.version}';\n`);
console.log(`[eidos] version.ts → ${pkg.version} ✓`);
