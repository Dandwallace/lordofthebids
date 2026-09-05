import { describe, expect, it } from 'vitest';
import { DEFAULT_COSTS, calculateDeal, calculateMaxPrice, type CostAssumptions, type SellingContext } from '../deal';
import { calculateFees } from '../fees';

const selling: SellingContext = {
  sellerType: 'business',
  category: 'videoGamesAndConsoles',
  internationalSale: false,
  vatOnFeesIsACost: true,
};

const costs: CostAssumptions = {
  acquisitionPostage: 0,
  outboundPostage: 400,
  packaging: 80,
  preparation: 0,
  repairAllowance: 0,
  lossAllowanceRate: 0.05,
};

describe('calculateDeal', () => {
  it('works a simple deal through end to end', () => {
    const deal = calculateDeal({
      itemPrice: 4000,
      inboundPostage: 500,
      resalePrice: 10000,
      costs,
      selling,
    });

    expect(deal.acquisitionCost).toBe(4500);
    expect(deal.sellingCosts).toBe(480);
    expect(deal.lossAllowance).toBe(500); // 5% of £100
    expect(deal.totalCost).toBe(5480);

    // 9.9% of £100 = 990, per order 40, regulatory 35 -> 1065 + 20% VAT = 1278
    expect(deal.fees.total).toBe(1278);
    expect(deal.netReceipts).toBe(8722);
    expect(deal.profit).toBe(3242);

    expect(deal.margin).toBeCloseTo(0.3242, 4);
    expect(deal.roi).toBeCloseTo(3242 / 5480, 6);
  });

  it('treats missing inbound postage as nothing rather than crashing', () => {
    const deal = calculateDeal({
      itemPrice: 4000,
      inboundPostage: null,
      resalePrice: 10000,
      costs,
      selling,
    });
    expect(deal.acquisitionCost).toBe(4000);
  });

  it('reports a loss as a negative profit, not zero', () => {
    const deal = calculateDeal({
      itemPrice: 9000,
      inboundPostage: 500,
      resalePrice: 10000,
      costs,
      selling,
    });
    expect(deal.profit).toBeLessThan(0);
    expect(deal.roi).toBeLessThan(0);
  });

  it('does not double count postage: the fee base is the full amount the buyer pays', () => {
    // Selling at £100 delivered must cost the same in fees as £95 + £5 postage.
    const delivered = calculateDeal({ itemPrice: 0, inboundPostage: 0, resalePrice: 10000, costs, selling });
    const feesOnFullAmount = calculateFees({
      feeBase: 10000,
      sellerType: 'business',
      category: 'videoGamesAndConsoles',
      internationalSale: false,
      vatOnFeesIsACost: true,
    });
    expect(delivered.fees.total).toBe(feesOnFullAmount.total);
  });
});

describe('calculateMaxPrice', () => {
  it('produces a ceiling that exactly hits the profit floor', () => {
    const targets = { minProfit: 2000, minRoi: 0 };
    const max = calculateMaxPrice(10000, costs, selling, targets);

    const atCeiling = calculateDeal({
      itemPrice: max.maxItemPrice,
      inboundPostage: costs.acquisitionPostage,
      resalePrice: 10000,
      costs,
      selling,
    });

    expect(atCeiling.profit).toBeGreaterThanOrEqual(2000);
    // A penny more must break the target, proving the ceiling is tight.
    const overCeiling = calculateDeal({
      itemPrice: max.maxItemPrice + 1,
      inboundPostage: costs.acquisitionPostage,
      resalePrice: 10000,
      costs,
      selling,
    });
    expect(overCeiling.profit).toBeLessThan(2000);
    expect(max.bindingConstraint).toBe('profit');
  });

  it('applies the ROI floor as well and reports which one binds', () => {
    // A demanding ROI floor should bind before a small profit floor.
    const max = calculateMaxPrice(10000, costs, selling, { minProfit: 500, minRoi: 0.5 });
    expect(max.bindingConstraint).toBe('roi');

    const atCeiling = calculateDeal({
      itemPrice: max.maxItemPrice,
      inboundPostage: costs.acquisitionPostage,
      resalePrice: 10000,
      costs,
      selling,
    });
    expect(atCeiling.roi!).toBeGreaterThanOrEqual(0.5);
    expect(atCeiling.profit).toBeGreaterThanOrEqual(500);
  });

  it('subtracts acquisition postage from the item price ceiling', () => {
    const withPostage: CostAssumptions = { ...costs, acquisitionPostage: 495 };
    const max = calculateMaxPrice(10000, withPostage, selling, { minProfit: 2000, minRoi: 0 });
    expect(max.maxItemPrice).toBe(max.maxAcquisitionCost - 495);
  });

  it('returns zero, not a negative, when nothing works', () => {
    const max = calculateMaxPrice(1000, costs, selling, { minProfit: 5000, minRoi: 0.5 });
    expect(max.maxAcquisitionCost).toBe(0);
    expect(max.maxItemPrice).toBe(0);
    expect(max.bindingConstraint).toBe('none');
  });

  it('is consistent with calculateDeal across a sweep of resale values', () => {
    const targets = { minProfit: 1500, minRoi: 0.25 };
    for (let resale = 2000; resale <= 50000; resale += 1000) {
      const max = calculateMaxPrice(resale, costs, selling, targets);
      if (max.maxAcquisitionCost === 0) continue;
      const deal = calculateDeal({
        itemPrice: max.maxItemPrice,
        inboundPostage: costs.acquisitionPostage,
        resalePrice: resale,
        costs,
        selling,
      });
      expect(deal.profit).toBeGreaterThanOrEqual(targets.minProfit);
      expect(deal.roi!).toBeGreaterThanOrEqual(targets.minRoi - 1e-9);
    }
  });

  it('uses sensible defaults', () => {
    expect(DEFAULT_COSTS.outboundPostage).toBeGreaterThan(0);
    expect(DEFAULT_COSTS.lossAllowanceRate).toBeGreaterThan(0);
  });
});
