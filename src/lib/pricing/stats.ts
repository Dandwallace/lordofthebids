/**
 * Descriptive statistics for a set of asking prices.
 *
 * Active listings are asking prices, not sold prices, so the distribution
 * is noisy: job lots, broken units, spare parts listings and chancers all
 * sit in the same result set. Everything here exists to get a usable
 * reference price out of that in spite of the noise.
 */

/**
 * Percentile with linear interpolation between the two nearest ranks.
 * `sorted` must already be ascending. `p` is 0 to 100.
 */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0];

  const rank = ((sorted.length - 1) * p) / 100;
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (rank - lower) * (sorted[upper] - sorted[lower]);
}

export interface Fence {
  lower: number;
  upper: number;
}

/**
 * Tukey fence at 1.5 x the interquartile range. Anything outside it is
 * treated as not comparable to the item being valued.
 */
export function iqrFence(sorted: number[], multiplier = 1.5): Fence {
  const q1 = percentile(sorted, 25);
  const q3 = percentile(sorted, 75);
  const iqr = q3 - q1;
  return { lower: q1 - multiplier * iqr, upper: q3 + multiplier * iqr };
}

export interface Distribution {
  /** How many prices went in before trimming. */
  rawCount: number;
  /** How many survived the fence and formed the comparison set. */
  count: number;
  /** How many were discarded as outliers. */
  trimmedCount: number;
  fence: Fence;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  /** The 40th percentile, used as the resale assumption. */
  p40: number;
  mean: number;
  /** Interquartile range divided by the median, a scale free spread measure. */
  dispersion: number;
  /** The trimmed prices, ascending. */
  values: number[];
}

/**
 * Builds the comparison set: sort, fence off the outliers, then describe
 * what is left.
 */
export function buildDistribution(prices: number[]): Distribution | null {
  const clean = prices.filter((p) => Number.isFinite(p) && p > 0).sort((a, b) => a - b);
  if (clean.length === 0) return null;

  // A fence needs enough points for the quartiles to mean anything. Below
  // that, keep everything and let the confidence rating carry the warning.
  const fence = clean.length >= 8 ? iqrFence(clean) : { lower: -Infinity, upper: Infinity };
  const kept = clean.filter((p) => p >= fence.lower && p <= fence.upper);
  const values = kept.length >= 4 ? kept : clean;

  const q1 = percentile(values, 25);
  const q3 = percentile(values, 75);
  const median = percentile(values, 50);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;

  return {
    rawCount: clean.length,
    count: values.length,
    trimmedCount: clean.length - values.length,
    fence,
    min: values[0],
    q1,
    median,
    q3,
    max: values[values.length - 1],
    p40: percentile(values, 40),
    mean,
    dispersion: median > 0 ? (q3 - q1) / median : Infinity,
    values,
  };
}

/**
 * Where a single price sits in the comparison set, 0 to 100.
 */
export function percentileRankOf(sorted: number[], value: number): number {
  if (sorted.length === 0) return NaN;
  let below = 0;
  let equal = 0;
  for (const v of sorted) {
    if (v < value) below += 1;
    else if (v === value) equal += 1;
    else break;
  }
  return ((below + equal / 2) / sorted.length) * 100;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface Confidence {
  level: ConfidenceLevel;
  score: number;
  reasons: string[];
}

/**
 * How much to trust the reference price, driven by sample size and by how
 * tightly the surviving prices cluster. A wide spread usually means the
 * search term is pulling in more than one product.
 */
export function assessConfidence(distribution: Distribution): Confidence {
  const reasons: string[] = [];

  // Sample size: 12 comparable listings is thin, 60 is plenty.
  const sizeScore = Math.max(0, Math.min(1, (distribution.count - 12) / 48));
  if (distribution.count < 12) {
    reasons.push(`Only ${distribution.count} comparable listings after trimming outliers.`);
  } else if (distribution.count < 30) {
    reasons.push(`${distribution.count} comparable listings, a workable but modest sample.`);
  } else {
    reasons.push(`${distribution.count} comparable listings.`);
  }

  // Spread: an IQR under 30% of the median is tight, over 100% is a mess.
  const spreadScore = Math.max(0, Math.min(1, (1.0 - distribution.dispersion) / 0.7));
  if (distribution.dispersion > 1.0) {
    reasons.push('Prices are spread very widely, the search is probably mixing different items.');
  } else if (distribution.dispersion > 0.5) {
    reasons.push('Prices are fairly spread out, consider a more specific search term.');
  } else {
    reasons.push('Prices cluster tightly, the search looks like one product.');
  }

  if (distribution.trimmedCount > 0) {
    reasons.push(`${distribution.trimmedCount} outlier listings excluded by the interquartile fence.`);
  }

  const score = sizeScore * 0.6 + spreadScore * 0.4;
  const level: ConfidenceLevel = score >= 0.66 ? 'high' : score >= 0.33 ? 'medium' : 'low';

  return { level, score, reasons };
}
