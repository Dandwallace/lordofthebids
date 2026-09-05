/**
 * Turns a page of active eBay listings into a ranked list of buys.
 *
 * There is no sold price data available: eBay's Marketplace Insights API
 * is a limited release that individual developers are refused, so the
 * reference price has to come from the distribution of what everyone else
 * is currently asking for the same thing. Two adjustments make that
 * usable:
 *
 *   1. Outliers are fenced off before the percentiles are computed, so a
 *      job lot of twelve or a broken unit for parts does not move them.
 *   2. The resale assumption is the 40th percentile rather than the
 *      median, because asking prices skew above what things actually sell
 *      for. An active listing at the median is, by definition, one that
 *      has not sold yet.
 */

import type { EbayItemSummary } from '../ebay/types';
import type { AnalysisResponse, Deal, RiskFlag, SearchSettings } from '../types';
import { calculateSellingFees } from './fees';
import { assessConfidence, buildDistribution, percentile, percentileRankOf } from './stats';

/** The percentile used as the resale assumption. */
export const RESALE_PERCENTILE = 40;

/**
 * Only listings in the bottom quarter of the distribution are candidates.
 * Anything above that is not a deal, it is just the market.
 */
export const CANDIDATE_PERCENTILE_CEILING = 25;

/**
 * Below this share of the reference price a listing is more likely to be
 * a different item, an accessory, or a mistake, than a bargain.
 */
const TOO_CHEAP_RATIO = 0.35;

/** Sellers under this feedback score are unproven. */
const LOW_FEEDBACK_SCORE = 20;

/** Positive feedback under this percentage is a bad sign. */
const LOW_FEEDBACK_PERCENTAGE = 95;

function toNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Cheapest postage eBay quotes for the listing, 0 for free postage. */
function shippingCostOf(item: EbayItemSummary): number | null {
  const options = item.shippingOptions ?? [];
  let cheapest: number | null = null;
  for (const option of options) {
    if (option.shippingCostType && option.shippingCostType.toUpperCase() === 'CALCULATED' && !option.shippingCost) {
      continue;
    }
    const cost = toNumber(option.shippingCost?.value);
    if (cost === null) continue;
    if (cheapest === null || cost < cheapest) cheapest = cost;
  }
  return cheapest;
}

/**
 * What the item would cost you, delivered. Auctions are priced at the
 * current bid, which is what you would have to beat.
 */
function buyCostOf(item: EbayItemSummary): { price: number; shipping: number | null; total: number } | null {
  const price = toNumber(item.price?.value) ?? toNumber(item.currentBidPrice?.value);
  if (price === null || price <= 0) return null;
  const shipping = shippingCostOf(item);
  return { price, shipping, total: price + (shipping ?? 0) };
}

