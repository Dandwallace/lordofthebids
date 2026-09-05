'use client';

import { useState } from 'react';
import ResultsPanel from './ResultsPanel';
import SearchPanel from './SearchPanel';
import type { AnalysisResponse, SearchSettings } from '@/lib/types';

/** Mirrors MAX_PAGES in the Browse client, which is the server side cap. */
const MAX_PAGES = 5;

/**
 * Settings live in React state only. Nothing is written to localStorage,
 * so a reload is a clean slate.
 */
const DEFAULT_SETTINGS: SearchSettings = {
  query: '',
  condition: 'any',
  minPrice: null,
  maxPrice: null,
  pages: 2,
  sellerType: 'private',
  category: 'general',
  internationalSale: false,
  postageAndPackaging: 4,
  minProfit: 10,
  minReturnPct: 20,
};

export default function Workbench() {
  const [settings, setSettings] = useState<SearchSettings>(DEFAULT_SETTINGS);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(patch: Partial<SearchSettings>) {
    setSettings((current) => ({ ...current, ...patch }));
  }

  async function runSearch() {
    if (!settings.query.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        const message =
          payload && typeof payload === 'object' && 'error' in payload
            ? String((payload as { error: unknown }).error)
            : `Search failed with ${response.status}.`;
        setError(message);
        setResult(null);
        return;
      }

      setResult(payload as AnalysisResponse);
    } catch {
      setError('Could not reach the search endpoint.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app">
      <header className="masthead">
        <h1>Lord of the Bids</h1>
        <p>Active eBay UK listings, priced against their own distribution.</p>
      </header>

      <SearchPanel
        settings={settings}
        onChange={update}
        onSubmit={runSearch}
        loading={loading}
        maxPages={MAX_PAGES}
      />

      <section>
        <ResultsPanel result={result} loading={loading} error={error} />
      </section>

      <p className="footnote">
        There is no sold price data here. eBay&rsquo;s Marketplace Insights API is a limited release
        that individual developers are refused, so every figure on this page is derived from what
        other sellers are currently <em>asking</em>. Asking prices sit above selling prices, which is
        why the resale assumption is the 40th percentile rather than the median. Treat the profit
        column as a shortlist, not a promise, and read every listing before you bid.
      </p>
    </main>
  );
}
