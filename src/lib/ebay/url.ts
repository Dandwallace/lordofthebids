/**
 * Pulling a listing id out of an eBay link.
 * Pure and dependency free, so it can run anywhere and be tested directly.
 */

/** eBay listing ids are 11 to 13 digits. */
const ITEM_ID = /^\d{11,13}$/;

export function parseEbayItemId(input: string): string | null {
  const trimmed = input.trim();
  if (ITEM_ID.test(trimmed)) return trimmed;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withScheme);
    // Only real eBay hosts, so a lookalike domain cannot be passed off.
    if (!/(^|\.)ebay\.[a-z.]{2,6}$/i.test(url.hostname)) return null;

    const fromPath = url.pathname.match(/\/itm\/(?:[^/]*\/)?(\d{11,13})/);
    if (fromPath) return fromPath[1];

    const fromQuery = url.searchParams.get('item');
    if (fromQuery && ITEM_ID.test(fromQuery)) return fromQuery;

    return null;
  } catch {
    return null;
  }
}
