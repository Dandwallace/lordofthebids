'use client';

/**
 * The search bar, the advanced filters, and the chips that show what is
 * currently applied.
 *
 * The one thing this file is careful about: "maximum purchase price" is a
 * filter on what YOU will buy. It is presented separately from the
 * "reference price range", which bounds the comparison set. Merging them
 * is the mistake that makes cheap listings look like bargains, because
 * they end up compared only against other cheap listings.
 */

import { useState } from 'react';
import {
  CONDITION_LABELS,
  DELIVERY_LABELS,
  FORMAT_LABELS,
  SEARCH_DEPTH_INFO,
  type BuyingFormat,
  type ConditionFilter,
  type DeliveryPreference,
  type SearchDepth,
} from '@/lib/ebay/browse-types';
import { toPence, toPounds } from '@/lib/money/money';
import type { SearchCriteria } from '@/lib/types';
import { IconChevronRight, IconSearch } from './Brand';

export interface ActiveFilter {
  key: string;
  label: string;
  clear: () => void;
}

/** Builds the chip list from whatever is actually set. */
export function activeFilters(criteria: SearchCriteria, update: (patch: Partial<SearchCriteria>) => void): ActiveFilter[] {
  const chips: ActiveFilter[] = [];

  if (criteria.condition !== 'any') {
    chips.push({
      key: 'condition',
      label: CONDITION_LABELS[criteria.condition],
      clear: () => update({ condition: 'any' }),
    });
  }
  if (criteria.buyingFormat !== 'any') {
    chips.push({
      key: 'format',
      label: FORMAT_LABELS[criteria.buyingFormat],
      clear: () => update({ buyingFormat: 'any' }),
    });
  }
  if (criteria.delivery !== 'any') {
    chips.push({
      key: 'delivery',
      label: DELIVERY_LABELS[criteria.delivery],
      clear: () => update({ delivery: 'any' }),
    });
  }
  if (criteria.maxPurchasePricePence !== null) {
    chips.push({
      key: 'maxPrice',
      label: `Buy under £${toPounds(criteria.maxPurchasePricePence).toFixed(0)}`,
      clear: () => update({ maxPurchasePricePence: null }),
    });
  }
  if (criteria.minProfitPence > 0) {
    chips.push({
      key: 'minProfit',
      label: `Profit £${toPounds(criteria.minProfitPence).toFixed(0)}+`,
      clear: () => update({ minProfitPence: 0 }),
    });
  }
  if (criteria.minRoi > 0) {
    chips.push({
      key: 'minRoi',
      label: `ROI ${Math.round(criteria.minRoi * 100)}%+`,
      clear: () => update({ minRoi: 0 }),
    });
  }
  if (criteria.excludeTerms.trim()) {
    chips.push({
      key: 'exclude',
      label: `Excluding: ${criteria.excludeTerms.trim().slice(0, 30)}`,
      clear: () => update({ excludeTerms: '' }),
    });
  }
  if (criteria.referenceMinPricePence !== null || criteria.referenceMaxPricePence !== null) {
    const from = criteria.referenceMinPricePence ? `£${toPounds(criteria.referenceMinPricePence).toFixed(0)}` : '';
    const to = criteria.referenceMaxPricePence ? `£${toPounds(criteria.referenceMaxPricePence).toFixed(0)}` : '';
    chips.push({
      key: 'reference',
      label: `Comparison ${from}–${to}`,
      clear: () => update({ referenceMinPricePence: null, referenceMaxPricePence: null }),
    });
  }
  if (criteria.depth !== 'standard') {
    chips.push({
      key: 'depth',
      label: `${SEARCH_DEPTH_INFO[criteria.depth].label} search`,
      clear: () => update({ depth: 'standard' }),
    });
  }

  return chips;
}

