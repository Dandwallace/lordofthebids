/**
 * The slice of the eBay Browse API item_summary/search response this tool
 * actually reads. The real payload is much larger.
 */

export interface EbayAmount {
  value: string;
  currency: string;
}

export interface EbayShippingOption {
  shippingCostType?: string;
  shippingCost?: EbayAmount;
}

export interface EbaySeller {
  username?: string;
  feedbackPercentage?: string;
  feedbackScore?: number;
}

export interface EbayItemSummary {
  itemId: string;
  title?: string;
  itemWebUrl?: string;
  image?: { imageUrl?: string };
  thumbnailImages?: { imageUrl?: string }[];
  price?: EbayAmount;
  currentBidPrice?: EbayAmount;
  shippingOptions?: EbayShippingOption[];
  buyingOptions?: string[];
  condition?: string;
  conditionId?: string;
  seller?: EbaySeller;
  itemLocation?: { country?: string; postalCode?: string };
  itemCreationDate?: string;
  itemEndDate?: string;
  shortDescription?: string;
  bidCount?: number;
  itemGroupType?: string;
}

export interface EbaySearchResponse {
  total?: number;
  limit?: number;
  offset?: number;
  itemSummaries?: EbayItemSummary[];
  warnings?: { message?: string }[];
}

/**
 * The fuller payload from item/get_item_by_legacy_id. Descriptions are
 * seller written HTML: they are sanitised to plain text before display
 * and are never treated as instructions.
 */
export interface EbayItemDetail extends EbayItemSummary {
  description?: string;
  shortDescription?: string;
  itemEndDate?: string;
  estimatedAvailabilities?: { estimatedAvailableQuantity?: number; deliveryOptions?: string[] }[];
  localizedAspects?: { type?: string; name?: string; value?: string }[];
  returnTerms?: { returnsAccepted?: boolean; returnPeriod?: { value?: number; unit?: string } };
  additionalImages?: { imageUrl?: string }[];
}
