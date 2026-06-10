#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { loadSpec } from './parse';
import { generate } from './generate';

// ── Arg parsing ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function flag(name: string): boolean {
  return args.includes(`--${name}`) || args.includes(`-${name[0]}`);
}

function opt(name: string, fallback: string): string {
  const idx = args.findIndex((a) => a === `--${name}` || a === `-${name[0]}`);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  return fallback;
}

function positionals(): string[] {
  return args.filter((a) => !a.startsWith('-'));
}

if (flag('help') || flag('h') || args.length === 0) {
  console.log(
    `
eidos-gen — Generate typed Eidos resource() and action() declarations from OpenAPI 3.x

Usage:
  eidos-gen <spec>                 Read spec (JSON or YAML), write to eidos.generated.ts
  eidos-gen <spec> --out <file>    Write to <file>
  eidos-gen <spec> --no-offline    Don't set offline:true on resources
  eidos-gen <spec> --eidos <pkg>   Import from <pkg> instead of '@sweidos/eidos'

Examples:
  npx eidos-gen openapi.json
  npx eidos-gen openapi.yaml --out src/lib/eidos.ts
  npx eidos-gen https://... (URL not supported — save the spec file locally first)

Options:
  --out, -o       Output file path (default: eidos.generated.ts)
  --no-offline    Set offline:false on all resource() declarations
  --eidos         Import path for @sweidos/eidos (default: @sweidos/eidos)
  --help, -h      Show this help
`.trim(),
  );
  process.exit(0);
}

// ── Main ──────────────────────────────────────────────────────────────────────

const [specPath] = positionals();
if (!specPath) {
  console.error('error: no spec file provided. Run eidos-gen --help for usage.');
  process.exit(1);
}

const outPath = path.resolve(opt('out', 'eidos.generated.ts'));
const offline = !flag('no-offline');
const eidosPkg = opt('eidos', '@sweidos/eidos');

try {
  console.log(`eidos-gen: reading ${specPath}`);
  const spec = loadSpec(specPath);

  if (!spec.paths || Object.keys(spec.paths).length === 0) {
    console.warn('warning: no paths found in spec. Output will be empty.');
  }

  const output = generate(spec, { offline, eidos: eidosPkg });
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, output, 'utf-8');

  const resources = Object.values(spec.paths ?? {}).filter((p) => p.get).length;
  const actions = Object.values(spec.paths ?? {}).flatMap((p) =>
    ['post', 'put', 'patch', 'delete'].filter((m) => (p as Record<string, unknown>)[m]),
  ).length;

  console.log(`eidos-gen: wrote ${outPath}`);
  console.log(`           ${resources} resource(s), ${actions} action(s)`);
  if (spec.components?.schemas) {
    console.log(`           ${Object.keys(spec.components.schemas).length} type(s)`);
  }
} catch (err) {
  console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
