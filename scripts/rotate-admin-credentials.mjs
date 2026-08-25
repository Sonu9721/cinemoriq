import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { resolve } from 'node:path';

const DEFAULT_EMAIL = 'digitalsonu17@gmail.com';
// Cloudflare Workers caps Web Crypto PBKDF2 at 100,000 iterations.
// Cinemoriq compensates with a generated 192-bit password and strict rate limits.
const ITERATIONS = 100_000;

function base64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function readEmailArgument() {
  const argument = process.argv.slice(2).find((value) => value.startsWith('--email='));
  const email = (argument?.slice('--email='.length) || DEFAULT_EMAIL)
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Use a valid administrator email with --email=you@example.com.');
  }
  return email;
}

function upsertEnv(content, updates) {
  const keys = new Set(Object.keys(updates));
  const retained = content
    .split(/\r?\n/)
    .filter((line) => !keys.has(line.split('=', 1)[0]));
  const prefix = retained.filter(Boolean).join('\n');
  const values = Object.entries(updates)
    .map(([key, value]) =>
      key === 'CINEMORIQ_ADMIN_PASSWORD_HASH'
        ? `${key}=${value.replaceAll('$', '\\$')}`
        : `${key}=${value}`,
    )
    .join('\n');
  return `${prefix}${prefix ? '\n' : ''}${values}\n`;
}

const email = readEmailArgument();
const password = base64Url(randomBytes(24));
const salt = randomBytes(20);
const digest = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
const passwordHash = [
  'pbkdf2-sha256',
  ITERATIONS,
  base64Url(salt),
  base64Url(digest),
].join('$');
const sessionSecret = base64Url(randomBytes(48));
const envPath = resolve('.env.local');
const credentialPath = resolve('.env.admin-credentials');
const hostingValuesPath = resolve('.env.admin-hosting-values');
const currentEnv = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';

writeFileSync(
  envPath,
  upsertEnv(currentEnv, {
    CINEMORIQ_ADMIN_EMAIL: email,
    CINEMORIQ_ADMIN_PASSWORD_HASH: passwordHash,
    CINEMORIQ_SESSION_SECRET: sessionSecret,
  }),
  { encoding: 'utf8', mode: 0o600 },
);

writeFileSync(
  credentialPath,
  [
    '# Cinemoriq administrator credential',
    '# Private local recovery record. Never commit or share this file.',
    `CINEMORIQ_ADMIN_EMAIL=${email}`,
    `CINEMORIQ_ADMIN_INITIAL_PASSWORD=${password}`,
    '',
  ].join('\n'),
  { encoding: 'utf8', mode: 0o600 },
);

writeFileSync(
  hostingValuesPath,
  [
    '# Cinemoriq Sites environment values',
    '# Private deployment record. Never commit or share this file.',
    `CINEMORIQ_ADMIN_EMAIL=${email}`,
    `CINEMORIQ_ADMIN_PASSWORD_HASH=${passwordHash}`,
    `CINEMORIQ_SESSION_SECRET=${sessionSecret}`,
    '',
  ].join('\n'),
  { encoding: 'utf8', mode: 0o600 },
);

console.log('Cinemoriq admin credential rotated.');
console.log('Open .env.admin-credentials locally to retrieve the new password.');
console.log('Use .env.admin-hosting-values to update the three hosted CINEMORIQ_* variables before redeploying.');
