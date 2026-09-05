/**
 * Describing how good the evidence is, in words.
 *
 * The previous version of this app printed a confidence score derived
 * from a weighted formula. That number looked authoritative and was not:
 * nothing was measured against a real outcome, so "0.62 confidence" was
 * decoration. It has been replaced with the facts a person can actually
 * judge - how many comparable listings there were, how spread out they
 * are, how recently they were listed, and what the matching could not
 * resolve - plus a one word summary that is defined by explicit rules.
 *
 * The critical honesty point, repeated wherever this is shown: these are
 * ACTIVE ASKING PRICES. eBay's sold data (Marketplace Insights) is a
 * limited release that individual developers are refused, so nothing here
 * measures demand, sell through or how long anything takes to sell. An
 * active listing is a price nobody has accepted yet.
 */

import type { Distribution } from './stats';
import type { VariantProfile } from './matching';

/** A word, not a percentage. Each value has a stated rule behind it. */
export type EvidenceStrength = 'limited' | 'moderate' | 'reasonable';

export interface RecencyProfile {
  /** How many listings reported a creation date. */
  withDates: number;
  medianAgeDays: number | null;
  newestAgeDays: number | null;
  oldestAgeDays: number | null;
}

export interface Evidence {
  strength: EvidenceStrength;
  /** Always shown next to any figure derived from this evidence. */
  basis: string;
  sampleSize: number;
  /** Listings dropped because they were not selling the product. */
  excludedNotProduct: number;
  /** Listings dropped by the price fence after matching. */
  excludedPriceOutlier: number;
  /** Interquartile range as a share of the median. */
  spreadRatio: number | null;
  recency: RecencyProfile;
  /** Plain sentences. Every one is a fact about this specific search. */
  observations: string[];
  /** What this evidence cannot tell you. Always non-empty. */
  limitations: string[];
}

const NOT_SOLD_DATA =
  'Active asking prices from current eBay UK listings. Not sold prices: eBay does not make sold data available to this app.';

export function buildRecencyProfile(creationDates: (string | null | undefined)[], now = Date.now()): RecencyProfile {
  const ages: number[] = [];
  for (const raw of creationDates) {
    if (!raw) continue;
    const parsed = Date.parse(raw);
    if (!Number.isFinite(parsed)) continue;
    const days = (now - parsed) / 86_400_000;
    if (days >= 0 && days < 3650) ages.push(days);
  }

  if (ages.length === 0) {
    return { withDates: 0, medianAgeDays: null, newestAgeDays: null, oldestAgeDays: null };
  }

  ages.sort((a, b) => a - b);
  const median = ages[Math.floor(ages.length / 2)];
  return {
    withDates: ages.length,
    medianAgeDays: Math.round(median),
    newestAgeDays: Math.round(ages[0]),
    oldestAgeDays: Math.round(ages[ages.length - 1]),
  };
}

export interface EvidenceInput {
  distribution: Distribution;
  excludedNotProduct: number;
  recency: RecencyProfile;
  variantProfile: VariantProfile;
  /** How much of the search term the matching could actually pin down. */
  queryWasSpecific: boolean;
}

/**
 * Strength rules, stated so they can be argued with:
 *   reasonable - 25 or more comparable listings AND the middle half of
 *                prices sits within 50% of the median
 *   limited    - fewer than 10 comparable listings OR the middle half
 *                spans more than the median itself
 *   moderate   - everything in between
 */
export function assessEvidence(input: EvidenceInput): Evidence {
  const { distribution, excludedNotProduct, recency, variantProfile, queryWasSpecific } = input;

  const spreadRatio =
    distribution.median > 0 ? (distribution.q3 - distribution.q1) / distribution.median : null;

  let strength: EvidenceStrength = 'moderate';
  if (distribution.count >= 25 && spreadRatio !== null && spreadRatio <= 0.5) {
    strength = 'reasonable';
  } else if (distribution.count < 10 || (spreadRatio !== null && spreadRatio > 1)) {
    strength = 'limited';
  }

  const observations: string[] = [];
  observations.push(
    `${distribution.count} comparable listing${distribution.count === 1 ? '' : 's'} used to build the reference price.`,
  );

  if (excludedNotProduct > 0) {
    observations.push(
      `${excludedNotProduct} listing${excludedNotProduct === 1 ? ' was' : 's were'} set aside for not selling the product itself, such as accessories, empty boxes, faulty units and job lots.`,
    );
  }
  if (distribution.trimmedCount > 0) {
    observations.push(
      `${distribution.trimmedCount} further listing${distribution.trimmedCount === 1 ? '' : 's'} sat outside the interquartile price fence and were excluded.`,
    );
  }

  if (spreadRatio !== null) {
    const middleHalf = `the middle half of asking prices spans ${(spreadRatio * 100).toFixed(0)}% of the median`;
    observations.push(
      spreadRatio <= 0.35
        ? `Prices cluster tightly: ${middleHalf}.`
        : spreadRatio <= 0.7
          ? `Prices are moderately spread: ${middleHalf}.`
          : `Prices are widely spread: ${middleHalf}, which usually means more than one product is in the results.`,
    );
  }

  if (recency.withDates > 0 && recency.medianAgeDays !== null) {
    observations.push(
      `Typical listing was posted ${recency.medianAgeDays} day${recency.medianAgeDays === 1 ? '' : 's'} ago, across the ${recency.withDates} listing${recency.withDates === 1 ? '' : 's'} that reported a date.`,
    );
  }

  if (variantProfile.capacityGb !== null && variantProfile.capacityAgreement < 0.8) {
    observations.push(
      `Capacities vary across the results, so the comparison mixes variants. Only ${(variantProfile.capacityAgreement * 100).toFixed(0)}% share the most common one.`,
    );
  }

  const limitations: string[] = [
    'These are prices being asked, not prices achieved. Nobody has agreed to pay them.',
    'No sold price, demand or selling time data is available to this app, so none is shown.',
  ];

  if (!queryWasSpecific) {
    limitations.push(
      'The search term is broad, so the results may cover several different products. A more specific term gives a tighter comparison.',
    );
  }
  if (distribution.count < 10) {
    limitations.push('The sample is too small to be representative. Treat the reference price as a rough indication.');
  }
  if (recency.withDates < distribution.count / 2) {
    limitations.push('Most listings did not report a creation date, so how current this picture is cannot be confirmed.');
  }

  return {
    strength,
    basis: NOT_SOLD_DATA,
    sampleSize: distribution.count,
    excludedNotProduct,
    excludedPriceOutlier: distribution.trimmedCount,
    spreadRatio,
    recency,
    observations,
    limitations,
  };
}
