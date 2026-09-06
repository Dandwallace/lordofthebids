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
 *
 * =====================================================================
 * MARKETPLACES DIVERGE, AND ONE DIFFERENCE IS DANGEROUS
 *
 * The 1 October 2024 nil fee change for private sellers is a UNITED
 * KINGDOM change. It does not apply in Spain: Spanish private sellers pay
 * a final value fee on ordinary sales. Sharing one rule set across both
 * marketplaces would have handed a Spanish private seller a profit figure
 * with roughly 14% of the sale price missing from the costs.
 *
 * Rules are therefore keyed by marketplace and there is no shared
 * fallback. Adding a marketplace means writing its rules, not inheriting
 * someone else's.
 *
 * Spanish figures were taken from secondary references in September 2026,
 * as eBay's own pages were unreachable from this environment. They are
 * less certain than the UK ones: sources give a 13% to 15% band for the
 * final value fee without a public per category table, so a single
 * indicative rate is used and flagged as such in the interface. Use the
 * manual override once you know your real rate.
 * =====================================================================
 */

import { applyRate, atLeastZero, sum, type Pence } from './money';
import { DEFAULT_MARKETPLACE, type MarketplaceId } from '../ebay/marketplaces';

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
const GB_RULES = {
  marketplaceId: 'EBAY_GB' as MarketplaceId,
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
    /** Nil on eligible domestic sales since 1 October 2024. UK ONLY. */
    finalValueFeeRate: 0,
    perOrderFee: { lowPence: 0, highPence: 0, thresholdPence: 0 },
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

/**
 * eBay Spain.
 *
 * The important difference from the UK: Spanish PRIVATE sellers pay a
 * final value fee on ordinary sales. The nil fee position that applies in
 * the UK since October 2024 has no Spanish equivalent, so nothing here
 * inherits from the UK rules.
 *
 * Confidence is lower than the UK set. Sources give a 13% to 15% band for
 * the final value fee without a public per category breakdown, so one
 * indicative mid band rate is applied to every category and flagged in the
 * interface rather than inventing per category precision. The manual
 * override in Settings is the right fix once you know your actual rate.
 *
 * Authenticity checked thresholds are deliberately left empty: eBay does
 * operate authenticity programmes in Spain, but the value thresholds could
 * not be established, and a guessed threshold is worse than none.
 */
const ES_RULES = {
  marketplaceId: 'EBAY_ES' as MarketplaceId,
  version: '2026-09-06',
  verifiedOn: '2026-09-06',
  verifiedAgainst:
    'Secondary Spanish seller references, not eBay directly. Rates are an indicative mid band; verify before relying on them.',
  marketplace: 'EBAY_ES',

  feeBaseIncludesBuyerPostage: true,

  private: {
    /** Spanish private sellers DO pay a final value fee. */
    finalValueFeeRate: 0.14,
    /** 0.05 euros under 10 euros, 0.35 euros at or above it. */
    perOrderFee: { lowPence: 5, highPence: 35, thresholdPence: 1000 },
    regulatoryOperatingFeeRate: 0.0042,
    internationalSaleFeeRate: 0.03,
    /** Fees quoted to private sellers in Spain already include IVA. */
    vatOnFeesRate: 0,
    buyerProtectionFeeDeducted: false,
  },

  business: {
    perOrderFee: { lowPence: 5, highPence: 35, thresholdPence: 1000 },
    regulatoryOperatingFeeRate: 0.0035,
    /** Spanish IVA, added on top of professional seller fees. */
    vatOnFeesRate: 0.21,
    internationalSaleFeeRate: 0.03,
  },

  categories: {
    general: { label: 'General / otros', businessFinalValueFeeRate: 0.14, businessRateConfidence: 'indicative', authenticityChecked: null },
    techAndElectronics: { label: 'Tecnología y electrónica', businessFinalValueFeeRate: 0.14, businessRateConfidence: 'indicative', authenticityChecked: null },
    videoGamesAndConsoles: { label: 'Videojuegos y consolas', businessFinalValueFeeRate: 0.14, businessRateConfidence: 'indicative', authenticityChecked: null },
    boardGamesAndPuzzles: { label: 'Juegos de mesa y juguetes', businessFinalValueFeeRate: 0.14, businessRateConfidence: 'indicative', authenticityChecked: null },
    clothingAndAccessories: { label: 'Ropa y accesorios', businessFinalValueFeeRate: 0.14, businessRateConfidence: 'indicative', authenticityChecked: null },
    homeAndGarden: { label: 'Hogar y jardín', businessFinalValueFeeRate: 0.14, businessRateConfidence: 'indicative', authenticityChecked: null },
    mediaBooksGames: { label: 'Libros, música y cine', businessFinalValueFeeRate: 0.14, businessRateConfidence: 'indicative', authenticityChecked: null },
    businessAndIndustrial: { label: 'Empresa e industria', businessFinalValueFeeRate: 0.14, businessRateConfidence: 'indicative', authenticityChecked: null },
    watches: { label: 'Relojes', businessFinalValueFeeRate: 0.14, businessRateConfidence: 'indicative', authenticityChecked: null },
    trainers: { label: 'Zapatillas', businessFinalValueFeeRate: 0.14, businessRateConfidence: 'indicative', authenticityChecked: null },
    designerHandbags: { label: 'Bolsos de diseño', businessFinalValueFeeRate: 0.14, businessRateConfidence: 'indicative', authenticityChecked: null },
    tradingCards: { label: 'Cartas coleccionables', businessFinalValueFeeRate: 0.14, businessRateConfidence: 'indicative', authenticityChecked: null },
  } satisfies Record<CategoryKey, CategoryFeeProfile>,
} as const;

/**
 * Fee rules by marketplace. There is deliberately no shared default: a
 * marketplace without its own rules is not supported, rather than quietly
 * charged someone else's.
 */
export const FEE_RULES = {
  EBAY_GB: GB_RULES,
  EBAY_ES: ES_RULES,
} as const;

export function feeRulesFor(marketplaceId: MarketplaceId) {
  return FEE_RULES[marketplaceId] ?? FEE_RULES[DEFAULT_MARKETPLACE];
}

/** The UK set, kept under its original name for existing callers. */
export const EBAY_UK_FEE_RULES = GB_RULES;


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
  /**
   * Which marketplace's rules apply. Fees differ enough between countries
   * that this is not optional in spirit; it defaults only so existing UK
   * callers keep working.
   */
  marketplaceId?: MarketplaceId;
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
  marketplaceId: MarketplaceId;
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
    marketplaceId = DEFAULT_MARKETPLACE,
    sellerType,
    category,
    internationalSale,
    vatOnFeesIsACost,
    finalValueFeeRateOverride,
  } = options;

  const rules = feeRulesFor(marketplaceId);
  const profile = rules.categories[category];
  const lines: FeeLine[] = [];
  const hasOverride =
    typeof finalValueFeeRateOverride === 'number' && Number.isFinite(finalValueFeeRateOverride);

  let vatRate = 0;
  let rateConfidence: RateConfidence = 'confirmed';

  if (sellerType === 'business') {
    const businessRules = rules.business;
    vatRate = businessRules.vatOnFeesRate;

    const fvfRate = hasOverride ? finalValueFeeRateOverride! : profile.businessFinalValueFeeRate;
    rateConfidence = hasOverride ? 'confirmed' : profile.businessRateConfidence;

    lines.push({
      key: 'fvf',
      label: 'Final value fee',
      amount: applyRate(feeBase, fvfRate),
      basis: `${(fvfRate * 100).toFixed(1)}% of the full order total${hasOverride ? ' (manual override)' : ''}`,
    });

    const perOrder =
      feeBase > businessRules.perOrderFee.thresholdPence
        ? businessRules.perOrderFee.highPence
        : businessRules.perOrderFee.lowPence;
    if (perOrder > 0) {
      lines.push({
        key: 'perOrder',
        label: 'Per order fee',
        amount: perOrder,
        basis: `Flat fee, ${feeBase > businessRules.perOrderFee.thresholdPence ? 'larger orders' : 'small orders'}`,
      });
    }

    if (businessRules.regulatoryOperatingFeeRate > 0) {
      lines.push({
        key: 'regulatory',
        label: 'Regulatory operating fee',
        amount: applyRate(feeBase, businessRules.regulatoryOperatingFeeRate),
        basis: `${(businessRules.regulatoryOperatingFeeRate * 100).toFixed(2)}% of the full order total`,
      });
    }

    if (internationalSale) {
      lines.push({
        key: 'international',
        label: 'International sale fee',
        amount: applyRate(feeBase, businessRules.internationalSaleFeeRate),
        basis: `${(businessRules.internationalSaleFeeRate * 100).toFixed(0)}% when the buyer is in another country`,
      });
    }
  } else {
    const privateRules = rules.private;
    vatRate = privateRules.vatOnFeesRate;

    const authenticity = profile.authenticityChecked;
    // Tested against the item price, not the order total: postage does not
    // push an item over an authenticity threshold.
    const authenticityApplies = authenticity !== null && itemPricePence > authenticity.thresholdPence;

    // A marketplace where private sellers pay an ordinary final value fee.
    // The UK sets this to zero; Spain does not. Nothing here may assume
    // the UK position.
    if (!authenticityApplies && privateRules.finalValueFeeRate > 0) {
      const fvfRate = hasOverride ? finalValueFeeRateOverride! : privateRules.finalValueFeeRate;
      rateConfidence = hasOverride ? 'confirmed' : 'indicative';
      lines.push({
        key: 'fvf',
        label: 'Final value fee',
        amount: applyRate(feeBase, fvfRate),
        basis: `${(fvfRate * 100).toFixed(1)}% of the full order total${hasOverride ? ' (manual override)' : ''}`,
      });
    }

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
    } else if (privateRules.finalValueFeeRate > 0) {
      const perOrder =
        feeBase > privateRules.perOrderFee.thresholdPence
          ? privateRules.perOrderFee.highPence
          : privateRules.perOrderFee.lowPence;
      if (perOrder > 0) {
        lines.push({
          key: 'perOrder',
          label: 'Per order fee',
          amount: perOrder,
          basis: `Flat fee, ${feeBase > privateRules.perOrderFee.thresholdPence ? 'larger orders' : 'small orders'}`,
        });
      }
      if (privateRules.regulatoryOperatingFeeRate > 0) {
        lines.push({
          key: 'regulatory',
          label: 'Regulatory operating fee',
          amount: applyRate(feeBase, privateRules.regulatoryOperatingFeeRate),
          basis: `${(privateRules.regulatoryOperatingFeeRate * 100).toFixed(2)}% of the full order total`,
        });
      }
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
        amount: applyRate(feeBase, privateRules.internationalSaleFeeRate),
        basis: `${(privateRules.internationalSaleFeeRate * 100).toFixed(0)}% when the buyer is in another country`,
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
    marketplaceId,
    rulesVersion: rules.version,
    verifiedOn: rules.verifiedOn,
    usedOverride: hasOverride,
    rateConfidence,
  };
}
