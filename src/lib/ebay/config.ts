/**
 * eBay configuration and connection state.
 *
 * Credentials are read here and nowhere else. Nothing in this file, and
 * nothing that reads from it, may return a secret value to the client:
 * the only thing exposed is whether configuration is present.
 */

import 'server-only';
import { toMarketplaceId, type MarketplaceId } from './marketplaces';

export type EbayEnvironment = 'production' | 'sandbox';

export interface EbayConfigStatus {
  configured: boolean;
  environment: EbayEnvironment;
  marketplaceId: string;
  /** Names of the variables that are missing. Names only, never values. */
  missing: string[];
  deletionEndpointConfigured: boolean;
}

export function ebayEnvironment(): EbayEnvironment {
  return process.env.EBAY_ENV === 'sandbox' ? 'sandbox' : 'production';
}

export function ebayApiBase(): string {
  return ebayEnvironment() === 'sandbox' ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';
}

/**
 * The default marketplace, from the environment. A request may override
 * it per search, so this is only the fallback.
 */
export function ebayMarketplaceId(): MarketplaceId {
  return toMarketplaceId(process.env.EBAY_MARKETPLACE_ID);
}

/**
 * Reports what is configured without ever revealing a credential.
 * Safe to serialise to the browser.
 */
export function readConfigStatus(): EbayConfigStatus {
  const missing: string[] = [];
  // Trimmed, so a variable holding only whitespace counts as missing
  // rather than reporting the app as configured and then failing auth.
  if (!process.env.EBAY_CLIENT_ID?.trim()) missing.push('EBAY_CLIENT_ID');
  if (!process.env.EBAY_CLIENT_SECRET?.trim()) missing.push('EBAY_CLIENT_SECRET');

  return {
    configured: missing.length === 0,
    environment: ebayEnvironment(),
    marketplaceId: ebayMarketplaceId(),
    missing,
    deletionEndpointConfigured: Boolean(
      process.env.EBAY_VERIFICATION_TOKEN && process.env.EBAY_NOTIFICATION_ENDPOINT,
    ),
  };
}

export function readCredentials(): { clientId: string; clientSecret: string } | null {
  // Trimmed deliberately. Pasting a key into a hosting dashboard very
  // easily carries a trailing newline or space, which then goes into the
  // Basic auth header and makes eBay reject an otherwise correct key with
  // a generic invalid_client. No legitimate eBay credential has leading
  // or trailing whitespace, so removing it can only help.
  const clientId = process.env.EBAY_CLIENT_ID?.trim();
  const clientSecret = process.env.EBAY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}
