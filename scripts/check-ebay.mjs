/**
 * eBay credential diagnostic.
 *
 * Answers one question: are these sandbox keys, production keys, or broken
 * keys? It does that by trying the SAME key pair against both of eBay's
 * token endpoints and comparing the answers, which is the only reliable
 * way to tell - a sandbox key used against production returns exactly the
 * same invalid_client as a genuinely broken key.
 *
 *   npm run check:ebay
 *
 * Credentials are read from the environment, then .env.local, then
 * .env.production.local (what `vercel env pull` writes).
 *
 * Nothing secret is ever printed. The secret is never shown in any form,
 * and the client ID is reduced to its length plus its environment marker,
 * so the whole output is safe to paste to someone else.
 */

import { readFileSync } from 'node:fs';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const AMBER = '\x1b[33m';
const GREY = '\x1b[90m';
const BOLD = '\x1b[1m';
const OFF = '\x1b[0m';

const ENDPOINTS = {
  production: 'https://api.ebay.com',
  sandbox: 'https://api.sandbox.ebay.com',
};

/** Minimal .env parser: enough for KEY=value, quotes optional. */
function loadEnvFile(path) {
  try {
    const out = {};
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!match) continue;
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      out[match[1]] = value;
    }
    return out;
  } catch {
    return {};
  }
}

const SOURCES = ['.env.local', '.env.production.local'];
const fileValues = {};
const usedFiles = [];
for (const path of SOURCES) {
  const values = loadEnvFile(path);
  if (Object.keys(values).length > 0) {
    usedFiles.push(path);
    Object.assign(fileValues, values);
  }
}

const read = (name) => process.env[name] ?? fileValues[name];
const rawId = read('EBAY_CLIENT_ID');
const rawSecret = read('EBAY_CLIENT_SECRET');

/** Length and environment marker only. Never the value itself. */
function describeId(value) {
  if (!value) return `${RED}missing${OFF}`;
  const trimmed = value.trim();
  if (!trimmed) return `${RED}whitespace only${OFF}`;
  const marker = /SBX/i.test(trimmed) ? 'contains "SBX"' : /PRD/i.test(trimmed) ? 'contains "PRD"' : 'no SBX/PRD marker';
  const dirty = value !== trimmed ? `, ${RED}SURROUNDING WHITESPACE${OFF}` : '';
  return `${GREEN}present${OFF}, ${trimmed.length} chars, ${marker}${dirty}`;
}

function describeSecret(value) {
  if (!value) return `${RED}missing${OFF}`;
  const trimmed = value.trim();
  if (!trimmed) return `${RED}whitespace only${OFF}`;
  const dirty = value !== trimmed ? `, ${RED}SURROUNDING WHITESPACE${OFF}` : '';
  return `${GREEN}present${OFF}, ${trimmed.length} chars${dirty} ${GREY}(value redacted)${OFF}`;
}

console.log(`\n${BOLD}eBay credential diagnostic${OFF}`);
console.log(`${GREY}${'─'.repeat(52)}${OFF}`);
console.log(`Source               ${usedFiles.length ? usedFiles.join(', ') : 'environment only'}`);
console.log(`EBAY_CLIENT_ID       ${describeId(rawId)}`);
console.log(`EBAY_CLIENT_SECRET   ${describeSecret(rawSecret)}`);
console.log(`EBAY_ENV             ${read('EBAY_ENV') ?? `${GREY}unset (app treats this as production)${OFF}`}`);

if (!rawId?.trim() || !rawSecret?.trim()) {
  console.log(`\n${RED}${BOLD}PROBLEM${OFF}  No usable credentials found.`);
  console.log('Pull them first:');
  console.log(`  ${BOLD}npx vercel link${OFF}`);
  console.log(`  ${BOLD}npx vercel env pull .env.production.local --environment=production${OFF}\n`);
  process.exit(1);
}

const clientId = rawId.trim();
const clientSecret = rawSecret.trim();
const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

/**
 * Tries one endpoint. Separates three outcomes that look alike from the
 * outside: accepted, refused by eBay, and never actually reached.
 */
