/**
 * Request parsing shared by the API routes.
 *
 * Everything from the browser is untrusted: values are clamped to sane
 * ranges here so a hand edited request cannot produce absurd figures or
 * an expensive eBay call.
 */

import type { CostAssumptions } from './money/deal';
import { CATEGORY_KEYS, type CategoryKey, type SellerType } from './money/fees';
import type {
  BuyingFormat,
  ConditionFilter,
  DeliveryPreference,
  SearchDepth,
} from './ebay/browse-types';
import { toMarketplaceId } from './ebay/marketplaces';
import type { SearchCriteria, SellingPreferences } from './types';

const CONDITIONS: ConditionFilter[] = ['any', 'new', 'refurbished', 'used', 'parts'];
const FORMATS: BuyingFormat[] = ['any', 'buyItNow', 'auction'];
const DELIVERIES: DeliveryPreference[] = ['any', 'delivered', 'collectionAvailable'];
const DEPTHS: SearchDepth[] = ['quick', 'standard', 'thorough'];
const SELLER_TYPES: SellerType[] = ['private', 'business'];

function pick<T>(value: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.round(Math.min(max, Math.max(min, parsed)));
}

function clampRate(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function optionalPence(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(Math.min(parsed, 100_000_00));
}

export function parsePreferences(raw: unknown): SellingPreferences {
  const input = (raw ?? {}) as Record<string, unknown>;
  const costsInput = (input.costs ?? {}) as Record<string, unknown>;

  const costs: CostAssumptions = {
    acquisitionPostage: clampInt(costsInput.acquisitionPostage, 0, 0, 100_000),
    outboundPostage: clampInt(costsInput.outboundPostage, 400, 0, 100_000),
    packaging: clampInt(costsInput.packaging, 80, 0, 100_000),
    preparation: clampInt(costsInput.preparation, 0, 0, 100_000),
    repairAllowance: clampInt(costsInput.repairAllowance, 0, 0, 100_000),
    lossAllowanceRate: clampRate(costsInput.lossAllowanceRate, 0.05, 0, 0.9),
  };

  const override = input.finalValueFeeRateOverride;
  return {
    marketplaceId: toMarketplaceId(input.marketplaceId),
    language: input.language === 'es' ? 'es' : 'en',
    // Private, matching the client default. If a request omits the
    // seller type, falling back to business would deduct fees a private
    // seller does not pay.
    sellerType: pick(input.sellerType, SELLER_TYPES, 'private'),
    category: pick(input.category, CATEGORY_KEYS as CategoryKey[], 'general'),
    internationalSale: input.internationalSale === true,
    vatOnFeesIsACost: input.vatOnFeesIsACost !== false,
    finalValueFeeRateOverride:
      typeof override === 'number' && Number.isFinite(override) && override >= 0 && override <= 0.5
        ? override
        : null,
    costs,
  };
}

export function parseCriteria(raw: unknown): SearchCriteria {
  const input = (raw ?? {}) as Record<string, unknown>;
  return {
    maxPurchasePricePence: optionalPence(input.maxPurchasePricePence),
    minProfitPence: clampInt(input.minProfitPence, 1000, -100_000, 1_000_000),
    minRoi: clampRate(input.minRoi, 0.2, -1, 100),
    condition: pick(input.condition, CONDITIONS, 'any'),
    buyingFormat: pick(input.buyingFormat, FORMATS, 'any'),
    delivery: pick(input.delivery, DELIVERIES, 'any'),
    depth: pick(input.depth, DEPTHS, 'standard'),
    excludeTerms: typeof input.excludeTerms === 'string' ? input.excludeTerms.slice(0, 500) : '',
    referenceMinPricePence: optionalPence(input.referenceMinPricePence),
    referenceMaxPricePence: optionalPence(input.referenceMaxPricePence),
  };
}

export function parseQuery(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const query = raw.trim().replace(/\s+/g, ' ');
  if (!query || query.length > 350) return null;
  return query;
}
