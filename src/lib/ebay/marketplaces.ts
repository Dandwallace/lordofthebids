/**
 * The eBay marketplaces this app can work with.
 *
 * A marketplace is not just a hostname. It carries its own currency, its
 * own delivery country, its own site domain and, most importantly, its
 * own selling fees. Treating one marketplace's rules as another's is the
 * quickest way to produce a confident and completely wrong profit figure,
 * so everything that varies by country is collected here and read from
 * one place.
 *
 * Shared between server and client, so nothing server only may be
 * imported into this file.
 */

export type MarketplaceId = 'EBAY_GB' | 'EBAY_ES';

/** ISO 4217. Amounts are held as integer minor units of this currency. */
export type CurrencyCode = 'GBP' | 'EUR';

export interface Marketplace {
  id: MarketplaceId;
  /** Shown in the marketplace picker. */
  label: string;
  /** The site a buyer would visit. */
  domain: string;
  /** ISO 3166-1 alpha-2, used for delivery filters and location context. */
  country: 'GB' | 'ES';
  currency: CurrencyCode;
  /** Used for number, date and currency formatting. */
  locale: string;
  /** For input adornments, where a full formatter would be noise. */
  currencySymbol: string;
  /** The language this marketplace's users most likely read. */
  defaultLanguage: 'en' | 'es';
}

export const MARKETPLACES: Record<MarketplaceId, Marketplace> = {
  EBAY_GB: {
    id: 'EBAY_GB',
    label: 'United Kingdom (ebay.co.uk)',
    domain: 'www.ebay.co.uk',
    country: 'GB',
    currency: 'GBP',
    locale: 'en-GB',
    currencySymbol: '£',
    defaultLanguage: 'en',
  },
  EBAY_ES: {
    id: 'EBAY_ES',
    label: 'Spain (ebay.es)',
    domain: 'www.ebay.es',
    country: 'ES',
    currency: 'EUR',
    locale: 'es-ES',
    currencySymbol: '€',
    defaultLanguage: 'es',
  },
};

export const MARKETPLACE_IDS = Object.keys(MARKETPLACES) as MarketplaceId[];

export const DEFAULT_MARKETPLACE: MarketplaceId = 'EBAY_GB';

/** Resolves an untrusted value to a known marketplace. */
export function toMarketplaceId(value: unknown): MarketplaceId {
  return MARKETPLACE_IDS.includes(value as MarketplaceId)
    ? (value as MarketplaceId)
    : DEFAULT_MARKETPLACE;
}

export function marketplace(id: MarketplaceId): Marketplace {
  return MARKETPLACES[id] ?? MARKETPLACES[DEFAULT_MARKETPLACE];
}
