'use client';

/**
 * One context carrying everything that varies by marketplace and language.
 *
 * Language and currency are deliberately bundled: a component that shows
 * a price almost always shows a label next to it, and splitting them into
 * two contexts invites the bug where the words switch to Spanish while
 * the money stays in pounds.
 */

import { createContext, useContext, useMemo } from 'react';
import { marketplace, type Marketplace, type MarketplaceId } from '../ebay/marketplaces';
import type { MoneyFormat } from '../money/money';
import { translate, type Language, type TranslationKey } from './dictionary';

interface AppLocale {
  language: Language;
  site: Marketplace;
  money: MoneyFormat;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
}

const FALLBACK: AppLocale = {
  language: 'en',
  site: marketplace('EBAY_GB'),
  money: { currency: 'GBP', locale: 'en-GB' },
  t: (key, values) => translate('en', key, values),
};

const LocaleContext = createContext<AppLocale>(FALLBACK);

export function LocaleProvider({
  language,
  marketplaceId,
  children,
}: {
  language: Language;
  marketplaceId: MarketplaceId;
  children: React.ReactNode;
}) {
  const value = useMemo<AppLocale>(() => {
    const site = marketplace(marketplaceId);
    return {
      language,
      site,
      // Money is always formatted in the marketplace's currency, but with
      // the reader's chosen language, so a Spaniard reading English still
      // sees euros and a Briton reading Spanish still sees pounds.
      money: { currency: site.currency, locale: site.locale },
      t: (key, values) => translate(language, key, values),
    };
  }, [language, marketplaceId]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): AppLocale {
  return useContext(LocaleContext);
}

/** Shorthand for the common case of only needing the translator. */
export function useT() {
  return useLocale().t;
}
