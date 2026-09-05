/**
 * eBay OAuth2 client credentials flow.
 *
 * The Browse API authenticates the application, not a user. Tokens last
 * two hours, so one is cached in module scope and reused for the life of
 * the server instance. This module must never be imported by a client
 * component: the secret would end up in the browser bundle.
 */

import 'server-only';
import { ebayApiBase, readCredentials } from './config';
import { authFailed, notConfigured, upstreamUnavailable } from './errors';

const SCOPE = 'https://api.ebay.com/oauth/api_scope';

/** Refresh this far ahead of real expiry. */
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;
/** Collapses concurrent misses into one token request. */
let inFlight: Promise<string> | null = null;

async function requestToken(): Promise<string> {
  const credentials = readCredentials();
  if (!credentials) throw notConfigured();

  const basic = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');

  let response: Response;
  try {
    response = await fetch(`${ebayApiBase()}/identity/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({ grant_type: 'client_credentials', scope: SCOPE }).toString(),
      cache: 'no-store',
    });
  } catch (error) {
    console.error('[ebay/auth] token request could not be sent:', error);
    throw upstreamUnavailable();
  }

  if (!response.ok) {
    // Logged server side only: the body can echo back client identifiers.
    const detail = await response.text().catch(() => '');
    console.error(`[ebay/auth] token request failed with ${response.status}: ${detail.slice(0, 300)}`);
    throw response.status === 400 || response.status === 401 ? authFailed() : upstreamUnavailable();
  }

  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!payload.access_token) {
    console.error('[ebay/auth] token response contained no access_token');
    throw authFailed();
  }

  cachedToken = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? 7200) * 1000 - EXPIRY_BUFFER_MS,
  };
  return cachedToken.accessToken;
}

export async function getApplicationToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.accessToken;

  if (!inFlight) {
    inFlight = requestToken().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

export function invalidateToken(): void {
  cachedToken = null;
}
