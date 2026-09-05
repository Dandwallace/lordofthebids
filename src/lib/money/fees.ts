/**
 * eBay UK selling fees, versioned.
 *
 * WHAT CHANGED FROM THE FIRST VERSION OF THIS FILE, AND WHY
 *
 *  1. The fee base was wrong. eBay charges the final value fee on the
 *     TOTAL the buyer pays, which is the item price plus any postage the
 *     buyer is charged, not the item price alone. Fees are now computed
 *     from an explicit `feeBase`.
 *  2. The per order fee is banded: £0.30 on orders up to £10, £0.40 above
 *     it. That banding is now applied against the same total.
 *  3. Authenticity checked private sales carry a per order fee too, which
 *     the previous version omitted.
 *
 * SOURCES AND CONFIDENCE
 *
 * eBay's own help pages are not reachable from this build environment, so
 * the rates below were confirmed against secondary UK seller references
 * in September 2026 rather than read off eBay directly. They agree with
 * each other on the structure (category final value fee, banded per order
 * fee, 0.35% regulatory operating fee, 20% VAT on all fees) and on the
 * headline band of 6.9% to 14.9%. Per category percentages are the least
 * certain part and are marked below.
 *
 * Because of that, every rate is versioned, carries a verification date,
 * and can be overridden by hand in Settings. If a number here is wrong,
 * the override is the correct fix, not a code change.
 *
 * One known conflict, recorded rather than silently resolved: some
 * secondary sources still describe a 12.8% final value fee for UK private
 * sellers. That predates, or ignores, eBay's 1 October 2024 change which
 * removed selling fees for private sellers on eligible domestic sales.
 * This file follows the post October 2024 position, and private is the
 * default seller type for this tool.
 */

import { applyRate, atLeastZero, sum, type Pence } from './money';

export type SellerType = 'private' | 'business';

export type CategoryKey =
  | 'general'
  | 'techAndElectronics'
  | 'videoGamesAndConsoles'
  | 'boardGamesAndPuzzles'
  | 'clothingAndAccessories'
  | 'homeAndGarden'
  | 'mediaBooksGames'
  | 'businessAndIndustrial'
  | 'watches'
  | 'trainers'
  | 'designerHandbags'
  | 'tradingCards';

/** How sure we are about a particular rate. Surfaced in the UI. */
export type RateConfidence = 'confirmed' | 'indicative';

export interface CategoryFeeProfile {
  label: string;
  /** Business seller final value fee, applied to the full order total. */
  businessFinalValueFeeRate: number;
  businessRateConfidence: RateConfidence;
  /**
   * Authenticity checked categories. Private sellers still pay here, above
   * the value threshold.
   */
  authenticityChecked: {
    thresholdPence: Pence;
    privateFinalValueFeeRate: number;
    privatePerOrderFeePence: Pence;
  } | null;
}

/**
 * THE single source of truth for every rate this app applies.
 * Bump `version` and `verifiedOn` whenever a number here changes.
 */
