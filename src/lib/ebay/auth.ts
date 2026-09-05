/**
 * eBay OAuth2 client credentials flow.
 *
 * The Browse API is an application level API: there is no user login, the
 * app authenticates as itself and gets an application token. Tokens last
 * two hours, so one is cached in module scope and reused across requests
 * for the life of the server instance. This file must never be imported
 * from a client component, the client secret would end up in the bundle.
 */

import 'server-only';

const EBAY_HOSTS = {
  production: 'https://api.ebay.com',
  sandbox: 'https://api.sandbox.ebay.com',
} as const;

/** The only scope the Browse API needs. */
const SCOPE = 'https://api.ebay.com/oauth/api_scope';

/** Refresh this far before the token actually expires. */
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

// Module scope, so it survives between requests on a warm server instance.
let cachedToken: CachedToken | null = null;
// Collapses concurrent misses into a single token request.
let inFlight: Promise<string> | null = null;

export function ebayApiBase(): string {
  return process.env.EBAY_ENV === 'sandbox' ? EBAY_HOSTS.sandbox : EBAY_HOSTS.production;
}

export function ebayMarketplaceId(): string {
  return process.env.EBAY_MARKETPLACE_ID || 'EBAY_GB';
}

export class EbayAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EbayAuthError';
  }
}

async function requestToken(): Promise<string> {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new EbayAuthError(
      'EBAY_CLIENT_ID and EBAY_CLIENT_SECRET must be set. Copy .env.example to .env.local and fill it in.',
    );
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${ebayApiBase()}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: SCOPE }).toString(),
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new EbayAuthError(
      `eBay token request failed with ${response.status}. ${detail.slice(0, 300)}`,
    );
  }

  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!payload.access_token) {
    throw new EbayAuthError('eBay token response did not contain an access_token.');
  }

  const lifetimeMs = (payload.expires_in ?? 7200) * 1000;
  cachedToken = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + lifetimeMs - EXPIRY_BUFFER_MS,
  };

  return cachedToken.accessToken;
}

/**
 * Returns a valid application access token, from cache where possible.
 */
export async function getApplicationToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.accessToken;
  }

  if (!inFlight) {
    inFlight = requestToken().finally(() => {
      inFlight = null;
    });
  }

  return inFlight;
}

/** Drops the cached token so the next call fetches a fresh one. */
export function invalidateToken(): void {
  cachedToken = null;
}
