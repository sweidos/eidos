// Fails if the brotli size-limit measurement for the core bundle drifts too
// far from the "Bundle size (core)" figure documented in the root README's
// comparison table, so README claims don't silently go stale as the bundle
// grows. Run after `pnpm build:core` (size-limit needs `dist/`).
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../../..');
const readmePath = resolve(root, 'README.md');
const TOLERANCE_KB = 0.5;

const results = JSON.parse(
  execFileSync('npx', ['size-limit', '--json'], {
    cwd: resolve(__dirname, '..'),
    encoding: 'utf-8',
  }),
);

const core = results.find((r) => r.name.startsWith('core ('));
if (!core) {
  console.error('[eidos] could not find "core (...)" entry in size-limit output');
  process.exit(1);
}
const actualKb = core.size / 1024;

const readme = readFileSync(readmePath, 'utf-8');
const match = readme.match(/Bundle size \(core\)\s*\|\s*~?([\d.]+)\s*kB/);
if (!match) {
  console.error('[eidos] could not find "Bundle size (core)" row in README.md');
  process.exit(1);
}
const documentedKb = parseFloat(match[1]);
const drift = Math.abs(actualKb - documentedKb);

console.log(
  `[eidos] core bundle: ${actualKb.toFixed(2)} kB actual vs ${documentedKb.toFixed(2)} kB documented (drift ${drift.toFixed(2)} kB)`,
);

if (drift > TOLERANCE_KB) {
  console.error(
    `[eidos] README.md "Bundle size (core)" (~${documentedKb} kB) is more than ${TOLERANCE_KB} kB ` +
      `off from the measured size (${actualKb.toFixed(2)} kB). Update the comparison table in README.md.`,
  );
  process.exit(1);
}
