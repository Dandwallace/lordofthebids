/**
 * Money in integer minor units.
 *
 * Every financial figure in this app is a whole number of minor units:
 * pence on the UK marketplace, cents on the Spanish one. Floating point
 * amounts accumulate error (0.1 + 0.2 !== 0.3), and this tool exists to
 * answer "is this worth buying", so the arithmetic has to be exact and
 * repeatable. Convert at the edges: parse major units in, format major
 * units out, and keep minor units everywhere between.
 *
 * The unit is the same size in both currencies supported so far, so the
 * arithmetic is identical; only the symbol and the formatting change.
 * Amounts in different currencies must never be added together, which is
 * why a single analysis only ever works within one marketplace.
 */

/** A whole number of minor units. Negative values are losses. */
export type Minor = number;

/**
 * The original name, kept so the wider codebase reads consistently while
 * the app supports currencies whose minor unit is also 1/100.
 */
export type Pence = Minor;

/**
 * Rounds half away from zero, so -2.5 becomes -3 rather than -2.
 * JavaScript's Math.round rounds half toward +Infinity, which makes
 * losses drift smaller than they really are.
 */
export function roundHalfAwayFromZero(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/** Major units (as typed by a person) to minor units. */
export function toPence(pounds: number): Pence {
  if (!Number.isFinite(pounds)) return 0;
  // Multiplying first would inherit the binary representation error:
  // 1.005 * 100 is 100.49999999999999, which rounds down to the wrong
  // penny. Trimming to six decimals first restores the intended value.
  const scaled = Number((pounds * 100).toFixed(6));
  return roundHalfAwayFromZero(scaled);
}

/** Minor units back to major, for display and for JSON to the client. */
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
  // Strip any currency symbol or grouping separator a person or an API
  // might include. Both supported locales use "." as the decimal point in
  // the values eBay returns, so only grouping commas are removed.
  const cleaned = typeof input === 'string' ? input.replace(/[£€$,\s]/g, '') : input;
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

/**
 * How to render money for a given marketplace. Passed explicitly rather
 * than read from a global, so a figure can never be formatted in the
 * wrong currency by accident.
 */
export interface MoneyFormat {
  currency: string;
  locale: string;
}

export const GBP_FORMAT: MoneyFormat = { currency: 'GBP', locale: 'en-GB' };

// Intl formatters are expensive to build, so they are made once per
// currency, locale and precision combination and reused.
const formatterCache = new Map<string, Intl.NumberFormat>();

function formatterFor(format: MoneyFormat, whole: boolean): Intl.NumberFormat {
  const key = `${format.locale}|${format.currency}|${whole}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(format.locale, {
      style: 'currency',
      currency: format.currency,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    });
    formatterCache.set(key, formatter);
  }
  return formatter;
}

/**
 * "£12.34" or "12,34 €" depending on the marketplace. Pass `whole` for
 * summary figures where the minor units are noise.
 */
export function formatMoney(
  amount: Minor | null | undefined,
  whole = false,
  format: MoneyFormat = GBP_FORMAT,
): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '—';
  return formatterFor(format, whole).format(toPounds(amount));
}

/** Signed, for figures where direction matters. */
export function formatSigned(
  amount: Minor | null | undefined,
  format: MoneyFormat = GBP_FORMAT,
): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '—';
  const sign = amount > 0 ? '+' : '';
  return `${sign}${formatterFor(format, false).format(toPounds(amount))}`;
}

/**
 * A ratio as a percentage string. Returns "—" for null so an unknown
 * never renders as "0%", which would read as a real, bad answer.
 */
export function formatPercent(ratio: number | null | undefined, decimals = 0): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return '—';
  return `${(ratio * 100).toFixed(decimals)}%`;
}

/** The bare symbol, for input adornments. */
export function currencySymbol(format: MoneyFormat): string {
  return format.currency === 'EUR' ? '€' : '£';
}

/**
 * Safe division for ratios like ROI and margin. A zero or negative
 * denominator returns null rather than Infinity or a nonsense number.
 */
export function ratio(numerator: Pence, denominator: Pence): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return numerator / denominator;
}
