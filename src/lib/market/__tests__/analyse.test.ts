import { describe, expect, it } from 'vitest';
import { analyse, type AnalyseOptions } from '../analyse';
import type { EbayItemSummary } from '../../ebay/types';
import { DEFAULT_COSTS } from '../../money/deal';

let counter = 0;
function listing(title: string, pricePounds: number, extra: Partial<EbayItemSummary> = {}): EbayItemSummary {
  counter += 1;
  return {
    itemId: `v1|${counter}|0`,
    title,
    itemWebUrl: `https://www.ebay.co.uk/itm/${counter}`,
    price: { value: pricePounds.toFixed(2), currency: 'GBP' },
    shippingOptions: [{ shippingCostType: 'FIXED', shippingCost: { value: '0.00', currency: 'GBP' } }],
    buyingOptions: ['FIXED_PRICE'],
    condition: 'Used',
    seller: { username: 'someone', feedbackScore: 400, feedbackPercentage: '99.2' },
    itemLocation: { country: 'GB' },
    ...extra,
  };
}

const base: Omit<AnalyseOptions, 'items'> = {
  query: 'nintendo switch oled console',
  costs: DEFAULT_COSTS,
  selling: {
    sellerType: 'business',
    category: 'videoGamesAndConsoles',
    internationalSale: false,
    vatOnFeesIsACost: true,
  },
  targets: { minProfit: 1000, minRoi: 0.2 },
  maxPurchasePrice: null,
  now: Date.parse('2026-09-05T12:00:00Z'),
};

/** A believable market: most listings around £200. */
function market(): EbayItemSummary[] {
  const prices = [180, 185, 190, 195, 200, 200, 205, 210, 215, 220, 225, 190, 205, 198, 212];
  return prices.map((p) => listing(`Nintendo Switch OLED console 64GB white`, p));
}

describe('the reference price is independent of the purchase filter', () => {
  it('does not move when a maximum purchase price is applied', () => {
    const items = [...market(), listing('Nintendo Switch OLED console 64GB', 90)];

    const unfiltered = analyse({ ...base, items });
    const filtered = analyse({ ...base, items, maxPurchasePrice: 5000 });

    // This is the bug being guarded against: asking for items under £50
    // must not redefine the market as "things under £50".
    expect(filtered.reference!.referenceValue).toBe(unfiltered.reference!.referenceValue);
    expect(filtered.reference!.median).toBe(unfiltered.reference!.median);
    expect(filtered.reference!.evidence.sampleSize).toBe(unfiltered.reference!.evidence.sampleSize);
  });

  it('still applies the filter to the results themselves', () => {
    const items = [...market(), listing('Nintendo Switch OLED console 64GB', 90)];
    const filtered = analyse({ ...base, items, maxPurchasePrice: 10000 });

    const passing = filtered.opportunities.filter((o) => o.meetsTargets);
    expect(passing.every((o) => o.itemPrice <= 10000)).toBe(true);
    expect(
      filtered.opportunities.some((o) => o.filteredOutBecause === 'Above your maximum purchase price'),
    ).toBe(true);
  });
});

describe('listings that are not the product stay out of the reference price', () => {
  it('ignores accessories, empty boxes, job lots and faulty units', () => {
    const clean = analyse({ ...base, items: market() });
    const polluted = analyse({
      ...base,
      items: [
        ...market(),
        listing('Nintendo Switch OLED carry case only', 12),
        listing('Empty box for Nintendo Switch OLED', 8),
        listing('Job lot 5 x Nintendo Switch consoles', 900),
        listing('Nintendo Switch OLED spares or repair', 45),
      ],
    });

    expect(polluted.reference!.referenceValue).toBe(clean.reference!.referenceValue);
    expect(polluted.reference!.evidence.excludedNotProduct).toBe(4);
  });

  it('tallies why listings were set aside', () => {
    const result = analyse({
      ...base,
      items: [...market(), listing('Nintendo Switch case only', 12), listing('Switch console faulty', 40)],
    });
    const labels = result.exclusionTally.map((t) => t.label);
    expect(labels).toContain('Accessory only');
    expect(labels).toContain('Not working');
    expect(result.exclusionTally.every((t) => t.count > 0 && t.explanation)).toBe(true);
  });
});

