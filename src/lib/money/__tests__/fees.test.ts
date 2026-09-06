import { describe, expect, it } from 'vitest';
import { CATEGORY_KEYS, EBAY_UK_FEE_RULES, calculateFees as rawCalculateFees, type FeeOptions } from '../fees';

/**
 * Most cases have no separate postage, so the item price and the order
 * total are the same number. This lets a case state only what it cares
 * about, and makes the cases that DO separate them obvious.
 */
function calculateFees(options: Omit<FeeOptions, 'itemPricePence'> & { itemPricePence?: number }) {
  return rawCalculateFees({ itemPricePence: options.itemPricePence ?? options.feeBase, ...options });
}

const business = {
  sellerType: 'business' as const,
  category: 'general' as const,
  internationalSale: false,
  vatOnFeesIsACost: true,
};

describe('business seller fees', () => {
  it('charges the final value fee on the full order total, postage included', () => {
    // £40 item + £5 postage. The fee base is £45, not £40.
    const fees = calculateFees({ ...business, feeBase: 4500 });
    const fvf = fees.lines.find((line) => line.key === 'fvf')!;
    expect(fvf.amount).toBe(581); // 12.9% of £45 = £5.805 -> 581p

    const wrongBase = calculateFees({ ...business, feeBase: 4000 });
    expect(wrongBase.lines.find((l) => l.key === 'fvf')!.amount).toBe(516);
    // Charging on the item alone would understate the fee by 65p.
    expect(fvf.amount - wrongBase.lines.find((l) => l.key === 'fvf')!.amount).toBe(65);
  });

  it('bands the per order fee at £10', () => {
    expect(calculateFees({ ...business, feeBase: 1000 }).lines.find((l) => l.key === 'perOrder')!.amount).toBe(30);
    expect(calculateFees({ ...business, feeBase: 1001 }).lines.find((l) => l.key === 'perOrder')!.amount).toBe(40);
  });

  it('adds the regulatory fee and 20% VAT on everything', () => {
    const fees = calculateFees({ ...business, feeBase: 10000 });
    // 12.9% = 1290, per order 40, regulatory 0.35% = 35 -> subtotal 1365
    expect(fees.subtotal).toBe(1365);
    expect(fees.vat).toBe(273); // 20%
    expect(fees.total).toBe(1638);
  });

  it('excludes VAT from the cost when it is reclaimable', () => {
    const reclaimable = calculateFees({ ...business, feeBase: 10000, vatOnFeesIsACost: false });
    expect(reclaimable.vat).toBe(273); // still reported
    expect(reclaimable.total).toBe(1365); // but not deducted
  });

  it('adds the international fee only when asked', () => {
    const domestic = calculateFees({ ...business, feeBase: 10000 });
    const abroad = calculateFees({ ...business, feeBase: 10000, internationalSale: true });
    expect(abroad.total - domestic.total).toBe(360); // 3% of £100 + VAT
  });

  it('honours an explicit manual override and marks it', () => {
    const fees = calculateFees({ ...business, feeBase: 10000, finalValueFeeRateOverride: 0.08 });
    expect(fees.lines.find((l) => l.key === 'fvf')!.amount).toBe(800);
    expect(fees.usedOverride).toBe(true);
    expect(fees.rateConfidence).toBe('confirmed');
  });

  it('reports which rule version produced the numbers', () => {
    const fees = calculateFees({ ...business, feeBase: 10000 });
    expect(fees.rulesVersion).toBe(EBAY_UK_FEE_RULES.version);
    expect(fees.verifiedOn).toBe(EBAY_UK_FEE_RULES.verifiedOn);
  });
});

