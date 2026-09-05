/**
 * eBay UK selling fees.
 *
 * =====================================================================
 * RATES CHANGE. eBay revises UK fees regularly and the figures below are
 * a snapshot taken in 2026. Verify every rate against eBay's published
 * UK fee pages before you trust a profit number from this tool:
 *   https://www.ebay.co.uk/help/selling/fees-credits-invoices/selling-fees
 *   https://www.ebay.co.uk/help/selling/fees-credits-invoices/private-seller-fees
 * Anything marked VERIFY below is the most likely to be out of date.
 * =====================================================================
 *
 * Two tracks are modelled.
 *
 * PRIVATE SELLERS
 *   Since 1 October 2024 private sellers pay no final value fee, no per
 *   order fee and no regulatory operating fee on eligible domestic sales.
 *   The Buyer Protection fee introduced alongside that change is paid by
 *   the buyer at checkout and is NOT deducted from the seller payout, so
 *   it is deliberately absent from this model.
 *   What a private seller still pays:
 *     - a final value fee in authenticity checked categories, above the
 *       per category value thresholds below
 *     - 3% on international sales
 *   Fees charged to private (consumer) sellers are quoted VAT inclusive,
 *   so no VAT is added on top here.
 *
 * BUSINESS SELLERS
 *   Final value fee of 6.9% to 14.9% depending on category, most items
 *   landing between 9.9% and 12.9%, plus a per order fee, plus a 0.35%
 *   regulatory operating fee, plus 20% VAT on all of those fees.
 */

export type SellerType = 'private' | 'business';

export type CategoryKey =
  | 'general'
  | 'techAndElectronics'
  | 'clothingAndAccessories'
  | 'homeAndGarden'
  | 'mediaBooksGames'
  | 'businessAndIndustrial'
  | 'watches'
  | 'trainers'
  | 'designerHandbags'
  | 'tradingCards';

interface CategoryFeeProfile {
  label: string;
  /** Business seller final value fee, share of the total order value. */
  businessFinalValueFeeRate: number;
  /**
   * Authenticity checked categories only. Private sellers pay a final
   * value fee once the item sells for more than `thresholdGbp`.
   */
  authenticityChecked: {
    thresholdGbp: number;
    /** VERIFY: eBay publishes this per authenticity checked category. */
    privateFinalValueFeeRate: number;
  } | null;
}

/**
 * The single source of truth for every rate this tool applies.
 */
export const EBAY_UK_FEES = {
  /** When these numbers were last checked against eBay's published pages. */
  lastVerified: '2026-01',

  private: {
    /** No FVF on eligible domestic sales since 1 October 2024. */
    finalValueFeeRate: 0,
    /** No per order fee since 1 October 2024. */
    perOrderFeeGbp: 0,
    /** No regulatory operating fee since 1 October 2024. */
    regulatoryOperatingFeeRate: 0,
    /** Charged on international sales, on top of anything else. */
    internationalSaleFeeRate: 0.03,
    /** Private seller fees are quoted VAT inclusive. */
    vatOnFeesRate: 0,
    /**
     * The Buyer Protection fee is paid by the buyer at checkout and does
     * not reduce the seller payout, so it is never deducted.
     */
    buyerProtectionFeeDeducted: false,
  },

  business: {
    /**
     * Charged once per order. eBay uses the lower rate on low value
     * orders and the higher rate above the threshold.
     * VERIFY: threshold and both amounts.
     */
    perOrderFeeGbp: { low: 0.3, high: 0.4, thresholdGbp: 10 },
    /** Regulatory operating fee, share of the total order value. */
    regulatoryOperatingFeeRate: 0.0035,
    /** UK VAT, added on top of every fee above. */
    vatOnFeesRate: 0.2,
    /** Business sellers pay the same 3% uplift on international sales. */
    internationalSaleFeeRate: 0.03,
  },

  /**
   * Per category rates. Business final value fees span the published
   * 6.9% to 14.9% band. Authenticity checked thresholds are the
   * researched values; the private rates beside them are the VERIFY ones
   * and are set deliberately high so profit is understated rather than
   * overstated.
   */
  categories: {
    general: {
      label: 'General / other',
      businessFinalValueFeeRate: 0.129,
      authenticityChecked: null,
    },
    techAndElectronics: {
      label: 'Tech and electronics',
      businessFinalValueFeeRate: 0.099,
      authenticityChecked: null,
    },
    clothingAndAccessories: {
      label: 'Clothing and accessories',
      businessFinalValueFeeRate: 0.119,
      authenticityChecked: null,
    },
    homeAndGarden: {
      label: 'Home and garden',
      businessFinalValueFeeRate: 0.129,
      authenticityChecked: null,
    },
    mediaBooksGames: {
      label: 'Books, music, films and games',
      businessFinalValueFeeRate: 0.149,
      authenticityChecked: null,
    },
    businessAndIndustrial: {
      label: 'Business and industrial',
      businessFinalValueFeeRate: 0.069,
      authenticityChecked: null,
    },
    watches: {
      label: 'Watches (authenticity checked over £100)',
      businessFinalValueFeeRate: 0.129,
      authenticityChecked: { thresholdGbp: 100, privateFinalValueFeeRate: 0.129 },
    },
    trainers: {
      label: 'Trainers (authenticity checked over £100)',
      businessFinalValueFeeRate: 0.119,
      authenticityChecked: { thresholdGbp: 100, privateFinalValueFeeRate: 0.129 },
    },
    designerHandbags: {
      label: 'Designer handbags (authenticity checked over £500)',
      businessFinalValueFeeRate: 0.129,
      authenticityChecked: { thresholdGbp: 500, privateFinalValueFeeRate: 0.129 },
    },
    tradingCards: {
      label: 'Trading cards (authenticity checked over £150)',
      businessFinalValueFeeRate: 0.129,
      authenticityChecked: { thresholdGbp: 150, privateFinalValueFeeRate: 0.129 },
    },
  } satisfies Record<CategoryKey, CategoryFeeProfile>,
} as const;

