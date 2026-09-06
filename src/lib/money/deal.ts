/**
 * The deal arithmetic: what you pay, what you get back, what is left, and
 * the most you could pay and still hit your targets.
 *
 * DEFINITIONS, used consistently everywhere in this app
 *
 *   Acquisition cost  = item price + postage you pay to receive it
 *   Selling costs     = outbound postage + packaging + preparation
 *   Allowances        = repair allowance + expected loss allowance
 *   Total cost        = acquisition cost + selling costs + allowances
 *   Net receipts      = resale price - eBay fees on that sale
 *   Profit            = net receipts - total cost      (pre tax trading profit)
 *   Margin            = profit / resale price
 *   ROI               = profit / total cost
 *
 * The ROI denominator is total cost, stated in the UI wherever ROI is
 * shown. Profit here is trading profit before any personal tax; income
 * tax is deliberately not modelled and not mixed in.
 *
 * Double counting is avoided by treating the resale figure as the full
 * amount the buyer pays, delivery included. eBay's fee base is that same
 * amount, and your own outbound postage is then a cost on top. The buyer
 * paid Buyer Protection fee is not deducted at all, because it does not
 * come out of the seller payout.
 */

import { calculateFees, type CategoryKey, type FeeResult, type SellerType } from './fees';
import type { MarketplaceId } from '../ebay/marketplaces';
import { atLeastZero, ratio, roundHalfAwayFromZero, sum, type Pence } from './money';

export interface CostAssumptions {
  /** Postage you pay to get the item, on top of its price. */
  acquisitionPostage: Pence;
  /** Postage you pay to send it to your buyer. */
  outboundPostage: Pence;
  packaging: Pence;
  /** Cleaning, testing, batteries, cables and so on. */
  preparation: Pence;
  /** Optional allowance for expected repairs. */
  repairAllowance: Pence;
  /**
   * Optional allowance for returns, damage and items that never sell,
   * as a share of the resale price.
   */
  lossAllowanceRate: number;
}

export const DEFAULT_COSTS: CostAssumptions = {
  acquisitionPostage: 0,
  outboundPostage: 400,
  packaging: 80,
  preparation: 0,
  repairAllowance: 0,
  lossAllowanceRate: 0.05,
};

export interface SellingContext {
  /** Which marketplace's fee rules apply to the sale. */
  marketplaceId: MarketplaceId;
  sellerType: SellerType;
  category: CategoryKey;
  internationalSale: boolean;
  vatOnFeesIsACost: boolean;
  finalValueFeeRateOverride?: number | null;
}

export interface DealInput {
  /** The listing price of the item you would buy. */
  itemPrice: Pence;
  /** Postage charged by the seller you are buying from, if known. */
  inboundPostage: Pence | null;
  /** What you expect the buyer to pay you, delivery included. */
  resalePrice: Pence;
  costs: CostAssumptions;
  selling: SellingContext;
}

export interface DealMaths {
  acquisitionCost: Pence;
  sellingCosts: Pence;
  lossAllowance: Pence;
  repairAllowance: Pence;
  totalCost: Pence;
  fees: FeeResult;
  netReceipts: Pence;
  profit: Pence;
  /** null rather than 0 when the denominator is not usable. */
  margin: number | null;
  roi: number | null;
}

/** Works the deal through end to end. */
export function calculateDeal(input: DealInput): DealMaths {
  const { itemPrice, inboundPostage, resalePrice, costs, selling } = input;

  const acquisitionCost = sum(itemPrice, inboundPostage);
  const sellingCosts = sum(costs.outboundPostage, costs.packaging, costs.preparation);
  const lossAllowance = roundHalfAwayFromZero(resalePrice * costs.lossAllowanceRate);
  const repairAllowance = costs.repairAllowance;
  const totalCost = sum(acquisitionCost, sellingCosts, lossAllowance, repairAllowance);

  const fees = calculateFees({
    feeBase: resalePrice,
    // The resale figure is the whole amount the buyer pays, delivery
    // included, so the listing charges no separate postage and the item
    // price is that same amount. Your own outbound postage is a cost, not
    // a charge to the buyer, and so does not reduce the item price here.
    itemPricePence: resalePrice,
    marketplaceId: selling.marketplaceId,
    sellerType: selling.sellerType,
    category: selling.category,
    internationalSale: selling.internationalSale,
    vatOnFeesIsACost: selling.vatOnFeesIsACost,
    finalValueFeeRateOverride: selling.finalValueFeeRateOverride,
  });

  const netReceipts = resalePrice - fees.total;
  const profit = netReceipts - totalCost;

  return {
    acquisitionCost,
    sellingCosts,
    lossAllowance,
    repairAllowance,
    totalCost,
    fees,
    netReceipts,
    profit,
    margin: ratio(profit, resalePrice),
    roi: ratio(profit, totalCost),
  };
}

