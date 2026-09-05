/**
 * Turning a page of active eBay listings into things worth looking at.
 *
 * The order of operations matters and is the main correction over the
 * first version of this app:
 *
 *   1. Read every listing to decide what it is actually selling.
 *   2. Build the reference price from the listings that really are the
 *      product, using ALL of them regardless of the user's budget.
 *   3. Only then apply the buyer's own filters to pick candidates.
 *
 * Step 2 is deliberately independent of the purchase price filter. Asking
 * for items under £50 must not also redefine the market as "things under
 * £50", which would compare cheap listings only against other cheap
 * listings and invent a bargain out of nothing.
 */

import {
  calculateDeal,
  calculateMaxPrice,
  type CostAssumptions,
  type DealMaths,
  type SellingContext,
  type TargetRequirements,
} from '../money/deal';
import { parsePence, type Pence } from '../money/money';
import type { EbayItemSummary } from '../ebay/types';
import {
  assessListing,
  buildVariantProfile,
  detectVariantMismatch,
  type Caution,
  type Exclusion,
  type TitleSignals,
  type VariantProfile,
} from './matching';
import { assessEvidence, buildRecencyProfile, type Evidence } from './evidence';
import { buildDistribution, percentile, percentileRankOf } from './stats';

/**
 * The percentile of active asking prices used as the resale assumption.
 *
 * Every listing in the sample is one that has NOT sold. Asking prices
 * therefore sit above the prices people actually pay, and the midpoint of
 * the asks would overstate what you can get. The 40th percentile is a
 * deliberate haircut on that, not a measurement.
 */
export const REFERENCE_PERCENTILE = 40;

/** How the price you would pay is established. */
export type PriceBasis = 'buyItNow' | 'currentBid' | 'bestOffer';

export interface SellerInfo {
  username: string | null;
  feedbackScore: number | null;
  feedbackPercentage: number | null;
}

export interface ListingFlags {
  exclusions: Exclusion[];
  cautions: Caution[];
  signals: TitleSignals;
}

/** A candidate purchase, fully costed. */
export interface Opportunity {
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  condition: string | null;
  conditionId: string | null;

  priceBasis: PriceBasis;
  /**
   * True when the price is a live auction bid. The final price is
   * unknown, so every figure derived from it is provisional.
   */
  priceIsProvisional: boolean;
  bidCount: number | null;
  endsAt: string | null;

  itemPrice: Pence;
  /** null means eBay did not quote a delivery cost, not that it is free. */
  deliveryCost: Pence | null;
  acquisitionCost: Pence;

  listedAgoDays: number | null;
  seller: SellerInfo;
  itemLocationCountry: string | null;
  flags: ListingFlags;

  /** Where this price sits among the comparable listings, 0 to 100. */
  percentileRank: number | null;
  belowReferenceRatio: number | null;

  maths: DealMaths;
  maxItemPrice: Pence;
  maxAcquisitionCost: Pence;
  maxPriceAssumptions: string[];
  bindingConstraint: 'profit' | 'roi' | 'none';

  meetsTargets: boolean;
  /** Populated when the listing was filtered out, explaining why. */
  filteredOutBecause: string | null;
}

export interface MarketReference {
  referenceValue: Pence;
  percentileUsed: number;
  median: Pence;
  q1: Pence;
  q3: Pence;
  min: Pence;
  max: Pence;
  method: string;
  evidence: Evidence;
  variantProfile: VariantProfile;
}

export interface ExclusionTally {
  label: string;
  count: number;
  explanation: string;
}

export interface AnalysisResult {
  query: string;
  listingsScanned: number;
  reference: MarketReference | null;
  /** Everything costed, including items the filters rejected. */
  opportunities: Opportunity[];
  /** Why listings are not in the results. */
  exclusionTally: ExclusionTally[];
  filteredOutCount: number;
}

export interface AnalyseOptions {
  items: EbayItemSummary[];
  query: string;
  costs: CostAssumptions;
  selling: SellingContext;
  targets: TargetRequirements;
  /** Candidate filter only. Never applied to the reference dataset. */
  maxPurchasePrice: Pence | null;
  /** Manual resale override. When set, replaces the derived reference. */
  manualResaleValue?: Pence | null;
  now?: number;
}

/** Cheapest delivery eBay quotes. null when it did not say. */
function deliveryCostOf(item: EbayItemSummary): Pence | null {
  const options = item.shippingOptions ?? [];
  let cheapest: Pence | null = null;
  for (const option of options) {
    const cost = parsePence(option.shippingCost?.value);
    if (cost === null) continue;
    if (cheapest === null || cost < cheapest) cheapest = cost;
  }
  return cheapest;
}