export const EBAY_UK_FEE_RULES = {
  version: '2026-09-05',
  verifiedOn: '2026-09-05',
  verifiedAgainst: 'Secondary UK seller fee references, not eBay directly. Verify before relying on it.',
  marketplace: 'EBAY_GB',

  /**
   * The final value fee applies to the total the buyer pays: item price
   * plus postage charged to the buyer. Getting this wrong understates
   * fees on every low value, high postage item.
   */
  feeBaseIncludesBuyerPostage: true,

  private: {
    /** Nil on eligible domestic sales since 1 October 2024. */
    finalValueFeeRate: 0,
    perOrderFeePence: 0,
    regulatoryOperatingFeeRate: 0,
    /** Charged on international sales on top of anything else. */
    internationalSaleFeeRate: 0.03,
    /** Fees charged to consumers are quoted VAT inclusive. */
    vatOnFeesRate: 0,
    /**
     * The Buyer Protection fee is paid by the buyer at checkout and does
     * not reduce the seller payout, so it is never deducted here.
     */
    buyerProtectionFeeDeducted: false,
  },

  business: {
    /** £0.30 up to and including £10, £0.40 above it. */
    perOrderFee: { lowPence: 30, highPence: 40, thresholdPence: 1000 },
    regulatoryOperatingFeeRate: 0.0035,
    vatOnFeesRate: 0.2,
    internationalSaleFeeRate: 0.03,
  },

  categories: {
    general: {
      label: 'General / other',
      businessFinalValueFeeRate: 0.129,
      businessRateConfidence: 'indicative',
      authenticityChecked: null,
    },
    techAndElectronics: {
      label: 'Tech and electronics',
      businessFinalValueFeeRate: 0.099,
      businessRateConfidence: 'indicative',
      authenticityChecked: null,
    },
    videoGamesAndConsoles: {
      label: 'Video games and consoles',
      businessFinalValueFeeRate: 0.099,
      businessRateConfidence: 'indicative',
      authenticityChecked: null,
    },
    boardGamesAndPuzzles: {
      label: 'Board games, puzzles and toys',
      businessFinalValueFeeRate: 0.129,
      businessRateConfidence: 'indicative',
      authenticityChecked: null,
    },
    clothingAndAccessories: {
      label: 'Clothing and accessories',
      businessFinalValueFeeRate: 0.119,
      businessRateConfidence: 'indicative',
      authenticityChecked: null,
    },
    homeAndGarden: {
      label: 'Home and garden',
      businessFinalValueFeeRate: 0.129,
      businessRateConfidence: 'indicative',
      authenticityChecked: null,
    },
    mediaBooksGames: {
      label: 'Books, music and films',
      businessFinalValueFeeRate: 0.149,
      businessRateConfidence: 'indicative',
      authenticityChecked: null,
    },
    businessAndIndustrial: {
      label: 'Business and industrial',
      businessFinalValueFeeRate: 0.069,
      businessRateConfidence: 'indicative',
      authenticityChecked: null,
    },
    watches: {
      label: 'Watches',
      businessFinalValueFeeRate: 0.129,
      businessRateConfidence: 'indicative',
      authenticityChecked: {
        thresholdPence: 10_000,
        privateFinalValueFeeRate: 0.128,
        privatePerOrderFeePence: 30,
      },
    },
    trainers: {
      label: 'Trainers',
      businessFinalValueFeeRate: 0.119,
      businessRateConfidence: 'indicative',
      authenticityChecked: {
        thresholdPence: 10_000,
        privateFinalValueFeeRate: 0.128,
        privatePerOrderFeePence: 30,
      },
    },
    designerHandbags: {
      label: 'Designer handbags',
      businessFinalValueFeeRate: 0.129,
      businessRateConfidence: 'indicative',
      authenticityChecked: {
        thresholdPence: 50_000,
        privateFinalValueFeeRate: 0.128,
        privatePerOrderFeePence: 30,
      },
    },
    tradingCards: {
      label: 'Trading cards',
      businessFinalValueFeeRate: 0.129,
      businessRateConfidence: 'indicative',
      authenticityChecked: {
        thresholdPence: 15_000,
        privateFinalValueFeeRate: 0.128,
        privatePerOrderFeePence: 30,
      },
    },
  } satisfies Record<CategoryKey, CategoryFeeProfile>,
} as const;

export const CATEGORY_KEYS = Object.keys(EBAY_UK_FEE_RULES.categories) as CategoryKey[];

export function categoryLabel(key: CategoryKey): string {
  return EBAY_UK_FEE_RULES.categories[key].label;
}

export interface FeeOptions {
  /**
   * The total the buyer pays: item price plus the postage you charge them.
   * If you sell with "free" postage this is simply your asking price, and
   * your postage is a cost rather than a receipt.
   */
  feeBase: Pence;
  /**
   * The item price alone, without the postage charged to the buyer.
   *
   * Used ONLY to decide whether an authenticity checked category's value
   * threshold is crossed, because eBay applies that threshold to the item
   * price rather than the order total. A £95 watch posted for £8 is a £103
   * order that is still under the £100 watch threshold.
   *
   * Fees themselves are always calculated on `feeBase`.
   */
  itemPricePence: Pence;
  sellerType: SellerType;
  category: CategoryKey;
  internationalSale: boolean;
  /**
   * VAT registered businesses can normally reclaim VAT charged on eBay
   * fees. When false, VAT is still shown but excluded from the cost of
   * the sale.
   */
  vatOnFeesIsACost: boolean;
  /**
   * Explicit manual override of the final value fee percentage, used when
   * the exact category rate cannot be established. Always labelled as an
   * override in the UI.
   */
  finalValueFeeRateOverride?: number | null;
}

export interface FeeLine {
  key: string;
  label: string;
  amount: Pence;
  /** Shown in the breakdown so a figure can always be traced to a rule. */
  basis: string;
}

export interface FeeResult {
  lines: FeeLine[];
  /** Fees before VAT. */
  subtotal: Pence;
  vat: Pence;
  /** What actually comes off the payout, given the VAT treatment. */
  total: Pence;
  rulesVersion: string;
  verifiedOn: string;
  /** True when a manual override replaced the published rate. */
  usedOverride: boolean;
  rateConfidence: RateConfidence;
}

