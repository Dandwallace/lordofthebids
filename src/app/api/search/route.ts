/**
 * Runs a search against eBay and returns the priced up results.
 *
 * All eBay traffic goes through routes like this one so the client secret
 * stays on the server. Errors are converted to safe, user readable
 * messages here; nothing upstream reaches the browser verbatim.
 */

import { NextResponse } from 'next/server';
import { searchActiveListings } from '@/lib/ebay/browse';
import { EbayError, notConfigured } from '@/lib/ebay/errors';
import { readConfigStatus } from '@/lib/ebay/config';
import { analyse } from '@/lib/market/analyse';
import { parseCriteria, parsePreferences, parseQuery } from '@/lib/api-shared';
import { matchesExclusion, parseExclusionTerms } from '@/lib/text';
import type { ApiError, SearchResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function errorResponse(error: EbayError) {
  const body: ApiError = { error: error.message, recovery: error.recovery, kind: error.kind };
  return NextResponse.json(body, { status: error.httpStatus });
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

  const query = parseQuery(body.query);
  if (!query) {
    return NextResponse.json(
      {
        error: 'Enter something to search for.',
        recovery: 'A product name works best, for example "casio fx-991ex calculator".',
        kind: 'badRequest',
      } satisfies ApiError,
      { status: 400 },
    );
  }

  if (!readConfigStatus().configured) return errorResponse(notConfigured());

  const criteria = parseCriteria(body.criteria);
  const preferences = parsePreferences(body.preferences);
  const manualResale =
    typeof body.manualResalePence === 'number' && body.manualResalePence > 0
      ? Math.round(body.manualResalePence)
      : null;

  try {
    const search = await searchActiveListings({
      marketplaceId: preferences.marketplaceId,
      query,
      condition: criteria.condition,
      buyingFormat: criteria.buyingFormat,
      delivery: criteria.delivery,
      // Only the explicit reference bounds are sent to eBay. The buyer's
      // maximum purchase price is deliberately NOT a search filter.
      referenceMinPrice: criteria.referenceMinPricePence ? criteria.referenceMinPricePence / 100 : null,
      referenceMaxPrice: criteria.referenceMaxPricePence ? criteria.referenceMaxPricePence / 100 : null,
      depth: criteria.depth,
    });

    // Keyword exclusions are applied to titles here rather than as an
    // eBay query, which does not handle negation reliably.
    const terms = parseExclusionTerms(criteria.excludeTerms);
    const items = terms.length
      ? search.items.filter((item) => matchesExclusion(item.title ?? '', terms) === null)
      : search.items;

    const analysis = analyse({
      items,
      query,
      costs: preferences.costs,
      selling: {
        marketplaceId: preferences.marketplaceId,
      sellerType: preferences.sellerType,
        category: preferences.category,
        internationalSale: preferences.internationalSale,
        vatOnFeesIsACost: preferences.vatOnFeesIsACost,
        finalValueFeeRateOverride: preferences.finalValueFeeRateOverride,
      },
      targets: { minProfit: criteria.minProfitPence, minRoi: criteria.minRoi },
      maxPurchasePrice: criteria.maxPurchasePricePence,
      manualResaleValue: manualResale,
    });

    const response: SearchResponse = {
      analysis,
      meta: {
        apiCallsUsed: search.apiCallsUsed,
        fromCache: search.fromCache,
        totalMatchingOnEbay: search.totalMatching,
        fetchedAt: new Date().toISOString(),
        warnings: search.warnings,
        excludedByTerms: search.items.length - items.length,
      },
      isExample: false,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof EbayError) return errorResponse(error);
    console.error('[api/search] unexpected failure:', error);
    return NextResponse.json(
      {
        error: 'Something went wrong running that search.',
        recovery: 'Your search has been kept. Try again in a moment.',
        kind: 'upstreamUnavailable',
      } satisfies ApiError,
      { status: 500 },
    );
  }
}
