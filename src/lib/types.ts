/**
 * The contract between the server and the browser.
 *
 * Nothing here may import a server only module. Money crosses this
 * boundary as integer pence, exactly as it is calculated, so the client
 * never re-does arithmetic on floating point pounds.
 */

import type { CategoryKey, SellerType } from './money/fees';
import type { CostAssumptions } from './money/deal';
import type { BuyingFormat, ConditionFilter, DeliveryPreference, SearchDepth } from './ebay/browse-types';
import type { AnalysisResult } from './market/analyse';

export type { CategoryKey, SellerType, CostAssumptions };
export type { BuyingFormat, ConditionFilter, DeliveryPreference, SearchDepth };
export type { AnalysisResult };

/** How you sell. Lives in Settings and rarely changes. */
export interface SellingPreferences {
  sellerType: SellerType;
  category: CategoryKey;
  internationalSale: boolean;
  /** VAT registered businesses can usually reclaim VAT on eBay fees. */
  vatOnFeesIsACost: boolean;
  /** Explicit override when the exact category rate is not known. */
  finalValueFeeRateOverride: number | null;
  costs: CostAssumptions;
}

/** What you are looking for. Changes constantly. */
export interface SearchCriteria {
  /** The most you will pay for an item. Never sent to eBay as a filter. */
  maxPurchasePricePence: number | null;
  minProfitPence: number;
  minRoi: number;
  condition: ConditionFilter;
  buyingFormat: BuyingFormat;
  delivery: DeliveryPreference;
  depth: SearchDepth;
  /** Words that disqualify a listing, applied to titles. */
  excludeTerms: string;
  /** Optional bounds on the comparison set itself, for odd markets. */
  referenceMinPricePence: number | null;
  referenceMaxPricePence: number | null;
}

export interface SearchMeta {
  apiCallsUsed: number;
  fromCache: boolean;
  totalMatchingOnEbay: number;
  fetchedAt: string;
  warnings: string[];
  excludedByTerms: number;
}

export interface SearchResponse {
  analysis: AnalysisResult;
  meta: SearchMeta;
  /** True when this came from bundled example data, not eBay. */
  isExample: boolean;
}

export interface ConnectionStatus {
  configured: boolean;
  environment: 'production' | 'sandbox';
  marketplaceId: string;
  deletionEndpointConfigured: boolean;
  checkedAt: string;
}

export interface ApiError {
  error: string;
  recovery: string;
  kind: string;
}

/** A single item's full detail, for the drawer. */
export interface ItemDetailResponse {
  analysisItem: AnalysisResult;
  descriptionText: string;
  aspects: { name: string; value: string }[];
  additionalImages: string[];
  returnsAccepted: boolean | null;
  isExample: boolean;
}
