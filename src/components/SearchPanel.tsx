'use client';

import { EBAY_UK_FEES, type CategoryKey, type SellerType } from '@/lib/pricing/fees';
import type { ConditionFilter, SearchSettings } from '@/lib/types';

const CONDITION_OPTIONS: { value: ConditionFilter; label: string }[] = [
  { value: 'any', label: 'Any condition' },
  { value: 'new', label: 'New' },
  { value: 'refurbished', label: 'Refurbished' },
  { value: 'used', label: 'Used' },
  { value: 'parts', label: 'For parts or not working' },
];

const CATEGORY_OPTIONS = (Object.entries(EBAY_UK_FEES.categories) as [
  CategoryKey,
  { label: string },
][]).map(([value, profile]) => ({ value, label: profile.label }));

interface Props {
  settings: SearchSettings;
  onChange: (patch: Partial<SearchSettings>) => void;
  onSubmit: () => void;
  loading: boolean;
  maxPages: number;
}

export default function SearchPanel({ settings, onChange, onSubmit, loading, maxPages }: Props) {
  return (
    <form
      className="panel panel--sticky"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <fieldset className="fieldset">
        <legend>Search</legend>

        <div className="field">
          <label htmlFor="query">Search term</label>
          <input
            id="query"
            type="text"
            value={settings.query}
            placeholder="e.g. dyson v10 animal"
            onChange={(event) => onChange({ query: event.target.value })}
            required
          />
          <p className="hint">
            Be specific. A vague term mixes different products together and wrecks the comparison.
          </p>
        </div>

        <div className="field">
          <label htmlFor="condition">Condition</label>
          <select
            id="condition"
            value={settings.condition}
            onChange={(event) => onChange({ condition: event.target.value as ConditionFilter })}
          >
            {CONDITION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Price range (£)</label>
          <div className="field-row">
            <input
              type="number"
              min={0}
              step="1"
              placeholder="min"
              aria-label="Minimum price"
              value={settings.minPrice ?? ''}
              onChange={(event) =>
                onChange({ minPrice: event.target.value === '' ? null : Number(event.target.value) })
              }
            />
            <input
              type="number"
              min={0}
              step="1"
              placeholder="max"
              aria-label="Maximum price"
              value={settings.maxPrice ?? ''}
              onChange={(event) =>
                onChange({ maxPrice: event.target.value === '' ? null : Number(event.target.value) })
              }
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="pages">Pages to pull</label>
          <select
            id="pages"
            value={settings.pages}
            onChange={(event) => onChange({ pages: Number(event.target.value) })}
          >
            {Array.from({ length: maxPages }, (_, index) => index + 1).map((page) => (
              <option key={page} value={page}>
                {page} {page === 1 ? 'page' : 'pages'} — up to {page * 200} listings
              </option>
            ))}
          </select>
          <p className="hint">
            Each page is one eBay API call. The whole app gets 5,000 calls a day.
          </p>
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend>Your selling costs</legend>

        <div className="field">
          <label id="seller-type-label">Seller type</label>
          <div className="toggle" role="group" aria-labelledby="seller-type-label">
            {(['private', 'business'] as SellerType[]).map((type) => (
              <button
                key={type}
                type="button"
                aria-pressed={settings.sellerType === type}
                onClick={() => onChange({ sellerType: type })}
              >
                {type === 'private' ? 'Private' : 'Business'}
              </button>
            ))}
          </div>
          <p className="hint">
            {settings.sellerType === 'private'
              ? 'No final value fee, per order fee or regulatory fee on eligible domestic sales. The Buyer Protection fee is paid by the buyer, so it is not deducted.'
              : 'Final value fee by category, plus a per order fee, a 0.35% regulatory fee and 20% VAT on all fees.'}
          </p>
        </div>

        <div className="field">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={settings.category}
            onChange={(event) => onChange({ category: event.target.value as CategoryKey })}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="hint">
            Sets the business final value fee, and the authenticity checked fee private sellers still pay
            above the category threshold.
          </p>
        </div>

        <div className="field">
          <label className="checkbox" htmlFor="international">
            <input
              id="international"
              type="checkbox"
              checked={settings.internationalSale}
              onChange={(event) => onChange({ internationalSale: event.target.checked })}
            />
            <span>Assume an international sale (adds 3%)</span>
          </label>
        </div>

        <div className="field">
          <label htmlFor="pp">Postage and packaging (£)</label>
          <input
            id="pp"
            type="number"
            min={0}
            step="0.01"
            value={settings.postageAndPackaging}
            onChange={(event) => onChange({ postageAndPackaging: Number(event.target.value) })}
          />
          <p className="hint">What it costs you to post and pack it when you resell.</p>
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend>Thresholds</legend>

        <div className="field-row">
          <div className="field">
            <label htmlFor="minProfit">Min profit (£)</label>
            <input
              id="minProfit"
              type="number"
              step="1"
              value={settings.minProfit}
              onChange={(event) => onChange({ minProfit: Number(event.target.value) })}
            />
          </div>
          <div className="field">
            <label htmlFor="minReturn">Min return (%)</label>
            <input
              id="minReturn"
              type="number"
              step="1"
              value={settings.minReturnPct}
              onChange={(event) => onChange({ minReturnPct: Number(event.target.value) })}
            />
          </div>
        </div>
      </fieldset>

      <button className="submit" type="submit" disabled={loading}>
        {loading ? 'Scanning…' : 'Scan eBay UK'}
      </button>

      <p className="budget">
        Fee rates last checked {EBAY_UK_FEES.lastVerified}. Rates change, verify before you buy.
      </p>
    </form>
  );
}
