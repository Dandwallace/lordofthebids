/**
 * eBay connection diagnostic.
 *
 * Runs the exact token request the app makes and explains what came back.
 * Use it when a scan fails: it isolates whether the problem is your
 * credentials, the environment they belong to, or something else.
 *
 *   node scripts/check-ebay.mjs
 *
 * Reads EBAY_CLIENT_ID, EBAY_CLIENT_SECRET and EBAY_ENV from the
 * environment, falling back to .env.local.
 *
 * It never prints a credential or a token. Lengths and whitespace flags
 * only, so the output is safe to paste to someone else.
 */

import { readFileSync } from 'node:fs';

const GREY = '\x1b[90m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const AMBER = '\x1b[33m';
const BOLD = '\x1b[1m';
const OFF = '\x1b[0m';

/** Minimal .env parser: enough for KEY=value, quotes optional. */
function loadEnvFile(path) {
  try {
    const out = {};
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!match) continue;
      let value = match[2];
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

const fromFile = loadEnvFile('.env.local');
const env = (name) => process.env[name] ?? fromFile[name];

const clientId = env('EBAY_CLIENT_ID');
const clientSecret = env('EBAY_CLIENT_SECRET');
const ebayEnv = env('EBAY_ENV') === 'sandbox' ? 'sandbox' : 'production';
const host = ebayEnv === 'sandbox' ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';

function describe(name, value) {
  if (!value) return `${RED}missing${OFF}`;
  const trimmed = value.trim();
  if (!trimmed) return `${RED}whitespace only${OFF}`;
  const notes = [`${trimmed.length} chars`];
  if (value !== trimmed) notes.push(`${RED}SURROUNDING WHITESPACE${OFF}`);
  if (/\s/.test(trimmed)) notes.push(`${RED}WHITESPACE INSIDE${OFF}`);
  return `${GREEN}present${OFF}, ${notes.join(', ')}`;
}

console.log(`\n${BOLD}eBay connection diagnostic${OFF}`);
console.log(`${GREY}${'─'.repeat(46)}${OFF}`);
console.log(`Environment          ${ebayEnv}  ${GREY}(${host})${OFF}`);
console.log(`EBAY_CLIENT_ID       ${describe('EBAY_CLIENT_ID', clientId)}`);
console.log(`EBAY_CLIENT_SECRET   ${describe('EBAY_CLIENT_SECRET', clientSecret)}`);

if (!clientId?.trim() || !clientSecret?.trim()) {
  console.log(`\n${RED}${BOLD}PROBLEM${OFF}  No usable credentials.`);
  console.log('Set EBAY_CLIENT_ID (your App ID) and EBAY_CLIENT_SECRET (your Cert ID)');
  console.log('in .env.local, or export them before running this.\n');
  process.exit(1);
}

// The keyset and the environment have to agree. Production App IDs
// conventionally carry "PRD"; sandbox ones carry "SBX".
const looksSandbox = /SBX/i.test(clientId);
const looksProduction = /PRD/i.test(clientId);
if (looksSandbox && ebayEnv === 'production') {
  console.log(`\n${AMBER}${BOLD}LIKELY PROBLEM${OFF}  That App ID looks like a SANDBOX key, but EBAY_ENV is production.`);
  console.log('Either set EBAY_ENV=sandbox, or use your production keyset.');
} else if (looksProduction && ebayEnv === 'sandbox') {
  console.log(`\n${AMBER}${BOLD}LIKELY PROBLEM${OFF}  That App ID looks like a PRODUCTION key, but EBAY_ENV is sandbox.`);
}

console.log(`\n${GREY}Requesting an application token…${OFF}`);

const basic = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString('base64');

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
  console.log(`\n${RED}${BOLD}PROBLEM${OFF}  Could not reach ${host}`);
  console.log(`${GREY}${error.message}${OFF}`);
  console.log('\nThis is a network problem, not a credentials problem. Check your');
  console.log('connection, a VPN, or a proxy blocking outbound HTTPS.\n');
  process.exit(1);
}

const bodyText = await response.text();
let body = {};
try {
  body = JSON.parse(bodyText);
} catch {
  /* eBay returned something that is not JSON; bodyText is shown below. */
}

console.log(`HTTP ${response.status} ${response.statusText}`);

if (response.ok && body.access_token) {
  console.log(`\n${GREEN}${BOLD}TOKEN OK${OFF}  Credentials accepted, valid for ${body.expires_in}s.`);
  console.log(`${GREY}Token not printed.${OFF}`);

  console.log(`\n${GREY}Testing a Browse search (costs 1 API call)…${OFF}`);
  const url = new URL(`${host}/buy/browse/v1/item_summary/search`);
  url.searchParams.set('q', 'nintendo switch');
  url.searchParams.set('limit', '1');

  const search = await fetch(url, {
    headers: {
      Authorization: `Bearer ${body.access_token}`,
      'X-EBAY-C-MARKETPLACE-ID': env('EBAY_MARKETPLACE_ID') || 'EBAY_GB',
      'X-EBAY-C-ENDUSERCTX': 'contextualLocation=country%3DGB',
      Accept: 'application/json',
    },
  });

  const searchBody = await search.text();
  console.log(`HTTP ${search.status} ${search.statusText}`);

  if (search.ok) {
    const parsed = JSON.parse(searchBody);
    console.log(`\n${GREEN}${BOLD}ALL GOOD${OFF}  Browse returned ${parsed.total ?? 0} matching listings.`);
    console.log('The app should work. If it still fails, the problem is in the');
    console.log('deployment rather than the credentials: check the variables are');
    console.log('set for Production in Vercel and that you redeployed after saving.\n');
  } else {
    console.log(`\n${RED}${BOLD}PROBLEM${OFF}  The token works but the Browse API refused the call.`);
    console.log(`${GREY}${searchBody.slice(0, 600)}${OFF}`);
    console.log('\nPaste the block above and I can fix the request.\n');
  }
  process.exit(search.ok ? 0 : 1);
}

// --- Failure ---------------------------------------------------------------
//
// Distinguish a genuine credential refusal from something else answering
// on eBay's behalf. A proxy, VPN or corporate firewall will happily return
// 403 with its own body, and calling that "bad credentials" would send you
// off fixing keys that were never the problem.

const code = body.error ?? '';
const isOAuthRefusal = Boolean(code) || response.status === 400 || response.status === 401;

if (!isOAuthRefusal) {
  console.log(`\n${RED}${BOLD}PROBLEM${OFF}  ${host} answered, but not like eBay's OAuth service.`);
  console.log(`${GREY}${bodyText.slice(0, 600)}${OFF}`);
  console.log(`\n${BOLD}WHAT THIS MEANS${OFF}`);
  console.log('This is almost certainly NOT a credentials problem. The response did');
  console.log('not carry an OAuth error, which is what eBay returns when it rejects a');
  console.log('key. Something between you and eBay most likely answered instead.');
  console.log('');
  console.log('  - A VPN, corporate proxy or firewall intercepting HTTPS');
  console.log('  - A network that allowlists hosts (the body above usually says so)');
  console.log(`  - Less often: eBay blocking the source IP, or an outage (HTTP ${response.status})`);
  console.log('');
  console.log('Try again from a different network before touching your keys.');
  console.log(`\n${GREY}Nothing above contains your credentials, so it is safe to share.${OFF}\n`);
  process.exit(1);
}

console.log(`\n${RED}${BOLD}PROBLEM${OFF}  eBay refused the credentials.`);
console.log(`${GREY}${bodyText.slice(0, 600)}${OFF}`);
const EXPLANATIONS = {
  invalid_client: [
    'The App ID and Cert ID were not accepted together.',
    '',
    'In order of likelihood:',
    '  1. They are from different keysets, or from the sandbox keyset while',
    `     EBAY_ENV is "${ebayEnv}". Sandbox and production credentials are separate.`,
    '  2. The Cert ID is wrong. eBay shows App ID, Dev ID and Cert ID:',
    '     CLIENT_ID is the App ID, CLIENT_SECRET is the Cert ID. Dev ID is not used.',
    '  3. A character was lost or added when copying.',
  ],
  unauthorized_client: [
    'The credentials are real, but this application is not authorised to',
    'request an application token.',
    '',
    'This usually means production access has not been fully released. eBay',
    'gates it on the marketplace account deletion endpoint validating, so if',
    'that step was never completed, or was completed against a URL that no',
    'longer responds, the keyset exists but the API refuses it.',
    '',
    'Fix: set EBAY_VERIFICATION_TOKEN and EBAY_NOTIFICATION_ENDPOINT, redeploy,',
    'then re-validate the endpoint in the eBay developer portal.',
  ],
  invalid_scope: [
    'The requested scope was refused. The keyset may not have the Browse API',
    'enabled for this environment.',
  ],
  invalid_grant: [
    'The grant was refused. For client credentials this normally points back',
    'to the keyset rather than the request.',
  ],
};

const explanation = EXPLANATIONS[code];
console.log(`\n${BOLD}WHAT THIS MEANS${OFF}`);
if (explanation) {
  for (const line of explanation) console.log(line);
} else {
  console.log(`eBay returned "${code || 'an unrecognised error'}".`);
  console.log('Paste the response above and I can work out what it wants.');
}

console.log(`\n${GREY}Nothing above contains your credentials, so it is safe to share.${OFF}\n`);
process.exit(1);
