/**
 * Example results.
 *
 * These exist so the interface can be seen working without eBay
 * credentials, and so the layout can be checked against realistic data.
 *
 * Two rules, both load bearing:
 *   1. Example data is run through the REAL analysis code, so the numbers
 *      on screen are genuinely calculated and cannot drift away from what
 *      live results would show.
 *   2. Everything derived from it is flagged as an example all the way to
 *      the screen. It must never be mistaken for a live market.
 */

import type { EbayItemSummary } from '../ebay/types';
import { analyse, type AnalysisResult } from '../market/analyse';
import type { SearchCriteria, SellingPreferences } from '../types';

const DAY = 86_400_000;

function item(
  id: number,
  title: string,
  pricePounds: number,
  options: {
    postage?: number;
    auction?: boolean;
    bids?: number;
    feedback?: number;
    ageDays?: number;
    condition?: string;
    country?: string;
  } = {},
): EbayItemSummary {
  const listedAt = new Date(Date.now() - (options.ageDays ?? 5) * DAY).toISOString();
  const postage = options.postage ?? 0;

  return {
    itemId: `example-${id}`,
    title,
    itemWebUrl: 'https://www.ebay.co.uk/',
    image: { imageUrl: '' },
    price: options.auction ? undefined : { value: pricePounds.toFixed(2), currency: 'GBP' },
    currentBidPrice: options.auction ? { value: pricePounds.toFixed(2), currency: 'GBP' } : undefined,
    bidCount: options.auction ? (options.bids ?? 3) : undefined,
    buyingOptions: options.auction ? ['AUCTION'] : ['FIXED_PRICE'],
    shippingOptions: [{ shippingCostType: 'FIXED', shippingCost: { value: postage.toFixed(2), currency: 'GBP' } }],
    condition: options.condition ?? 'Used',
    conditionId: '3000',
    seller: {
      username: `example_seller_${id}`,
      feedbackScore: options.feedback ?? 340,
      feedbackPercentage: '99.1',
    },
    itemLocation: { country: options.country ?? 'GB' },
    itemCreationDate: listedAt,
  };
}

/**
 * A believable market for a specific, well identified product: the
 * Nintendo Switch OLED. Most listings cluster around £170 to £200, with a
 * handful of genuinely cheaper ones and the usual noise a real search
 * returns.
 *
 * The product was chosen so the example demonstrates a working deal. A
 * £25 item cannot carry £4.80 of postage and packaging, a loss allowance
 * and eBay's fees and still clear a £10 profit floor, so an example built
 * on one would only ever show an empty table.
 */
function exampleListings(): EbayItemSummary[] {
  const market = [
    175, 180, 182.5, 185, 188, 190, 190, 192.5, 195, 198, 199.99, 200, 202.5, 205, 208, 210, 215, 219.99, 172.5,
    186,
  ].map((price, index) =>
    item(100 + index, 'Nintendo Switch OLED Console 64GB White Boxed', price, {
      postage: index % 3 === 0 ? 4.95 : 0,
      ageDays: 2 + (index % 20),
    }),
  );

  return [
    // The interesting ones: below market, real, each with its own catch.
    item(1, 'Nintendo Switch OLED Console 64GB White - untested, no charger', 92.0, {
      postage: 4.95,
      ageDays: 1,
      feedback: 11,
    }),
    item(2, 'Nintendo Switch OLED Console 64GB White with dock and cables', 118.5, { postage: 4.5, ageDays: 3 }),
    item(3, 'Nintendo Switch OLED Console 64GB', 104.0, { auction: true, bids: 9, ageDays: 4 }),
    item(4, 'Nintendo Switch OLED Console 64GB White - good condition, boxed', 129.99, { postage: 0, ageDays: 6 }),
    item(5, 'Nintendo Switch OLED Console 64GB - screen scratched, sold as seen', 88.0, { postage: 5.5, ageDays: 2 }),

    // Noise that must be kept out of the reference price.
    item(6, 'Nintendo Switch OLED carry case only - no console', 8.5, { ageDays: 8 }),
    item(7, 'Job lot 4 x Nintendo Switch consoles mixed condition', 620.0, { ageDays: 12 }),
    item(8, 'Nintendo Switch OLED - spares or repair, does not power on', 45.0, { ageDays: 9 }),
    item(9, 'Empty box for Nintendo Switch OLED console', 6.99, { ageDays: 14 }),

    ...market,
  ];
}

export const EXAMPLE_QUERY = 'nintendo switch oled console';

export function buildExampleAnalysis(
  preferences: SellingPreferences,
  criteria: SearchCriteria,
): AnalysisResult {
  return analyse({
    items: exampleListings(),
    query: EXAMPLE_QUERY,
    costs: preferences.costs,
    selling: {
      sellerType: preferences.sellerType,
      category: preferences.category,
      internationalSale: preferences.internationalSale,
      vatOnFeesIsACost: preferences.vatOnFeesIsACost,
      finalValueFeeRateOverride: preferences.finalValueFeeRateOverride,
    },
    targets: { minProfit: criteria.minProfitPence, minRoi: criteria.minRoi },
    maxPurchasePrice: criteria.maxPurchasePricePence,
  });
}

/** The description shown in the drawer for an example listing. */
export const EXAMPLE_DESCRIPTION =
  'Example listing text. In a live result this is the seller’s own description, ' +
  'converted to plain text. It is shown as information only: nothing written in a ' +
  'listing changes how this app calculates or behaves.';