/**
 * Works out what eBay takes from a sale.
 * Everything is pence in, pence out; no floating point pounds anywhere.
 */
export function calculateFees(options: FeeOptions): FeeResult {
  const {
    feeBase,
    itemPricePence,
    sellerType,
    category,
    internationalSale,
    vatOnFeesIsACost,
    finalValueFeeRateOverride,
  } = options;

  const profile = EBAY_UK_FEE_RULES.categories[category];
  const lines: FeeLine[] = [];
  const hasOverride =
    typeof finalValueFeeRateOverride === 'number' && Number.isFinite(finalValueFeeRateOverride);

  let vatRate = 0;
  let rateConfidence: RateConfidence = 'confirmed';

  if (sellerType === 'business') {
    const rules = EBAY_UK_FEE_RULES.business;
    vatRate = rules.vatOnFeesRate;

    const fvfRate = hasOverride ? finalValueFeeRateOverride! : profile.businessFinalValueFeeRate;
    rateConfidence = hasOverride ? 'confirmed' : profile.businessRateConfidence;

    lines.push({
      key: 'fvf',
      label: 'Final value fee',
      amount: applyRate(feeBase, fvfRate),
      basis: `${(fvfRate * 100).toFixed(1)}% of the full order total${hasOverride ? ' (manual override)' : ''}`,
    });

    const perOrder =
      feeBase > rules.perOrderFee.thresholdPence
        ? rules.perOrderFee.highPence
        : rules.perOrderFee.lowPence;
    lines.push({
      key: 'perOrder',
      label: 'Per order fee',
      amount: perOrder,
      basis: `Flat fee, ${feeBase > rules.perOrderFee.thresholdPence ? 'orders over £10' : 'orders up to £10'}`,
    });

    lines.push({
      key: 'regulatory',
      label: 'Regulatory operating fee',
      amount: applyRate(feeBase, rules.regulatoryOperatingFeeRate),
      basis: `${(rules.regulatoryOperatingFeeRate * 100).toFixed(2)}% of the full order total`,
    });

    if (internationalSale) {
      lines.push({
        key: 'international',
        label: 'International sale fee',
        amount: applyRate(feeBase, rules.internationalSaleFeeRate),
        basis: `${(rules.internationalSaleFeeRate * 100).toFixed(0)}% when the buyer is outside the UK`,
      });
    }
  } else {
    const rules = EBAY_UK_FEE_RULES.private;
    vatRate = rules.vatOnFeesRate;

    const authenticity = profile.authenticityChecked;
    // Tested against the item price, not the order total: postage does not
    // push an item over an authenticity threshold.
    const authenticityApplies = authenticity !== null && itemPricePence > authenticity.thresholdPence;

    if (authenticityApplies) {
      const fvfRate = hasOverride
        ? finalValueFeeRateOverride!
        : authenticity.privateFinalValueFeeRate;
      rateConfidence = hasOverride ? 'confirmed' : 'indicative';

      lines.push({
        key: 'fvf',
        label: 'Final value fee (authenticity checked)',
        amount: applyRate(feeBase, fvfRate),
        basis: `${(fvfRate * 100).toFixed(1)}% because this category is authenticity checked above its value threshold${
          hasOverride ? ' (manual override)' : ''
        }`,
      });
      lines.push({
        key: 'perOrder',
        label: 'Per order fee',
        amount: authenticity.privatePerOrderFeePence,
        basis: 'Flat fee on authenticity checked sales',
      });
    } else if (hasOverride) {
      rateConfidence = 'confirmed';
      lines.push({
        key: 'fvf',
        label: 'Final value fee',
        amount: applyRate(feeBase, finalValueFeeRateOverride!),
        basis: `${(finalValueFeeRateOverride! * 100).toFixed(1)}% (manual override)`,
      });
    }

    if (internationalSale) {
      lines.push({
        key: 'international',
        label: 'International sale fee',
        amount: applyRate(feeBase, rules.internationalSaleFeeRate),
        basis: `${(rules.internationalSaleFeeRate * 100).toFixed(0)}% when the buyer is outside the UK`,
      });
    }
  }

  const subtotal = sum(...lines.map((line) => line.amount));
  const vat = applyRate(subtotal, vatRate);
  const total = vatOnFeesIsACost ? subtotal + vat : subtotal;

  return {
    lines,
    subtotal,
    vat,
    total: atLeastZero(total),
    rulesVersion: EBAY_UK_FEE_RULES.version,
    verifiedOn: EBAY_UK_FEE_RULES.verifiedOn,
    usedOverride: hasOverride,
    rateConfidence,
  };
}
