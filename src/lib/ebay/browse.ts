/**
 * eBay Browse API client.
 *
 * CALL BUDGET: the default allowance is 5,000 calls per day for the whole
 * application, not per user. One page is one call and returns up to 200
 * listings. Pagination is handled here rather than being exposed as a
 * "pages to pull" control, because how many HTTP calls a search costs is
 * an implementation detail, not a decision a person should have to make.
 * They choose a search depth; this module turns that into page requests,
 * caches results, and never exceeds MAX_PAGES.
 */

import 'server-only';
import { getApplicationToken, invalidateToken } from './auth';
import { TtlCache, withConcurrency } from './cache';
import { ebayApiBase } from './config';
import { marketplace, type MarketplaceId } from './marketplaces';
import { notFound, rateLimited, upstreamUnavailable } from './errors';
export { parseEbayItemId } from './url';
import { SEARCH_DEPTH_INFO, type BuyingFormat, type ConditionFilter, type DeliveryPreference, type SearchDepth } from './browse-types';
import type { EbayItemDetail, EbayItemSummary, EbaySearchResponse } from './types';

/** eBay's maximum page size for item_summary/search. */
const ITEMS_PER_PAGE = 200;

/** Nothing in this app may ever request more pages than this. */
export const MAX_PAGES = 5;

/**
 * What the user picks instead of a page count. The trade off is sample
 * size against how much of the shared daily allowance a search spends.
 */

/** https://developer.ebay.com/api-docs/sell/static/metadata/condition-id-values.html */
const CONDITION_IDS: Record<Exclude<ConditionFilter, 'any'>, string[]> = {
  new: ['1000', '1500', '2750'],
  refurbished: ['2000', '2010', '2020', '2030', '2500'],
  used: ['3000', '4000', '5000', '6000'],
  parts: ['7000'],
};

export interface BrowseSearchParams {
  /** Which eBay site to search. Decides currency, delivery and context. */
  marketplaceId: MarketplaceId;
  query: string;
  condition: ConditionFilter;
  buyingFormat: BuyingFormat;
  delivery: DeliveryPreference;
  /**
   * Bounds for the REFERENCE dataset, not the buyer's budget. The maximum
   * a person is willing to pay is applied after the market is measured,
   * never here, or the market would be redefined as "things I can afford".
   */
  referenceMinPrice?: number | null;
  referenceMaxPrice?: number | null;
  depth: SearchDepth;
}

export interface BrowseSearchResult {
  items: EbayItemSummary[];
  totalMatching: number;
  apiCallsUsed: number;
  /** True when the whole result came from cache and cost no API calls. */
  fromCache: boolean;
  warnings: string[];
}

/** Ten minutes: long enough to stop repeat scans, short enough to stay current. */
const searchCache = new TtlCache<BrowseSearchResult>(10 * 60 * 1000, 120);
const itemCache = new TtlCache<EbayItemDetail>(10 * 60 * 1000, 200);

function buildFilter(params: BrowseSearchParams): string {
  const site = marketplace(params.marketplaceId);
  const filters: string[] = [];

  const min = params.referenceMinPrice;
  const max = params.referenceMaxPrice;
  if ((typeof min === 'number' && min > 0) || (typeof max === 'number' && max > 0)) {
    filters.push(`price:[${min && min > 0 ? min : ''}..${max && max > 0 ? max : ''}]`);
    // The marketplace's own currency: asking eBay to filter Spanish
    // listings in GBP returns nothing.
    filters.push(`priceCurrency:${site.currency}`);
  }

  if (params.condition !== 'any') {
    filters.push(`conditionIds:{${CONDITION_IDS[params.condition].join('|')}}`);
  }

  if (params.buyingFormat === 'buyItNow') filters.push('buyingOptions:{FIXED_PRICE}');
  else if (params.buyingFormat === 'auction') filters.push('buyingOptions:{AUCTION}');

  if (params.delivery === 'collectionAvailable') {
    filters.push('deliveryOptions:{SELLER_ARRANGED_LOCAL_PICKUP}');
  } else if (params.delivery === 'delivered') {
    filters.push(`deliveryCountry:${site.country}`);
  }

  return filters.join(',');
}

function cacheKey(params: BrowseSearchParams): string {
  return JSON.stringify([
    params.query.trim().toLowerCase(),
    params.condition,
    params.buyingFormat,
    params.delivery,
    params.referenceMinPrice ?? null,
    params.referenceMaxPrice ?? null,
    params.depth,
    params.marketplaceId,
  ]);
}

const RETRY_DELAYS_MS = [400, 1200];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * One authenticated GET, with retries for the failures that are worth
 * retrying. A 429 is never retried: the allowance is exhausted and
 * hammering it makes things worse.
 */