function priceOf(item: EbayItemSummary): { price: Pence; basis: PriceBasis } | null {
  const options = (item.buyingOptions ?? []).map((option) => option.toUpperCase());
  const isAuction = options.includes('AUCTION');

  const bid = parsePence(item.currentBidPrice?.value);
  const fixed = parsePence(item.price?.value);

  // An auction's live bid is what you would have to beat, and is the only
  // meaningful number while it runs.
  if (isAuction && bid !== null) return { price: bid, basis: 'currentBid' };
  if (fixed !== null) {
    return { price: fixed, basis: options.includes('BEST_OFFER') ? 'bestOffer' : 'buyItNow' };
  }
  if (bid !== null) return { price: bid, basis: 'currentBid' };
  return null;
}

function ageInDays(raw: string | undefined, now: number): number | null {
  if (!raw) return null;
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return null;
  const days = (now - parsed) / 86_400_000;
  return days >= 0 ? Math.round(days) : null;
}

/** A term is "specific" when it pins down more than a bare brand. */
function isSpecificQuery(query: string): boolean {
  const words = query.trim().split(/\s+/).filter(Boolean);
  return words.length >= 3 || /\d/.test(query);
}

const EXCLUSION_LABELS: Record<string, { label: string; explanation: string }> = {
  accessoryOnly: { label: 'Accessory only', explanation: 'Sells an accessory rather than the product.' },
  emptyPackaging: { label: 'Empty packaging', explanation: 'Packaging or inserts with no product inside.' },
  partOrComponent: { label: 'Part or component', explanation: 'A replacement part, not a complete unit.' },
  multipleItems: { label: 'Bundle or job lot', explanation: 'Several items together, so the price is not per unit.' },
  notWorking: { label: 'Not working', explanation: 'Sold faulty or for spares.' },
  digitalOrCode: { label: 'Digital or code', explanation: 'A download code rather than a physical item.' },
  replicaOrUnofficial: { label: 'Replica or unofficial', explanation: 'Not a genuine first party item.' },
  variantMismatch: { label: 'Different variant', explanation: 'A different capacity or edition to the rest of the results.' },
};

