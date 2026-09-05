/**
 * The contract between the API route and the page. Nothing here may
 * import server only modules, the client bundle reads these types.
 */

import type { CategoryKey, SellerType, FeeBreakdown } from './pricing/fees';
import type { ConfidenceLevel } from './pricing/stats';

export type { CategoryKey, SellerType, FeeBreakdown, ConfidenceLevel };

export type ConditionFilter = 'any' | 'new' | 'refurbished' | 'used' | 'parts';

/** Everything the left hand panel collects. */
export interface SearchSettings {
  query: string;
  condition: ConditionFilter;
  minPrice: number | null;
  maxPrice: number | null;
  /** 1 to 5. Each page is one Browse API call and up to 200 listings. */
  pages: number;
  sellerType: SellerType;
  category: CategoryKey;
  internationalSale: boolean;
  /** What it costs you to post and pack the item when you resell it. */
  postageAndPackaging: number;
  /** Hide anything that nets less than this. */
  minProfit: number;
  /** Hide anything returning less than this percentage on outlay. */
  minReturnPct: number;
}

export type RiskFlagKind = 'auction' | 'lowFeedback' | 'suspiciouslyCheap' | 'noFeedback' | 'overseas';

export interface RiskFlag {
  kind: RiskFlagKind;
  label: string;
  detail: string;
  severity: 'warning' | 'danger';
}

export interface Deal {
  itemId: string;
  title: string;
  url: string;
  imageUrl: string | null;
  condition: string | null;
  /** Listing price only. */
  price: number;
  /** Postage the buyer pays, 0 when free, null when eBay did not say. */
  shippingCost: number | null;
  /** price + shipping, what it costs you to get the item in hand. */
  buyCost: number;
  buyingFormat: 'fixed' | 'auction' | 'both';
  bidCount: number | null;
  sellerUsername: string | null;
  sellerFeedbackScore: number | null;
  sellerFeedbackPercentage: number | null;
  /** Where this listing sits in the trimmed distribution, 0 to 100. */
  percentileRank: number;
  /** The 40th percentile resale assumption. */
  assumedResale: number;
  /** How far below the reference price the buy cost sits, as a percentage. */
  belowMarketPct: number;
  fees: FeeBreakdown;
  /** resale - fees - buy cost - your postage and packaging. */
  netProfit: number;
  /** netProfit as a percentage of total outlay. */
  returnPct: number;
  riskFlags: RiskFlag[];
}

export interface MarketSummary {
  /** Listings pulled from eBay before any filtering. */
  listingsScanned: number;
  /** Listings that had a usable price and formed the comparison set. */
  comparableListings: number;
  outliersTrimmed: number;
  /** eBay's total count of matching listings, which may exceed what we pulled. */
  totalMatchingOnEbay: number;
  median: number;
  /** The 40th percentile, used as the resale assumption. */
  referencePrice: number;
  q1: number;
  q3: number;
  min: number;
  max: number;
  confidence: {
    level: ConfidenceLevel;
    score: number;
    reasons: string[];
  };
  apiCallsUsed: number;
  warnings: string[];
}

export interface AnalysisResponse {
  summary: MarketSummary;
  deals: Deal[];
  /** Listings below Q1 that were then filtered out by the profit thresholds. */
  belowThresholdCount: number;
}

export interface ApiErrorResponse {
  error: string;
}