function PoundsField({
  id,
  label,
  hint,
  pence,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  hint?: string;
  pence: number | null;
  onChange: (pence: number | null) => void;
  placeholder?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-prefix">
        <span className="input-prefix__symbol">£</span>
        <input
          id={id}
          type="number"
          min="0"
          step="1"
          inputMode="decimal"
          placeholder={placeholder ?? 'Any'}
          value={pence === null ? '' : toPounds(pence)}
          onChange={(event) => {
            const raw = event.target.value.trim();
            if (raw === '') return onChange(null);
            const parsed = Number(raw);
            onChange(Number.isFinite(parsed) && parsed >= 0 ? toPence(parsed) : null);
          }}
        />
      </div>
      {hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}

interface Props {
  query: string;
  onQueryChange: (value: string) => void;
  criteria: SearchCriteria;
  onCriteriaChange: (patch: Partial<SearchCriteria>) => void;
  onSubmit: () => void;
  loading: boolean;
  onClearFilters: () => void;
}

export default function SearchControls({
  query,
  onQueryChange,
  criteria,
  onCriteriaChange,
  onSubmit,
  loading,
  onClearFilters,
}: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const chips = activeFilters(criteria, onCriteriaChange);

  return (
    <form
      className="card"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="card__body">
        {/* The main action stays at the top, always reachable. */}
        <div className="searchbar">
          <div className="searchbar__input">
            <span className="searchbar__icon">
              <IconSearch size={18} />
            </span>
            <input
              type="search"
              aria-label="Search term or eBay listing link"
              placeholder="Product name, or paste an eBay listing link"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="searchbar__condition">
            <label className="visually-hidden" htmlFor="condition-quick">
              Condition
            </label>
            <select
              id="condition-quick"
              value={criteria.condition}
              onChange={(event) => onCriteriaChange({ condition: event.target.value as ConditionFilter })}
            >
              {(Object.keys(CONDITION_LABELS) as ConditionFilter[]).map((key) => (
                <option key={key} value={key}>
                  {CONDITION_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn--primary btn--large" disabled={loading}>
            {loading ? <span className="spinner" aria-hidden="true" /> : <IconSearch size={18} />}
            {loading ? 'Scanning' : 'Scan'}
          </button>
        </div>

        {chips.length > 0 ? (
          <div className="chips" style={{ marginTop: 16 }}>
            <span className="section-label">Filters</span>
            {chips.map((chip) => (
              <span key={chip.key} className="chip">
                {chip.label}
                <button type="button" onClick={chip.clear} aria-label={`Remove filter: ${chip.label}`}>
                  ×
                </button>
              </span>
            ))}
            <button type="button" className="btn btn--ghost btn--small" onClick={onClearFilters}>
              Clear filters
            </button>
          </div>
        ) : null}

        <div className="disclosure">
          <button
            type="button"
            className="disclosure__toggle"
            aria-expanded={showAdvanced}
            onClick={() => setShowAdvanced((open) => !open)}
          >
            <span className={`disclosure__chevron ${showAdvanced ? 'disclosure__chevron--open' : ''}`}>
              <IconChevronRight size={14} />
            </span>
            More filters
          </button>

          {showAdvanced ? (
            <div className="disclosure__panel stack" style={{ gap: 20 }}>
              <div>
                <div className="section-label" style={{ marginBottom: 10 }}>
                  What you will buy
                </div>
                <div className="grid-3">
                  <PoundsField
                    id="max-purchase"
                    label="Maximum purchase price"
                    hint="Applies to the listings you see, not to the market they are compared against."
                    pence={criteria.maxPurchasePricePence}
                    onChange={(value) => onCriteriaChange({ maxPurchasePricePence: value })}
                  />
                  <PoundsField
                    id="min-profit"
                    label="Minimum profit"
                    pence={criteria.minProfitPence}
                    onChange={(value) => onCriteriaChange({ minProfitPence: value ?? 0 })}
                  />
                  <div className="field">
                    <label htmlFor="min-roi">Minimum return</label>
                    <div className="input-suffix">
                      <span className="input-suffix__symbol">%</span>
                      <input
                        id="min-roi"
                        type="number"
                        min="0"
                        step="5"
                        inputMode="numeric"
                        value={Math.round(criteria.minRoi * 100)}
                        onChange={(event) => {
                          const parsed = Number(event.target.value);
                          onCriteriaChange({ minRoi: Number.isFinite(parsed) ? Math.max(0, parsed) / 100 : 0 });
                        }}
                      />
                    </div>
                    <p className="field__hint">Profit as a share of everything you pay out.</p>
                  </div>
                </div>
              </div>

              <div>
                <div className="section-label" style={{ marginBottom: 10 }}>
                  Which listings
                </div>
                <div className="grid-3">
                  <div className="field">
                    <label htmlFor="format">Buying format</label>
                    <select
                      id="format"
                      value={criteria.buyingFormat}
                      onChange={(event) => onCriteriaChange({ buyingFormat: event.target.value as BuyingFormat })}
                    >
                      {(Object.keys(FORMAT_LABELS) as BuyingFormat[]).map((key) => (
                        <option key={key} value={key}>
                          {FORMAT_LABELS[key]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="delivery">Delivery</label>
                    <select
                      id="delivery"
                      value={criteria.delivery}
                      onChange={(event) => onCriteriaChange({ delivery: event.target.value as DeliveryPreference })}
                    >
                      {(Object.keys(DELIVERY_LABELS) as DeliveryPreference[]).map((key) => (
                        <option key={key} value={key}>
                          {DELIVERY_LABELS[key]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="exclude">Exclude keywords</label>
                    <input
                      id="exclude"
                      type="text"
                      placeholder="broken, faulty, case"
                      value={criteria.excludeTerms}
                      onChange={(event) => onCriteriaChange({ excludeTerms: event.target.value })}
                    />
                    <p className="field__hint">Comma separated. Any title containing one is dropped.</p>
                  </div>
                </div>
              </div>

              <div>
                <div className="section-label" style={{ marginBottom: 10 }}>
                  Comparison set
                </div>
                <p className="field__hint" style={{ marginBottom: 10 }}>
                  Bounds the listings used to work out what the item is worth. Leave both blank unless a
                  search is pulling in a different class of product entirely.
                </p>
                <div className="grid-3">
                  <PoundsField
                    id="ref-min"
                    label="Comparison price from"
                    pence={criteria.referenceMinPricePence}
                    onChange={(value) => onCriteriaChange({ referenceMinPricePence: value })}
                  />
                  <PoundsField
                    id="ref-max"
                    label="Comparison price to"
                    pence={criteria.referenceMaxPricePence}
                    onChange={(value) => onCriteriaChange({ referenceMaxPricePence: value })}
                  />
                  <div className="field">
                    <label htmlFor="depth">Search depth</label>
                    <select
                      id="depth"
                      value={criteria.depth}
                      onChange={(event) => onCriteriaChange({ depth: event.target.value as SearchDepth })}
                    >
                      {(Object.keys(SEARCH_DEPTH_INFO) as SearchDepth[]).map((key) => (
                        <option key={key} value={key}>
                          {SEARCH_DEPTH_INFO[key].label}
                        </option>
                      ))}
                    </select>
                    <p className="field__hint">{SEARCH_DEPTH_INFO[criteria.depth].description}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </form>
  );
}
