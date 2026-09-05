/**
 * Runs a search against eBay and returns the priced up results.
 *
 * This route exists so the eBay client secret stays on the server. Every
 * eBay call in this app goes through here or through the deletion
 * notification route; nothing eBay related is ever imported by a client
 * component.
 */

import { NextResponse } from 'next/server';
import { EbayAuthError } from '@/lib/ebay/auth';
import { EbayBrowseError, MAX_PAGES, searchActiveListings } from '@/lib/ebay/browse';
import { analyseListings } from '@/lib/pricing/analyse';
import { CATEGORY_KEYS, type CategoryKey, type SellerType } from '@/lib/pricing/fees';
import type { AnalysisResponse, ConditionFilter, SearchSettings } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CONDITIONS: ConditionFilter[] = ['any', 'new', 'refurbished', 'used', 'parts'];
const SELLER_TYPES: SellerType[] = ['private', 'business'];

function num(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function optionalNum(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parseSettings(body: Record<string, unknown>): SearchSettings | { error: string } {
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  if (!query) return { error: 'Enter a search term.' };
  if (query.length > 350) return { error: 'Search term is too long.' };

  const condition = CONDITIONS.includes(body.condition as ConditionFilter)
    ? (body.condition as ConditionFilter)
    : 'any';
  const sellerType = SELLER_TYPES.includes(body.sellerType as SellerType)
    ? (body.sellerType as SellerType)
    : 'private';
  const category = CATEGORY_KEYS.includes(body.category as CategoryKey)
    ? (body.category as CategoryKey)
    : 'general';

  const minPrice = optionalNum(body.minPrice);
  const maxPrice = optionalNum(body.maxPrice);
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    return { error: 'Minimum price is above the maximum price.' };
  }

  return {
    query,
    condition,
    minPrice,
    maxPrice,
    pages: num(body.pages, 1, 1, MAX_PAGES),
    sellerType,
    category,
    internationalSale: body.internationalSale === true,
    postageAndPackaging: num(body.postageAndPackaging, 0, 0, 10_000),
    minProfit: num(body.minProfit, 0, -10_000, 100_000),
    minReturnPct: num(body.minReturnPct, 0, -100, 10_000),
  };
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  const parsed = parseSettings(body);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const settings = parsed;

  try {
    const search = await searchActiveListings({
      query: settings.query,
      condition: settings.condition,
      minPrice: settings.minPrice ?? undefined,
      maxPrice: settings.maxPrice ?? undefined,
      pages: settings.pages,
    });

    const analysis: AnalysisResponse | null = analyseListings({
      items: search.items,
      settings,
      totalMatchingOnEbay: search.totalMatching,
      apiCallsUsed: search.apiCallsUsed,
      warnings: search.warnings,
    });

    if (!analysis) {
      return NextResponse.json(
        { error: `No priced listings came back for "${settings.query}". Try a broader search term.` },
        { status: 404 },
      );
    }

    return NextResponse.json(analysis);
  } catch (error) {
    if (error instanceof EbayAuthError) {
      console.error('[api/search] eBay auth failed:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (error instanceof EbayBrowseError) {
      console.error('[api/search] eBay Browse failed:', error.message);
      return NextResponse.json({ error: error.message }, { status: error.status === 429 ? 429 : 502 });
    }
    console.error('[api/search] unexpected failure:', error);
    return NextResponse.json({ error: 'Search failed unexpectedly.' }, { status: 500 });
  }
}
