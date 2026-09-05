/**
 * eBay Browse API client.
 *
 * CALL BUDGET: the default Browse API allowance is 5,000 calls per day for
 * the whole application, not per user. One page of results is one call and
 * returns up to 200 items, so a five page pull costs five calls. Pagination
 * is capped at MAX_PAGES and the page count is a user setting so the budget
 * stays in the operator's hands.
 */

import 'server-only';
import { ebayApiBase, ebayMarketplaceId, getApplicationToken, invalidateToken } from './auth';
import type { ConditionFilter } from '../types';
import type { EbayItemSummary, EbaySearchResponse } from './types';

/** eBay's own maximum for item_summary/search. */
export const ITEMS_PER_PAGE = 200;

/** Hard cap on pages per search, so one search can never eat the budget. */
export const MAX_PAGES = 5;

/**
 * eBay condition IDs grouped into the choices offered in the UI.
 * https://developer.ebay.com/api-docs/sell/static/metadata/condition-id-values.html
 */
const CONDITION_IDS: Record<Exclude<ConditionFilter, 'any'>, string[]> = {
  new: ['1000', '1500', '2750'],
  refurbished: ['2000', '2010', '2020', '2030', '2500'],
  used: ['3000', '4000', '5000', '6000'],
  parts: ['7000'],
};

export interface BrowseSearchParams {
  query: string;
  condition: ConditionFilter;
  minPrice?: number;
  maxPrice?: number;
  pages: number;
}

export interface BrowseSearchResult {
  items: EbayItemSummary[];
  /** eBay's count of everything matching, which can exceed what we pulled. */
  totalMatching: number;
  /** How many Browse API calls this search actually spent. */
  apiCallsUsed: number;
  warnings: string[];
}

export class EbayBrowseError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'EbayBrowseError';
    this.status = status;
  }
}

function buildFilter(params: BrowseSearchParams): string {
  const filters: string[] = [];

  const hasMin = typeof params.minPrice === 'number' && params.minPrice > 0;
  const hasMax = typeof params.maxPrice === 'number' && params.maxPrice > 0;
  if (hasMin || hasMax) {
    const low = hasMin ? String(params.minPrice) : '';
    const high = hasMax ? String(params.maxPrice) : '';
    // eBay range syntax: [low..high], either end may be left open.
    filters.push(`price:[${low}..${high}]`);
    filters.push('priceCurrency:GBP');
  }

  if (params.condition !== 'any') {
    filters.push(`conditionIds:{${CONDITION_IDS[params.condition].join('|')}}`);
  }

  // Only listings that can actually be delivered in the UK.
  filters.push('deliveryCountry:GB');

  return filters.join(',');
}

async function fetchPage(params: BrowseSearchParams, offset: number, retryOn401 = true): Promise<EbaySearchResponse> {
  const token = await getApplicationToken();

  const url = new URL(`${ebayApiBase()}/buy/browse/v1/item_summary/search`);
  url.searchParams.set('q', params.query);
  url.searchParams.set('limit', String(ITEMS_PER_PAGE));
  url.searchParams.set('offset', String(offset));
  const filter = buildFilter(params);
  if (filter) url.searchParams.set('filter', filter);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': ebayMarketplaceId(),
      // Gives eBay a UK context so postage costs come back realistic.
      'X-EBAY-C-ENDUSERCTX': 'contextualLocation=country%3DGB',
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (response.status === 401 && retryOn401) {
    // Token rejected early, drop it and try once with a fresh one.
    invalidateToken();
    return fetchPage(params, offset, false);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    if (response.status === 429) {
      throw new EbayBrowseError(
        'eBay rate limited this app. The Browse API allowance is 5,000 calls per day across the whole application.',
        429,
      );
    }
    throw new EbayBrowseError(
      `eBay Browse API returned ${response.status}. ${detail.slice(0, 300)}`,
      response.status,
    );
  }

  return (await response.json()) as EbaySearchResponse;
}

/**
 * Pulls up to `pages` pages of active listings for a search term.
 */
export async function searchActiveListings(params: BrowseSearchParams): Promise<BrowseSearchResult> {
  const pages = Math.max(1, Math.min(MAX_PAGES, Math.floor(params.pages) || 1));

  const items: EbayItemSummary[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  let totalMatching = 0;
  let apiCallsUsed = 0;

  for (let page = 0; page < pages; page += 1) {
    const payload = await fetchPage(params, page * ITEMS_PER_PAGE);
    apiCallsUsed += 1;

    if (typeof payload.total === 'number') totalMatching = payload.total;
    for (const warning of payload.warnings ?? []) {
      if (warning.message) warnings.push(warning.message);
    }

    const batch = payload.itemSummaries ?? [];
    for (const item of batch) {
      // Multi variation listings can repeat across pages.
      if (item.itemId && !seen.has(item.itemId)) {
        seen.add(item.itemId);
        items.push(item);
      }
    }

    // Short page means eBay has nothing more, so stop spending calls.
    if (batch.length < ITEMS_PER_PAGE) break;
  }

  return { items, totalMatching, apiCallsUsed, warnings: [...new Set(warnings)] };
}