async function tryEndpoint(name, host) {
  let response;
  try {
    response = await fetch(`${host}/identity/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'https://api.ebay.com/oauth/api_scope',
      }).toString(),
    });
  } catch (error) {
    return { name, host, outcome: 'unreachable', detail: error.message };
  }

  const text = await response.text();
  let body = {};
  try {
    body = JSON.parse(text);
  } catch {
    /* not JSON: recorded as an interception below */
  }

  if (response.ok && body.access_token) {
    return { name, host, outcome: 'accepted', status: response.status, expiresIn: body.expires_in };
  }

  // Only an OAuth error means eBay itself refused. A proxy or firewall
  // answering 403 with its own body must not be read as a bad key.
  const isOAuthRefusal = Boolean(body.error) || response.status === 400 || response.status === 401;
  if (!isOAuthRefusal) {
    return { name, host, outcome: 'intercepted', status: response.status, detail: text.slice(0, 300) };
  }

  return {
    name,
    host,
    outcome: 'refused',
    status: response.status,
    code: body.error ?? 'unknown',
    description: body.error_description ?? text.slice(0, 200),
  };
}

console.log(`\n${GREY}Testing the same key pair against both endpoints…${OFF}\n`);

const results = [];
for (const [name, host] of Object.entries(ENDPOINTS)) {
  const result = await tryEndpoint(name, host);
  results.push(result);

  const label = name.toUpperCase().padEnd(11);
  if (result.outcome === 'accepted') {
    console.log(`${label} ${GREEN}${BOLD}ACCEPTED${OFF}  token issued, valid ${result.expiresIn}s`);
  } else if (result.outcome === 'refused') {
    console.log(`${label} ${RED}REFUSED${OFF}   HTTP ${result.status}  ${result.code}`);
    console.log(`${' '.repeat(12)}${GREY}${result.description}${OFF}`);
  } else if (result.outcome === 'intercepted') {
    console.log(`${label} ${AMBER}NOT REACHED${OFF}  HTTP ${result.status}, no OAuth error in the reply`);
    console.log(`${' '.repeat(12)}${GREY}${result.detail}${OFF}`);
  } else {
    console.log(`${label} ${AMBER}UNREACHABLE${OFF}  ${GREY}${result.detail}${OFF}`);
  }
}

const production = results.find((r) => r.name === 'production');
const sandbox = results.find((r) => r.name === 'sandbox');
const blocked = results.filter((r) => r.outcome === 'intercepted' || r.outcome === 'unreachable');

console.log(`\n${BOLD}ANSWER${OFF}`);

if (blocked.length === results.length) {
  console.log(`${AMBER}Cannot tell.${OFF} Neither endpoint was actually reached, so nothing was`);
  console.log('tested. A VPN, proxy or firewall is intercepting HTTPS. Try another network.');
  process.exit(1);
} else if (production.outcome === 'accepted' && sandbox.outcome !== 'accepted') {
  console.log(`${GREEN}These are PRODUCTION keys and they work.${OFF}`);
  console.log('If the deployed app still fails, the keys are not reaching it: check they');
  console.log('are set for the Production environment in Vercel, and redeploy after saving.');
} else if (sandbox.outcome === 'accepted' && production.outcome !== 'accepted') {
  console.log(`${AMBER}These are SANDBOX keys.${OFF}`);
  console.log('They are valid, but only against the sandbox. That is why production returns');
  console.log('invalid_client. Either set EBAY_ENV=sandbox, or get your production keyset');
  console.log('from the eBay developer portal and use that instead.');
} else if (production.outcome === 'accepted' && sandbox.outcome === 'accepted') {
  console.log(`${GREEN}Both endpoints accepted them${OFF}, which is unusual. Production works, so use it.`);
} else {
  console.log(`${RED}These keys are BROKEN.${OFF} Neither endpoint accepted them.`);
  const codes = [production, sandbox].filter((r) => r.outcome === 'refused').map((r) => r.code);
  if (codes.includes('unauthorized_client')) {
    console.log('One returned unauthorized_client: the keyset exists but is not authorised.');
    console.log('That usually means production access was never fully released, which eBay');
    console.log('gates on the marketplace account deletion endpoint validating.');
  } else {
    console.log('Most likely the App ID and Cert ID are from different keysets, or the Cert ID');
    console.log('is wrong. eBay shows App ID, Dev ID and Cert ID: you need the App ID as');
    console.log('CLIENT_ID and the Cert ID as CLIENT_SECRET. Dev ID is not used here.');
  }
}

console.log(`\n${GREY}No credential or token appears above, so this output is safe to share.${OFF}\n`);