export interface TargetRequirements {
  /** Minimum acceptable profit in pence. */
  minProfit: Pence;
  /** Minimum acceptable ROI as a ratio, so 0.3 for 30%. */
  minRoi: number;
}

export interface MaxPriceResult {
  /**
   * The most you can pay all in (item + postage in) and still meet both
   * targets. Zero means no purchase price works at this resale value.
   */
  maxAcquisitionCost: Pence;
  /** The most you can pay for the item itself, after acquisition postage. */
  maxItemPrice: Pence;
  /** Which of the two requirements is the binding constraint. */
  bindingConstraint: 'profit' | 'roi' | 'none';
  /** Plain sentences explaining how the ceiling was derived. */
  assumptions: string[];
}

/**
 * Solves for the highest acquisition cost that still clears both the
 * profit floor and the ROI floor.
 *
 * Writing A for acquisition cost and S for every other cost (selling
 * costs plus allowances):
 *
 *   profit  = netReceipts - A - S >= minProfit
 *     =>  A <= netReceipts - S - minProfit
 *
 *   roi     = (netReceipts - A - S) / (A + S) >= minRoi
 *     =>  A <= netReceipts / (1 + minRoi) - S
 *
 * The ceiling is the lower of the two. Both are exact, so the answer is
 * deterministic rather than searched for.
 */
export function calculateMaxPrice(
  resalePrice: Pence,
  costs: CostAssumptions,
  selling: SellingContext,
  targets: TargetRequirements,
): MaxPriceResult {
  const fees = calculateFees({
    feeBase: resalePrice,
    // Same delivery-included assumption as calculateDeal above.
    itemPricePence: resalePrice,
    marketplaceId: selling.marketplaceId,
    sellerType: selling.sellerType,
    category: selling.category,
    internationalSale: selling.internationalSale,
    vatOnFeesIsACost: selling.vatOnFeesIsACost,
    finalValueFeeRateOverride: selling.finalValueFeeRateOverride,
  });

  const netReceipts = resalePrice - fees.total;
  const otherCosts = sum(
    costs.outboundPostage,
    costs.packaging,
    costs.preparation,
    costs.repairAllowance,
    roundHalfAwayFromZero(resalePrice * costs.lossAllowanceRate),
  );

  const byProfit = netReceipts - otherCosts - targets.minProfit;
  // Floor, never round: this is a ceiling, and rounding the intermediate
  // division up can hand back a price one penny too high, which breaks
  // the very constraint being solved for.
  const byRoi =
    targets.minRoi > -1
      ? Math.floor(netReceipts / (1 + targets.minRoi)) - otherCosts
      : Number.POSITIVE_INFINITY;

  const ceiling = Math.min(byProfit, byRoi);
  const maxAcquisitionCost = atLeastZero(Math.floor(ceiling));
  const maxItemPrice = atLeastZero(maxAcquisitionCost - costs.acquisitionPostage);

  let bindingConstraint: MaxPriceResult['bindingConstraint'] = 'none';
  if (maxAcquisitionCost > 0) bindingConstraint = byProfit <= byRoi ? 'profit' : 'roi';

  const assumptions = [
    `Resale assumed at ${(resalePrice / 100).toFixed(2)} including delivery to the buyer.`,
    `eBay fees of ${(fees.total / 100).toFixed(2)} deducted, leaving ${(netReceipts / 100).toFixed(2)} in receipts.`,
    `Your selling costs and allowances of ${(otherCosts / 100).toFixed(2)} deducted.`,
    bindingConstraint === 'roi'
      ? `The ${(targets.minRoi * 100).toFixed(0)}% ROI floor is the binding constraint.`
      : bindingConstraint === 'profit'
        ? `The ${(targets.minProfit / 100).toFixed(2)} profit floor is the binding constraint.`
        : 'No purchase price clears your targets at this resale value.',
  ];

  return { maxAcquisitionCost, maxItemPrice, bindingConstraint, assumptions };
}