function formatOf(item: EbayItemSummary): Deal['buyingFormat'] {
  const options = (item.buyingOptions ?? []).map((option) => option.toUpperCase());
  const auction = options.includes('AUCTION');
  const fixed = options.includes('FIXED_PRICE') || options.includes('BEST_OFFER');
  if (auction && fixed) return 'both';
  if (auction) return 'auction';
  return 'fixed';
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function riskFlagsFor(
  item: EbayItemSummary,
  buyCost: number,
  referencePrice: number,
  format: Deal['buyingFormat'],
): RiskFlag[] {
  const flags: RiskFlag[] = [];

  if (format === 'auction') {
    flags.push({
      kind: 'auction',
      label: 'Auction',
      detail: 'Price shown is the current bid, not what you will end up paying.',
      severity: 'warning',
    });
  }

  const feedbackScore = item.seller?.feedbackScore ?? null;
  const feedbackPct = toNumber(item.seller?.feedbackPercentage);

  if (feedbackScore !== null && feedbackScore < LOW_FEEDBACK_SCORE) {
    flags.push({
      kind: feedbackScore === 0 ? 'noFeedback' : 'lowFeedback',
      label: feedbackScore === 0 ? 'No feedback' : `Feedback ${feedbackScore}`,
      detail:
        feedbackScore === 0
          ? 'Seller has no feedback at all.'
          : `Seller has only ${feedbackScore} feedback, under the ${LOW_FEEDBACK_SCORE} threshold.`,
      severity: 'warning',
    });
  } else if (feedbackPct !== null && feedbackPct < LOW_FEEDBACK_PERCENTAGE) {
    flags.push({
      kind: 'lowFeedback',
      label: `${feedbackPct}% positive`,
      detail: `Positive feedback is under ${LOW_FEEDBACK_PERCENTAGE}%.`,
      severity: 'warning',
    });
  }

  if (referencePrice > 0 && buyCost < referencePrice * TOO_CHEAP_RATIO) {
    flags.push({
      kind: 'suspiciouslyCheap',
      label: 'Too cheap',
      detail:
        `At ${Math.round((buyCost / referencePrice) * 100)}% of the reference price this is more likely ` +
        'a different item, a part, or an empty box than a bargain. Read the listing carefully.',
      severity: 'danger',
    });
  }

  const country = item.itemLocation?.country;
  if (country && country !== 'GB') {
    flags.push({
      kind: 'overseas',
      label: `Ships from ${country}`,
      detail: 'Import charges and long delivery times are likely, and returns are harder.',
      severity: 'warning',
    });
  }

  return flags;
}

export interface AnalyseInput {
  items: EbayItemSummary[];
  settings: SearchSettings;
  totalMatchingOnEbay: number;
  apiCallsUsed: number;
  warnings: string[];
}

export function analyseListings(input: AnalyseInput): AnalysisResponse | null {
  const { items, settings } = input;

  const priced = items
    .map((item) => ({ item, cost: buyCostOf(item) }))
    .filter((entry): entry is { item: EbayItemSummary; cost: NonNullable<ReturnType<typeof buyCostOf>> } => entry.cost !== null);

  const distribution = buildDistribution(priced.map((entry) => entry.cost.total));
  if (!distribution) return null;

  const confidence = assessConfidence(distribution);
  const referencePrice = percentile(distribution.values, RESALE_PERCENTILE);

  // Only the bottom quarter of the distribution is worth costing out.
  const candidateCeiling = percentile(distribution.values, CANDIDATE_PERCENTILE_CEILING);

  let belowThresholdCount = 0;
  const deals: Deal[] = [];

  for (const { item, cost } of priced) {
    if (cost.total > candidateCeiling) continue;

    const format = formatOf(item);
    const fees = calculateSellingFees({
      salePriceGbp: referencePrice,
      sellerType: settings.sellerType,
      category: settings.category,
      internationalSale: settings.internationalSale,
    });

    const outlay = cost.total + settings.postageAndPackaging;
    const netProfit = round2(referencePrice - fees.total - outlay);
    const returnPct = outlay > 0 ? round2((netProfit / outlay) * 100) : 0;

    if (netProfit < settings.minProfit || returnPct < settings.minReturnPct) {
      belowThresholdCount += 1;
      continue;
    }

    deals.push({
      itemId: item.itemId,
      title: item.title ?? 'Untitled listing',
      url: item.itemWebUrl ?? `https://www.ebay.co.uk/itm/${encodeURIComponent(item.itemId)}`,
      imageUrl: item.image?.imageUrl ?? item.thumbnailImages?.[0]?.imageUrl ?? null,
      condition: item.condition ?? null,
      price: round2(cost.price),
      shippingCost: cost.shipping === null ? null : round2(cost.shipping),
      buyCost: round2(cost.total),
      buyingFormat: format,
      bidCount: item.bidCount ?? null,
      sellerUsername: item.seller?.username ?? null,
      sellerFeedbackScore: item.seller?.feedbackScore ?? null,
      sellerFeedbackPercentage: toNumber(item.seller?.feedbackPercentage),
      percentileRank: round2(percentileRankOf(distribution.values, cost.total)),
      assumedResale: round2(referencePrice),
      belowMarketPct:
        referencePrice > 0 ? round2(((referencePrice - cost.total) / referencePrice) * 100) : 0,
      fees,
      netProfit,
      returnPct,
      riskFlags: riskFlagsFor(item, cost.total, referencePrice, format),
    });
  }

  deals.sort((a, b) => b.netProfit - a.netProfit);

  return {
    summary: {
      listingsScanned: items.length,
      comparableListings: distribution.count,
      outliersTrimmed: distribution.trimmedCount,
      totalMatchingOnEbay: input.totalMatchingOnEbay,
      median: round2(distribution.median),
      referencePrice: round2(referencePrice),
      q1: round2(distribution.q1),
      q3: round2(distribution.q3),
      min: round2(distribution.min),
      max: round2(distribution.max),
      confidence: {
        level: confidence.level,
        score: round2(confidence.score),
        reasons: confidence.reasons,
      },
      apiCallsUsed: input.apiCallsUsed,
      warnings: input.warnings,
    },
    deals,
    belowThresholdCount,
  };
}
