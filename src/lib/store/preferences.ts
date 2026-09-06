/**
 * Selling preferences and search criteria, remembered between visits.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_COSTS } from '../money/deal';
import type { SearchCriteria, SellingPreferences } from '../types';
import { readJson, writeJson } from './storage';

/**
 * Private is the default. Private sellers have paid no final value fee on
 * eligible domestic sales since 1 October 2024, so defaulting to business
 * would deduct fees that are not charged and understate profit on every
 * scan. Switch to business in Settings if you sell on a business account.
 */
export const DEFAULT_PREFERENCES: SellingPreferences = {
  marketplaceId: 'EBAY_GB',
  language: 'en',
  sellerType: 'private',
  category: 'general',
  internationalSale: false,
  vatOnFeesIsACost: true,
  finalValueFeeRateOverride: null,
  costs: DEFAULT_COSTS,
};

export const DEFAULT_CRITERIA: SearchCriteria = {
  maxPurchasePricePence: 15000,
  minProfitPence: 1000,
  minRoi: 0.3,
  condition: 'any',
  buyingFormat: 'any',
  delivery: 'any',
  depth: 'standard',
  excludeTerms: '',
  referenceMinPricePence: null,
  referenceMaxPricePence: null,
};

/**
 * State that persists to this browser. Reads happen after mount so the
 * server rendered markup and the first client render always agree.
 */
export function usePersistentState<T extends object>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setValue(readJson<T>(key, fallback));
    setHydrated(true);
    // The key identifies the slot; fallback is a stable module constant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (patch: Partial<T>) => {
      setValue((current) => {
        const next = { ...current, ...patch };
        writeJson(key, next);
        return next;
      });
    },
    [key],
  );

  const replace = useCallback(
    (next: T) => {
      setValue(next);
      writeJson(key, next);
    },
    [key],
  );

  return { value, update, replace, hydrated };
}
