/**
 * Looks up a single eBay listing pasted as a URL, and prices it against
 * a market built from a search for its own title.
 *
 * Two API calls: one to fetch the item, one to measure its market.
 */

import { NextResponse } from 'next/server';
import { getItemByLegacyId, parseEbayItemId, searchActiveListings } from '@/lib/ebay/browse';
import { EbayError, notConfigured } from '@/lib/ebay/errors';
import { readConfigStatus } from '@/lib/ebay/config';
import { analyse } from '@/lib/market/analyse';
import { parseCriteria, parsePreferences } from '@/lib/api-shared';
import { toPlainText } from '@/lib/text';
import type { ApiError, SearchResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Builds a search term from a listing title: the first few words carry
 * the product, the rest is usually seller adjectives.
 */
function searchTermFromTitle(title: string): string {
  return title
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .join(' ');
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: 'That request could not be read.', recovery: 'Try again.', kind: 'badRequest' } satisfies ApiError,
      { status: 400 },
    );
  }

  const itemId = typeof body.url === 'string' ? parseEbayItemId(body.url) : null;
  if (!itemId) {
    return NextResponse.json(
      {
        error: 'That does not look like an eBay listing link.',
        recovery: 'Paste the full link to a listing, or its 12 digit item number.',
        kind: 'badRequest',
      } satisfies ApiError,
      { status: 400 },
    );
  }

  if (!readConfigStatus().configured) {
    const error = notConfigured();
    return NextResponse.json(
      { error: error.message, recovery: error.recovery, kind: error.kind } satisfies ApiError,
      { status: error.httpStatus },
    );
  }

  const criteria = parseCriteria(body.criteria);
  const preferences = parsePreferences(body.preferences);

  try {
    const item = await getItemByLegacyId(itemId);
    const term = searchTermFromTitle(item.title ?? '');

    const market = await searchActiveListings({
      query: term,
      condition: criteria.condition,
      buyingFormat: 'any',
      delivery: 'any',
      referenceMinPrice: null,
      referenceMaxPrice: null,
      depth: 'standard',
    });

    // The pasted item is analysed alongside its market. It is added to
    // the item list so it is costed with exactly the same code path.
    const withTarget = market.items.some((candidate) => candidate.itemId === item.itemId)
      ? market.items
      : [item, ...market.items];

    const analysis = analyse({
      items: withTarget,
      query: term,
      costs: preferences.costs,
      selling: {
        sellerType: preferences.sellerType,
        category: preferences.category,
        internationalSale: preferences.internationalSale,
        vatOnFeesIsACost: preferences.vatOnFeesIsACost,
        finalValueFeeRateOverride: preferences.finalValueFeeRateOverride,
      },
      targets: { minProfit: criteria.minProfitPence, minRoi: criteria.minRoi },
      // A pasted listing is being reviewed on purpose, so it is never
      // filtered out on price.
      maxPurchasePrice: null,
    });

    const response: SearchResponse & { focusItemId: string; descriptionText: string } = {
      analysis,
      meta: {
        apiCallsUsed: market.apiCallsUsed + 1,
        fromCache: market.fromCache,
        totalMatchingOnEbay: market.totalMatching,
        fetchedAt: new Date().toISOString(),
        warnings: market.warnings,
        excludedByTerms: 0,
      },
      isExample: false,
      focusItemId: item.itemId,
      // Seller written HTML, reduced to plain text. Data, never markup.
      descriptionText: toPlainText(item.description ?? item.shortDescription),
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof EbayError) {
      return NextResponse.json(
        { error: error.message, recovery: error.recovery, kind: error.kind } satisfies ApiError,
        { status: error.httpStatus },
      );
    }
    console.error('[api/item] unexpected failure:', error);
    return NextResponse.json(
      {
        error: 'That listing could not be loaded.',
        recovery: 'Check the link and try again.',
        kind: 'upstreamUnavailable',
      } satisfies ApiError,
      { status: 500 },
    );
  }
}