async function ebayGet(
  url: URL,
  marketplaceId: MarketplaceId,
  attempt = 0,
  retriedAuth = false,
): Promise<Response> {
  const token = await getApplicationToken();
  const site = marketplace(marketplaceId);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': site.id,
        // The buyer's country, so eBay quotes realistic delivery costs.
        'X-EBAY-C-ENDUSERCTX': `contextualLocation=country%3D${site.country}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
  } catch (error) {
    if (attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt]);
      return ebayGet(url, marketplaceId, attempt + 1, retriedAuth);
    }
    console.error('[ebay/browse] request could not be sent:', error);
    throw upstreamUnavailable();
  }

  if (response.status === 401 && !retriedAuth) {
    invalidateToken();
    return ebayGet(url, marketplaceId, attempt, true);
  }

  if (response.status === 429) throw rateLimited();

  if (response.status >= 500 && attempt < RETRY_DELAYS_MS.length) {
    await sleep(RETRY_DELAYS_MS[attempt]);
    return ebayGet(url, marketplaceId, attempt + 1, retriedAuth);
  }

  return response;
}

function searchUrl(params: BrowseSearchParams, offset: number): URL {
  const url = new URL(`${ebayApiBase()}/buy/browse/v1/item_summary/search`);
  url.searchParams.set('q', params.query);
  url.searchParams.set('limit', String(ITEMS_PER_PAGE));
  url.searchParams.set('offset', String(offset));
  const filter = buildFilter(params);
  if (filter) url.searchParams.set('filter', filter);
  return url;
}

async function fetchPage(params: BrowseSearchParams, offset: number): Promise<EbaySearchResponse> {
  const response = await ebayGet(searchUrl(params, offset), params.marketplaceId);

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error(`[ebay/browse] search failed with ${response.status}: ${detail.slice(0, 300)}`);
    throw upstreamUnavailable();
  }

  return (await response.json()) as EbaySearchResponse;
}

/**
 * Pulls active listings for a search term, paginating internally.
 */
export async function searchActiveListings(params: BrowseSearchParams): Promise<BrowseSearchResult> {
  const key = cacheKey(params);
  const cached = searchCache.get(key);
  if (cached) return { ...cached, fromCache: true, apiCallsUsed: 0 };

  const maxPages = Math.min(SEARCH_DEPTH_INFO[params.depth].pages, MAX_PAGES);

  // The first page tells us how many there really are, so later pages are
  // only requested when they exist. Those are fetched two at a time.
  const first = await fetchPage(params, 0);
  let apiCallsUsed = 1;

  const total = first.total ?? first.itemSummaries?.length ?? 0;
  const pagesAvailable = Math.ceil(total / ITEMS_PER_PAGE);
  const remaining = Math.max(0, Math.min(maxPages, pagesAvailable) - 1);

  const laterPages =
    remaining > 0
      ? await withConcurrency(
          Array.from({ length: remaining }, (_, index) => (index + 1) * ITEMS_PER_PAGE),
          2,
          (offset) => fetchPage(params, offset),
        )
      : [];
  apiCallsUsed += laterPages.length;

  const items: EbayItemSummary[] = [];
  const warnings = new Set<string>();
  const seen = new Set<string>();

  for (const page of [first, ...laterPages]) {
    for (const warning of page.warnings ?? []) {
      if (warning.message) warnings.add(warning.message);
    }
    for (const item of page.itemSummaries ?? []) {
      // Multi-variation listings can repeat across pages.
      if (item.itemId && !seen.has(item.itemId)) {
        seen.add(item.itemId);
        items.push(item);
      }
    }
  }

  const result: BrowseSearchResult = {
    items,
    totalMatching: total,
    apiCallsUsed,
    fromCache: false,
    warnings: [...warnings],
  };

  searchCache.set(key, result);
  return result;
}

/** Fetches one listing in full, including its description. */
export async function getItemByLegacyId(
  legacyItemId: string,
  marketplaceId: MarketplaceId,
): Promise<EbayItemDetail> {
  const cacheKey = `${marketplaceId}:${legacyItemId}`;
  const cached = itemCache.get(cacheKey);
  if (cached) return cached;

  const url = new URL(`${ebayApiBase()}/buy/browse/v1/item/get_item_by_legacy_id`);
  url.searchParams.set('legacy_item_id', legacyItemId);

  const response = await ebayGet(url, marketplaceId);
  if (response.status === 404) throw notFound('That listing');
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error(`[ebay/browse] item lookup failed with ${response.status}: ${detail.slice(0, 300)}`);
    throw upstreamUnavailable();
  }

  const item = (await response.json()) as EbayItemDetail;
  itemCache.set(cacheKey, item);
  return item;
}
