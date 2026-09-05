/**
 * eBay configuration and connection state.
 *
 * Credentials are read here and nowhere else. Nothing in this file, and
 * nothing that reads from it, may return a secret value to the client:
 * the only thing exposed is whether configuration is present.
 */

import 'server-only';

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

export function ebayMarketplaceId(): string {
  return process.env.EBAY_MARKETPLACE_ID || 'EBAY_GB';
}

/**
 * Reports what is configured without ever revealing a credential.
 * Safe to serialise to the browser.
 */
export function readConfigStatus(): EbayConfigStatus {
  const missing: string[] = [];
  if (!process.env.EBAY_CLIENT_ID) missing.push('EBAY_CLIENT_ID');
  if (!process.env.EBAY_CLIENT_SECRET) missing.push('EBAY_CLIENT_SECRET');

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
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}
