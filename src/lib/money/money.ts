/**
 * Money in integer pence.
 *
 * Every financial figure in this app is a whole number of pence. Floating
 * point pounds accumulate error (0.1 + 0.2 !== 0.3), and this tool exists
 * to answer "is this worth buying", so the arithmetic has to be exact and
 * repeatable. Convert at the edges: parse pounds in, format pounds out,
 * and keep pence everywhere between.
 */

/** A whole number of pence. Negative values are losses. */
export type Pence = number;

/**
 * Rounds half away from zero, so -2.5 becomes -3 rather than -2.
 * JavaScript's Math.round rounds half toward +Infinity, which makes
 * losses drift smaller than they really are.
 */
export function roundHalfAwayFromZero(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/** Pounds (as typed by a person) to pence. */
export function toPence(pounds: number): Pence {
  if (!Number.isFinite(pounds)) return 0;
  // Multiplying first would inherit the binary representation error:
  // 1.005 * 100 is 100.49999999999999, which rounds down to the wrong
  // penny. Trimming to six decimals first restores the intended value.
  const scaled = Number((pounds * 100).toFixed(6));
  return roundHalfAwayFromZero(scaled);
}

/** Pence back to pounds, for display and for JSON going to the client. */
export function toPounds(pence: Pence): number {
  return pence / 100;
}

/**
 * Parses a user entered or API supplied amount into pence.
 * Returns null for anything that is not a usable number, so callers have
 * to decide what an unknown value means rather than silently getting 0.
 */
export function parsePence(input: string | number | null | undefined): Pence | null {
  if (input === null || input === undefined || input === '') return null;
  const cleaned = typeof input === 'string' ? input.replace(/[£,\s]/g, '') : input;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return toPence(value);
}

/** Applies a percentage rate (0.129 for 12.9%) to an amount. */
export function applyRate(amount: Pence, rate: number): Pence {
  return roundHalfAwayFromZero(amount * rate);
}

/** Sums amounts, ignoring nulls. */
export function sum(...amounts: (Pence | null | undefined)[]): Pence {
  let total = 0;
  for (const amount of amounts) {
    if (typeof amount === 'number' && Number.isFinite(amount)) total += amount;
  }
  return total;
}

/** Never let a derived figure go negative where negative is meaningless. */
export function atLeastZero(amount: Pence): Pence {
  return amount > 0 ? amount : 0;
}

const GBP = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const GBP_WHOLE = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** "£12.34". Pass `whole` for summary figures where pence are noise. */
export function formatMoney(pence: Pence | null | undefined, whole = false): string {
  if (pence === null || pence === undefined || !Number.isFinite(pence)) return '—';
  return (whole ? GBP_WHOLE : GBP).format(toPounds(pence));
}

/** "+£12.34" / "-£12.34", for figures where direction matters. */
export function formatSigned(pence: Pence | null | undefined): string {
  if (pence === null || pence === undefined || !Number.isFinite(pence)) return '—';
  const sign = pence > 0 ? '+' : '';
  return `${sign}${GBP.format(toPounds(pence))}`;
}

/**
 * A ratio as a percentage string. Returns "—" for null so an unknown
 * never renders as "0%", which would read as a real, bad answer.
 */
export function formatPercent(ratio: number | null | undefined, decimals = 0): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return '—';
  return `${(ratio * 100).toFixed(decimals)}%`;
}

/**
 * Safe division for ratios like ROI and margin. A zero or negative
 * denominator returns null rather than Infinity or a nonsense number.
 */
export function ratio(numerator: Pence, denominator: Pence): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return numerator / denominator;
}