describe('private seller fees', () => {
  const priv = {
    sellerType: 'private' as const,
    category: 'general' as const,
    internationalSale: false,
    vatOnFeesIsACost: true,
  };

  it('charges nothing on an eligible domestic sale', () => {
    const fees = calculateFees({ ...priv, feeBase: 10000 });
    expect(fees.total).toBe(0);
    expect(fees.lines).toHaveLength(0);
  });

  it('never deducts the buyer protection fee', () => {
    expect(EBAY_UK_FEE_RULES.private.buyerProtectionFeeDeducted).toBe(false);
    const fees = calculateFees({ ...priv, feeBase: 50000 });
    expect(fees.lines.some((l) => /buyer protection/i.test(l.label))).toBe(false);
  });

  it('charges in authenticity checked categories above the threshold', () => {
    const under = calculateFees({ ...priv, category: 'watches', feeBase: 9900 });
    expect(under.total).toBe(0);

    const over = calculateFees({ ...priv, category: 'watches', feeBase: 25000 });
    expect(over.lines.find((l) => l.key === 'fvf')!.amount).toBe(3200); // 12.8%
    expect(over.lines.find((l) => l.key === 'perOrder')!.amount).toBe(30);
    expect(over.total).toBe(3230); // consumer fees are VAT inclusive
  });

  it('tests the authenticity threshold against the item price, not the order total', () => {
    // A £95 watch posted for £8 is a £103 order. The watch threshold is
    // £100, and it applies to the item, so no fee is due. Charging on the
    // order total would wrongly take 12.8% of £103.
    const fees = calculateFees({
      ...priv,
      category: 'watches',
      feeBase: 10300,
      itemPricePence: 9500,
    });

    expect(fees.total).toBe(0);
    expect(fees.lines).toHaveLength(0);
  });

  it('still charges when the item price alone clears the threshold', () => {
    // £105 item, £8 postage. The item is over £100, so the fee applies,
    // and it is charged on the full £113 order total.
    const fees = calculateFees({
      ...priv,
      category: 'watches',
      feeBase: 11300,
      itemPricePence: 10500,
    });

    expect(fees.lines.find((l) => l.key === 'fvf')!.amount).toBe(1446); // 12.8% of £113
    expect(fees.total).toBe(1476); // plus the £0.30 per order fee
  });

  it('uses each category threshold', () => {
    // Handbags only bite above £500, cards above £150.
    expect(calculateFees({ ...priv, category: 'designerHandbags', feeBase: 49900 }).total).toBe(0);
    expect(calculateFees({ ...priv, category: 'designerHandbags', feeBase: 60000 }).total).toBeGreaterThan(0);
    expect(calculateFees({ ...priv, category: 'tradingCards', feeBase: 14900 }).total).toBe(0);
    expect(calculateFees({ ...priv, category: 'tradingCards', feeBase: 20000 }).total).toBeGreaterThan(0);
  });

  it('charges 3% on international sales', () => {
    const fees = calculateFees({ ...priv, feeBase: 10000, internationalSale: true });
    expect(fees.total).toBe(300);
  });
});

/**
 * Spain diverges from the UK in a way that matters more than any other
 * difference in this file: private sellers there DO pay a final value
 * fee. Sharing one rule set would have understated a Spanish private
 * seller's costs by roughly a seventh of the sale price.
 */
describe('marketplace rules do not leak into each other', () => {
  const priv = {
    sellerType: 'private' as const,
    category: 'general' as const,
    internationalSale: false,
    vatOnFeesIsACost: true,
  };

  it('charges a UK private seller nothing on an ordinary sale', () => {
    expect(calculateFees({ ...priv, marketplaceId: 'EBAY_GB', feeBase: 10000 }).total).toBe(0);
  });

  it('charges a SPANISH private seller a real fee on the same sale', () => {
    const fees = calculateFees({ ...priv, marketplaceId: 'EBAY_ES', feeBase: 10000 });
    // 14% of 100 euros, plus the 0.35 euro per order fee, plus 0.42%.
    expect(fees.lines.find((l) => l.key === 'fvf')!.amount).toBe(1400);
    expect(fees.lines.find((l) => l.key === 'perOrder')!.amount).toBe(35);
    expect(fees.lines.find((l) => l.key === 'regulatory')!.amount).toBe(42);
    expect(fees.total).toBe(1477);
  });

  it('never returns zero for a Spanish private seller, whatever the category', () => {
    for (const category of CATEGORY_KEYS) {
      const fees = calculateFees({ ...priv, category, marketplaceId: 'EBAY_ES', feeBase: 10000 });
      expect(fees.total).toBeGreaterThan(0);
    }
  });

  it('bands the Spanish per order fee at 10 euros', () => {
    expect(
      calculateFees({ ...priv, marketplaceId: 'EBAY_ES', feeBase: 900 }).lines.find((l) => l.key === 'perOrder')!.amount,
    ).toBe(5);
    expect(
      calculateFees({ ...priv, marketplaceId: 'EBAY_ES', feeBase: 1100 }).lines.find((l) => l.key === 'perOrder')!.amount,
    ).toBe(35);
  });

  it('adds 21% IVA for a Spanish business seller, not 20% VAT', () => {
    const fees = calculateFees({
      sellerType: 'business',
      category: 'general',
      internationalSale: false,
      vatOnFeesIsACost: true,
      marketplaceId: 'EBAY_ES',
      feeBase: 10000,
    });
    // 14% = 1400, per order 35, regulatory 0.35% = 35 -> 1470 subtotal
    expect(fees.subtotal).toBe(1470);
    expect(fees.vat).toBe(309); // 21%
    expect(fees.total).toBe(1779);
  });

  it('reports which marketplace priced the sale', () => {
    expect(calculateFees({ ...priv, marketplaceId: 'EBAY_ES', feeBase: 10000 }).marketplaceId).toBe('EBAY_ES');
    expect(calculateFees({ ...priv, marketplaceId: 'EBAY_GB', feeBase: 10000 }).marketplaceId).toBe('EBAY_GB');
  });

  it('defaults to the UK when no marketplace is given, so old callers are unchanged', () => {
    expect(calculateFees({ ...priv, feeBase: 10000 }).marketplaceId).toBe('EBAY_GB');
  });

  it('keeps the UK authenticity threshold behaviour intact', () => {
    const fees = calculateFees({
      ...priv,
      marketplaceId: 'EBAY_GB',
      category: 'watches',
      feeBase: 10300,
      itemPricePence: 9500,
    });
    expect(fees.total).toBe(0);
  });
});
