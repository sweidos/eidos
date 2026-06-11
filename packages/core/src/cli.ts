// ─────────────────────────────────────────────────────────────────────────────
// eidos CLI — `npx @sweidos/eidos generate-vapid-keys`
//
// Generates a VAPID keypair for Web Push and writes it to a local env file.
// Node-only, zero deps beyond node:* builtins.
// ─────────────────────────────────────────────────────────────────────────────
import { generateKeyPairSync } from 'node:crypto';
import { existsSync, readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';

const PUBLIC_KEY_NAME = 'EIDOS_VAPID_PUBLIC_KEY';
const PRIVATE_KEY_NAME = 'EIDOS_VAPID_PRIVATE_KEY';

function base64UrlFromBuffer(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBuffer(b64url: string): Buffer {
  const padding = '='.repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(b64, 'base64');
}

/** Pads a base64url-encoded big-endian integer to `length` bytes (leading zeros). */
function padTo(b64url: string, length: number): Buffer {
  const buf = base64UrlToBuffer(b64url);
  if (buf.length === length) return buf;
  const padded = Buffer.alloc(length);
  buf.copy(padded, length - buf.length);
  return padded;
}

function generateVapidKeys(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });

  const pubJwk = publicKey.export({ format: 'jwk' }) as { x: string; y: string };
  const privJwk = privateKey.export({ format: 'jwk' }) as { d: string };

  // VAPID public key = uncompressed EC point: 0x04 || X || Y (65 bytes)
  const x = padTo(pubJwk.x, 32);
  const y = padTo(pubJwk.y, 32);
  const point = Buffer.concat([Buffer.from([0x04]), x, y]);

  // VAPID private key = raw 32-byte scalar `d`
  const d = padTo(privJwk.d, 32);

  return {
    publicKey: base64UrlFromBuffer(point),
    privateKey: base64UrlFromBuffer(d),
  };
}

function detectEnvPrefix(cwd: string): string {
  if (existsSync(resolve(cwd, 'next.config.js')) || existsSync(resolve(cwd, 'next.config.ts')))
    return 'NEXT_PUBLIC_';
  if (existsSync(resolve(cwd, 'vite.config.ts')) || existsSync(resolve(cwd, 'vite.config.js')))
    return 'VITE_';
  if (existsSync(resolve(cwd, 'svelte.config.js'))) return 'PUBLIC_';
  if (existsSync(resolve(cwd, 'nuxt.config.ts')) || existsSync(resolve(cwd, 'nuxt.config.js')))
    return 'NUXT_PUBLIC_';
  return '';
}

function pickEnvFile(cwd: string): string {
  if (existsSync(resolve(cwd, '.env.local'))) return resolve(cwd, '.env.local');
  if (existsSync(resolve(cwd, '.env'))) return resolve(cwd, '.env');
  return resolve(cwd, '.env.local');
}

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${message} (type "yes" to continue): `);
  rl.close();
  return answer.trim().toLowerCase() === 'yes';
}

async function generateVapidKeysCommand(): Promise<void> {
  const cwd = process.cwd();
  const prefix = detectEnvPrefix(cwd);
  const publicKeyName = `${prefix}${PUBLIC_KEY_NAME}`;
  const force = process.argv.includes('--force');

  const envFile = pickEnvFile(cwd);
  const existing = existsSync(envFile) ? readFileSync(envFile, 'utf8') : '';
  const hasPublic = new RegExp(`^${publicKeyName}=`, 'm').test(existing);
  const hasPrivate = new RegExp(`^${PRIVATE_KEY_NAME}=`, 'm').test(existing);

  if (hasPublic && hasPrivate) {
    if (!force) {
      console.log(`VAPID keys already configured in ${envFile} — nothing to do.`);
      console.log('Pass --force to regenerate (this invalidates ALL existing push subscriptions).');
      return;
    }
    const ok = await confirm(
      `⚠ Regenerating VAPID keys will invalidate ALL existing push subscriptions in ${envFile}. Continue?`,
    );
    if (!ok) {
      console.log('Aborted.');
      return;
    }
  }

  const { publicKey, privateKey } = generateVapidKeys();
  const lines = [`${publicKeyName}=${publicKey}`, `${PRIVATE_KEY_NAME}=${privateKey}`];

  if (hasPublic && hasPrivate) {
    // Strip old entries, then append the fresh pair.
    const stripped = existing
      .split('\n')
      .filter(
        (line) => !line.startsWith(`${publicKeyName}=`) && !line.startsWith(`${PRIVATE_KEY_NAME}=`),
      )
      .join('\n');
    writeFileSync(envFile, `${stripped.replace(/\n+$/, '')}\n${lines.join('\n')}\n`);
  } else {
    const separator = existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';
    appendFileSync(envFile, `${separator}${lines.join('\n')}\n`);
  }

  console.log(`✓ VAPID keys written to ${envFile}`);
  console.log('');
  console.log(`  ${publicKeyName}=${publicKey}`);
  console.log(`  ${PRIVATE_KEY_NAME}=${privateKey}`);
  console.log('');
  console.log(`Give ${PRIVATE_KEY_NAME} and ${publicKeyName} to your backend.`);
  console.log(
    'Backend needs a VAPID-capable web-push library (any language) to send notifications ' +
      'using subscription objects received via onSubscribe.',
  );
}

const command = process.argv[2];

switch (command) {
  case 'generate-vapid-keys':
    await generateVapidKeysCommand();
    break;
  default:
    console.log('Usage: eidos generate-vapid-keys [--force]');
    process.exit(command ? 1 : 0);
}