export function analyse(options: AnalyseOptions): AnalysisResult {
  const { items, query, costs, selling, targets, maxPurchasePrice, manualResaleValue } = options;
  const now = options.now ?? Date.now();

  // --- 1. Read every listing -------------------------------------------
  const read = items.map((item) => {
    const priced = priceOf(item);
    const assessment = assessListing(item.title ?? '', null);
    const delivery = deliveryCostOf(item);
    return { item, priced, assessment, delivery };
  });

  const usable = read.filter((entry) => entry.priced !== null);

  // --- 2. Reference price, from the product's own listings only --------
  // Deliberately built from every comparable listing, whatever the user's
  // budget. Landed cost (price + delivery) is used throughout so that a
  // cheap item with expensive postage is not mistaken for a bargain.
  const variantProfile = buildVariantProfile(usable.map((entry) => entry.assessment));

  const comparableEntries = usable.filter((entry) => {
    if (!entry.assessment.isComparable) return false;
    return detectVariantMismatch(entry.assessment, variantProfile) === null;
  });

  const excludedNotProduct = usable.length - comparableEntries.length;
  const landedPrices = comparableEntries.map((entry) => entry.priced!.price + (entry.delivery ?? 0));
  const distribution = buildDistribution(landedPrices);

  let reference: MarketReference | null = null;
  if (distribution) {
    const derived = Math.round(percentile(distribution.values, REFERENCE_PERCENTILE));
    const referenceValue = manualResaleValue ?? derived;

    reference = {
      referenceValue,
      percentileUsed: REFERENCE_PERCENTILE,
      median: Math.round(distribution.median),
      q1: Math.round(distribution.q1),
      q3: Math.round(distribution.q3),
      min: distribution.min,
      max: distribution.max,
      method: manualResaleValue
        ? 'Your own resale figure, entered by hand. This is a manual scenario, not a measured value.'
        : `The ${REFERENCE_PERCENTILE}th percentile of what comparable listings are asking, delivery included. Set below the midpoint because asking prices sit above what people actually pay.`,
      evidence: assessEvidence({
        distribution,
        excludedNotProduct,
        recency: buildRecencyProfile(
          comparableEntries.map((entry) => entry.item.itemCreationDate),
          now,
        ),
        variantProfile,
        queryWasSpecific: isSpecificQuery(query),
      }),
      variantProfile,
    };
  }

  // --- 3. Cost every listing and apply the buyer's filters -------------
  const opportunities: Opportunity[] = [];
  const tally = new Map<string, number>();
  let filteredOutCount = 0;

  for (const entry of usable) {
    const { item, priced, assessment, delivery } = entry;
    const price = priced!.price;

    const variantMismatch = detectVariantMismatch(assessment, variantProfile);
    const exclusions = variantMismatch
      ? [...assessment.exclusions, variantMismatch]
      : assessment.exclusions;

    for (const exclusion of exclusions) {
      tally.set(exclusion.reason, (tally.get(exclusion.reason) ?? 0) + 1);
    }

    const acquisitionCost = price + (delivery ?? 0);
    const resale = reference?.referenceValue ?? 0;

    const maths = calculateDeal({
      itemPrice: price,
      inboundPostage: delivery,
      resalePrice: resale,
      costs,
      selling,
    });

    const maxPrice = calculateMaxPrice(
      resale,
      { ...costs, acquisitionPostage: delivery ?? costs.acquisitionPostage },
      selling,
      targets,
    );

    // Filters are applied here, after the market is already established.
    let filteredOutBecause: string | null = null;
    if (exclusions.length > 0) {
      filteredOutBecause = exclusions[0].label;
    } else if (maxPurchasePrice !== null && price > maxPurchasePrice) {
      filteredOutBecause = 'Above your maximum purchase price';
    } else if (maths.profit < targets.minProfit) {
      filteredOutBecause = 'Below your minimum profit';
    } else if (maths.roi === null || maths.roi < targets.minRoi) {
      filteredOutBecause = 'Below your minimum return';
    }

    if (filteredOutBecause) filteredOutCount += 1;

    opportunities.push({
      id: item.itemId,
      title: item.title ?? 'Untitled listing',
      url: item.itemWebUrl ?? `https://www.ebay.co.uk/itm/${encodeURIComponent(item.itemId)}`,
      imageUrl: item.image?.imageUrl ?? item.thumbnailImages?.[0]?.imageUrl ?? null,
      condition: item.condition ?? null,
      conditionId: item.conditionId ?? null,

      priceBasis: priced!.basis,
      priceIsProvisional: priced!.basis === 'currentBid',
      bidCount: item.bidCount ?? null,
      endsAt: item.itemEndDate ?? null,

      itemPrice: price,
      deliveryCost: delivery,
      acquisitionCost,

      listedAgoDays: ageInDays(item.itemCreationDate, now),
      seller: {
        username: item.seller?.username ?? null,
        feedbackScore: item.seller?.feedbackScore ?? null,
        feedbackPercentage: item.seller?.feedbackPercentage
          ? Number(item.seller.feedbackPercentage)
          : null,
      },
      itemLocationCountry: item.itemLocation?.country ?? null,
      flags: { exclusions, cautions: assessment.cautions, signals: assessment.signals },

      percentileRank: distribution ? Math.round(percentileRankOf(distribution.values, acquisitionCost)) : null,
      belowReferenceRatio:
        reference && reference.referenceValue > 0
          ? (reference.referenceValue - acquisitionCost) / reference.referenceValue
          : null,

      maths,
      maxItemPrice: maxPrice.maxItemPrice,
      maxAcquisitionCost: maxPrice.maxAcquisitionCost,
      maxPriceAssumptions: maxPrice.assumptions,
      bindingConstraint: maxPrice.bindingConstraint,

      meetsTargets: filteredOutBecause === null,
      filteredOutBecause,
    });
  }

  // Best profit first. Auctions rank below fixed prices at equal profit,
  // because their price is not settled.
  opportunities.sort((a, b) => {
    if (a.meetsTargets !== b.meetsTargets) return a.meetsTargets ? -1 : 1;
    if (a.priceIsProvisional !== b.priceIsProvisional) return a.priceIsProvisional ? 1 : -1;
    return b.maths.profit - a.maths.profit;
  });

  const exclusionTally: ExclusionTally[] = [...tally.entries()]
    .map(([reason, count]) => ({
      label: EXCLUSION_LABELS[reason]?.label ?? reason,
      explanation: EXCLUSION_LABELS[reason]?.explanation ?? '',
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    query,
    listingsScanned: items.length,
    reference,
    opportunities,
    exclusionTally,
    filteredOutCount,
  };
}