describe('auction prices are not treated as settled', () => {
  it('marks a current bid as provisional', () => {
    const auction = listing('Nintendo Switch OLED console 64GB', 0, {
      buyingOptions: ['AUCTION'],
      price: undefined,
      currentBidPrice: { value: '95.00', currency: 'GBP' },
      bidCount: 7,
    });

    const result = analyse({ ...base, items: [...market(), auction] });
    const found = result.opportunities.find((o) => o.id === auction.itemId)!;

    expect(found.priceBasis).toBe('currentBid');
    expect(found.priceIsProvisional).toBe(true);
    expect(found.itemPrice).toBe(9500);
    expect(found.bidCount).toBe(7);
  });

  it('ranks a settled price above an auction at equal profit', () => {
    const auction = listing('Nintendo Switch OLED console 64GB', 0, {
      buyingOptions: ['AUCTION'],
      price: undefined,
      currentBidPrice: { value: '100.00', currency: 'GBP' },
    });
    const fixed = listing('Nintendo Switch OLED console 64GB', 100);

    const result = analyse({ ...base, items: [...market(), auction, fixed] });
    const order = result.opportunities.filter((o) => o.meetsTargets).map((o) => o.id);
    expect(order.indexOf(fixed.itemId)).toBeLessThan(order.indexOf(auction.itemId));
  });
});

describe('missing data is handled honestly', () => {
  it('treats an absent delivery quote as unknown, not free', () => {
    const noShipping = listing('Nintendo Switch OLED console 64GB', 100, { shippingOptions: undefined });
    const result = analyse({ ...base, items: [...market(), noShipping] });
    const found = result.opportunities.find((o) => o.id === noShipping.itemId)!;
    expect(found.deliveryCost).toBeNull();
    expect(found.acquisitionCost).toBe(10000);
  });

  it('drops listings with no usable price rather than costing them at zero', () => {
    const priceless = listing('Nintendo Switch OLED console', 0, { price: undefined });
    const result = analyse({ ...base, items: [...market(), priceless] });
    expect(result.opportunities.some((o) => o.id === priceless.itemId)).toBe(false);
  });

  it('returns no reference at all when nothing comparable came back', () => {
    const result = analyse({
      ...base,
      items: [listing('Nintendo Switch carry case only', 10), listing('Empty box only', 5)],
    });
    expect(result.reference).toBeNull();
  });
});

describe('evidence is described, not scored', () => {
  it('always states that these are asking prices and never claims sold data', () => {
    const result = analyse({ ...base, items: market() });
    const evidence = result.reference!.evidence;

    expect(evidence.basis).toMatch(/asking prices/i);
    expect(evidence.basis).toMatch(/not sold prices/i);
    expect(evidence.limitations.join(' ')).toMatch(/nobody has agreed to pay/i);
    expect(['limited', 'moderate', 'reasonable']).toContain(evidence.strength);
    // No percentage confidence anywhere in the evidence object.
    expect(JSON.stringify(evidence)).not.toMatch(/confidence/i);
  });

  it('calls a thin sample limited', () => {
    const result = analyse({ ...base, items: market().slice(0, 6) });
    expect(result.reference!.evidence.strength).toBe('limited');
    expect(result.reference!.evidence.limitations.join(' ')).toMatch(/too small/i);
  });
});

describe('manual resale scenario', () => {
  it('uses the entered figure and says so', () => {
    const result = analyse({ ...base, items: market(), manualResaleValue: 30000 });
    expect(result.reference!.referenceValue).toBe(30000);
    expect(result.reference!.method).toMatch(/manual scenario/i);
  });
});