export const CATEGORY_KEYS = Object.keys(EBAY_UK_FEES.categories) as CategoryKey[];

export interface FeeInput {
  /** What the item is expected to sell for, including any postage charged. */
  salePriceGbp: number;
  sellerType: SellerType;
  category: CategoryKey;
  /** Whether to assume the buyer is outside the UK. */
  internationalSale: boolean;
}

export interface FeeBreakdown {
  finalValueFee: number;
  perOrderFee: number;
  regulatoryFee: number;
  internationalFee: number;
  vat: number;
  total: number;
  /** Human readable lines, useful for showing your working in the UI. */
  notes: string[];
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Works out what eBay takes out of a sale at `salePriceGbp`.
 */
export function calculateSellingFees(input: FeeInput): FeeBreakdown {
  const { salePriceGbp, sellerType, category, internationalSale } = input;
  const profile = EBAY_UK_FEES.categories[category];
  const notes: string[] = [];

  let finalValueFee = 0;
  let perOrderFee = 0;
  let regulatoryFee = 0;
  let internationalFee = 0;
  let vatRate = 0;

  if (sellerType === 'private') {
    const rules = EBAY_UK_FEES.private;
    vatRate = rules.vatOnFeesRate;

    const authenticity = profile.authenticityChecked;
    if (authenticity && salePriceGbp > authenticity.thresholdGbp) {
      finalValueFee = salePriceGbp * authenticity.privateFinalValueFeeRate;
      notes.push(
        `Authenticity checked category over £${authenticity.thresholdGbp}, so a ` +
          `${(authenticity.privateFinalValueFeeRate * 100).toFixed(1)}% final value fee applies.`,
      );
    } else {
      notes.push('No final value fee, per order fee or regulatory fee on eligible domestic private sales.');
    }

    if (internationalSale) {
      internationalFee = salePriceGbp * rules.internationalSaleFeeRate;
      notes.push(`International sale, ${(rules.internationalSaleFeeRate * 100).toFixed(0)}% applies.`);
    }

    notes.push('Buyer Protection fee is paid by the buyer at checkout and is not deducted.');
  } else {
    const rules = EBAY_UK_FEES.business;
    vatRate = rules.vatOnFeesRate;

    finalValueFee = salePriceGbp * profile.businessFinalValueFeeRate;
    perOrderFee =
      salePriceGbp > rules.perOrderFeeGbp.thresholdGbp
        ? rules.perOrderFeeGbp.high
        : rules.perOrderFeeGbp.low;
    regulatoryFee = salePriceGbp * rules.regulatoryOperatingFeeRate;

    notes.push(
      `${(profile.businessFinalValueFeeRate * 100).toFixed(1)}% final value fee, ` +
        `£${perOrderFee.toFixed(2)} per order fee, ` +
        `${(rules.regulatoryOperatingFeeRate * 100).toFixed(2)}% regulatory fee.`,
    );

    if (internationalSale) {
      internationalFee = salePriceGbp * rules.internationalSaleFeeRate;
      notes.push(`International sale, ${(rules.internationalSaleFeeRate * 100).toFixed(0)}% applies.`);
    }

    notes.push(`${(rules.vatOnFeesRate * 100).toFixed(0)}% VAT added on all fees.`);
  }

  const beforeVat = finalValueFee + perOrderFee + regulatoryFee + internationalFee;
  const vat = beforeVat * vatRate;

  return {
    finalValueFee: round2(finalValueFee),
    perOrderFee: round2(perOrderFee),
    regulatoryFee: round2(regulatoryFee),
    internationalFee: round2(internationalFee),
    vat: round2(vat),
    total: round2(beforeVat + vat),
    notes,
  };
}
