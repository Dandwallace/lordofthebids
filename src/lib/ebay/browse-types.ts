/**
 * Search option types shared by the server and the browser.
 * Kept apart from browse.ts because that module is server only.
 */

export type SearchDepth = 'quick' | 'standard' | 'thorough';
export type ConditionFilter = 'any' | 'new' | 'refurbished' | 'used' | 'parts';
export type BuyingFormat = 'any' | 'buyItNow' | 'auction';
export type DeliveryPreference = 'any' | 'delivered' | 'collectionAvailable';

export const SEARCH_DEPTH_INFO: Record<SearchDepth, { pages: number; label: string; description: string }> = {
  quick: { pages: 1, label: 'Quick', description: 'Up to 200 listings. Cheapest on the daily allowance.' },
  standard: { pages: 2, label: 'Standard', description: 'Up to 400 listings. A good default.' },
  thorough: { pages: 5, label: 'Thorough', description: 'Up to 1,000 listings. Use for wide or thin markets.' },
};

export const CONDITION_LABELS: Record<ConditionFilter, string> = {
  any: 'Any condition',
  new: 'New',
  refurbished: 'Refurbished',
  used: 'Used',
  parts: 'For parts or not working',
};

export const FORMAT_LABELS: Record<BuyingFormat, string> = {
  any: 'Any format',
  buyItNow: 'Buy It Now',
  auction: 'Auction',
};

export const DELIVERY_LABELS: Record<DeliveryPreference, string> = {
  any: 'Any delivery',
  delivered: 'Delivered to me',
  collectionAvailable: 'Local collection available',
};
