/**
 * Descriptive statistics for a set of asking prices, in integer pence.
 *
 * Active listings are asking prices, not sold prices. Listings that are
 * not the product at all are removed before this module sees them (see
 * matching.ts); the interquartile fence here is a second pass that
 * catches priced-wrong listings of the right product, not a substitute
 * for reading what is being sold.
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
