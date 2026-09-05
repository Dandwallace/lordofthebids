'use client';

/**
 * Discover: the starting screen for someone who does not know what to
 * look for yet.
 *
 * You begin with your constraints, not a product name. The scan then
 * turns those into real searches against live listings.
 *
 * The honesty line this screen holds: the starter categories are curated
 * suggestions written by hand and are labelled as such. Anything with a
 * number attached comes from a scan of current listings. No demand
 * figure, sold price or opportunity score is invented for either.
 */

import { STARTER_CATEGORIES, type StarterCategory } from '@/lib/discover/starters';
import { toPence, toPounds } from '@/lib/money/money';
import type { SearchCriteria } from '@/lib/types';
import {
  IconCalculator,
  IconCamera,
  IconDice,
  IconGamepad,
  IconInfo,
  IconSearch,
  IconTool,
} from './Brand';
import type { ScanProgress } from './useScanner';

const ICONS = {
  gamepad: IconGamepad,
  calculator: IconCalculator,
  dice: IconDice,
  camera: IconCamera,
  tool: IconTool,
};

export interface DiscoverPreferences {
  canCollectLocally: boolean;
  preferSmallParcels: boolean;
  preferEasyTesting: boolean;
}

interface Props {
  criteria: SearchCriteria;
  onCriteriaChange: (patch: Partial<SearchCriteria>) => void;
  discoverPrefs: DiscoverPreferences;
  onDiscoverPrefsChange: (patch: Partial<DiscoverPreferences>) => void;
  onRunCategory: (category: StarterCategory) => void;
  onRunSearch: (query: string) => void;
  loading: boolean;
  progress: ScanProgress[];
}

function StarterCard({
  category,
  onRun,
  onRunSearch,
  loading,
}: {
  category: StarterCategory;
  onRun: () => void;
  onRunSearch: (query: string) => void;
  loading: boolean;
}) {
  const Icon = ICONS[category.icon];

  return (
    <div className="starter">
      <div className="starter__head">
        <span className="starter__icon">
          <Icon size={20} />
        </span>
        <div>
          <div className="starter__title">{category.title}</div>
          <span className="badge badge--neutral" style={{ marginTop: 4 }}>
            Starting point, not evidence
          </span>
        </div>
      </div>

      <p className="starter__why">{category.why}</p>

      <div className="starter__checks">
        <strong>What decides it:</strong>
        <ul className="bullets" style={{ marginTop: 4, fontSize: 12 }}>
          {category.checks.map((check) => (
            <li key={check}>{check}</li>
          ))}
        </ul>
      </div>

      <div className="starter__searches">
        {category.searches.slice(0, 3).map((search) => (
          <button
            key={search}
            type="button"
            className="starter__search"
            onClick={() => onRunSearch(search)}
            disabled={loading}
          >
            {search}
          </button>
        ))}
      </div>

      <button type="button" className="btn btn--secondary btn--block" onClick={onRun} disabled={loading}>
        <IconSearch size={15} />
        Scan this category
      </button>
    </div>
  );
}

export default function DiscoverView({
  criteria,
  onCriteriaChange,
  discoverPrefs,
  onDiscoverPrefsChange,
  onRunCategory,
  onRunSearch,
  loading,
  progress,
}: Props) {
  const done = progress.filter((row) => row.status === 'done').length;
  const failed = progress.filter((row) => row.status === 'failed');

  return (
    <div className="stack" style={{ gap: 24 }}>
      <section className="hero">
        <div>
          <h1>Start with what you can spend</h1>
          <p>
            Set your limits, then scan a category to see what is currently listed below what the rest of
            the market is asking. You do not need to know the products: each category explains what makes
            it worth a look and what to check before you buy.
          </p>
        </div>
        {/* Decorative: the categories below carry the same meaning in text. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="hero__art" src="/brand/discover-hero.webp" alt="" width={1100} height={733} />
      </section>

      {/* --- Constraints ------------------------------------------------- */}
      <section className="card">
        <div className="card__header">
          <h2>Your limits</h2>
          <span className="tiny muted">Used by every scan</span>
        </div>
        <div className="card__body">
          <div className="grid-3">
            <div className="field">
              <label htmlFor="d-max">Maximum purchase price</label>
              <div className="input-prefix">
                <span className="input-prefix__symbol">£</span>
                <input
                  id="d-max"
                  type="number"
                  min="0"
                  step="5"
                  inputMode="decimal"
                  placeholder="Any"
                  value={criteria.maxPurchasePricePence === null ? '' : toPounds(criteria.maxPurchasePricePence)}
                  onChange={(event) => {
                    const raw = event.target.value.trim();
                    onCriteriaChange({
                      maxPurchasePricePence: raw === '' ? null : toPence(Number(raw) || 0),
                    });
                  }}
                />
              </div>
              <p className="field__hint">The most you will pay for one item.</p>
            </div>

            <div className="field">
              <label htmlFor="d-profit">Minimum profit</label>
              <div className="input-prefix">
                <span className="input-prefix__symbol">£</span>
                <input
                  id="d-profit"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="decimal"
                  value={toPounds(criteria.minProfitPence)}
                  onChange={(event) => onCriteriaChange({ minProfitPence: toPence(Number(event.target.value) || 0) })}
                />
              </div>
              <p className="field__hint">After every fee and cost.</p>
            </div>

            <div className="field">
              <label htmlFor="d-roi">Minimum return</label>
              <div className="input-suffix">
                <span className="input-suffix__symbol">%</span>
                <input
                  id="d-roi"
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
              <p className="field__hint">Profit as a share of what you pay out.</p>
            </div>
          </div>

          <hr className="divider" />

          <div className="grid-2">
            <div className="field">
              <label htmlFor="d-condition">Condition</label>
              <select
                id="d-condition"
                value={criteria.condition}
                onChange={(event) =>
                  onCriteriaChange({ condition: event.target.value as SearchCriteria['condition'] })
                }
              >
                <option value="any">Any condition</option>
                <option value="new">New</option>
                <option value="used">Used</option>
                <option value="refurbished">Refurbished</option>
                <option value="parts">For parts or not working</option>
              </select>
            </div>

            <div>
              <span className="field__label">Preferences</span>
              <label className="check">
                <input
                  type="checkbox"
                  checked={discoverPrefs.canCollectLocally}
                  onChange={(event) => {
                    onDiscoverPrefsChange({ canCollectLocally: event.target.checked });
                    onCriteriaChange({ delivery: event.target.checked ? 'collectionAvailable' : 'any' });
                  }}
                />
                <span className="check__text">
                  I can collect locally
                  <small>Includes listings offering collection, which are often cheaper.</small>
                </span>
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={discoverPrefs.preferSmallParcels}
                  onChange={(event) => onDiscoverPrefsChange({ preferSmallParcels: event.target.checked })}
                />
                <span className="check__text">
                  Prefer small parcels
                  <small>Favours categories that post cheaply.</small>
                </span>
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={discoverPrefs.preferEasyTesting}
                  onChange={(event) => onDiscoverPrefsChange({ preferEasyTesting: event.target.checked })}
                />
                <span className="check__text">
                  Prefer items that are easy to test
                  <small>Favours things you can check works in a minute.</small>
                </span>
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* --- Progress ---------------------------------------------------- */}
      {progress.length > 0 && (loading || failed.length > 0) ? (
        <section className="card">
          <div className="card__body">
            <div className="row row--between" style={{ marginBottom: 12 }}>
              <span className="section-label">
                {loading ? 'Scanning' : 'Scan finished'}
              </span>
              <span className="tiny muted num">
                {done} of {progress.length} searches
              </span>
            </div>
            <div className="progress">
              <div className="progress__track">
                <div
                  className="progress__bar"
                  style={{ width: `${(progress.filter((r) => r.status !== 'pending' && r.status !== 'running').length / progress.length) * 100}%` }}
                />
              </div>
              <div className="progress__rows">
                {progress.map((row) => (
                  <div
                    key={row.query}
                    className={`progress__row ${row.status === 'failed' ? 'progress__row--failed' : ''} ${
                      row.status === 'done' ? 'progress__row--done' : ''
                    }`}
                  >
                    {row.status === 'running' ? <span className="spinner spinner--dark" aria-hidden="true" /> : null}
                    <span style={{ flex: 1 }}>{row.query}</span>
                    <span className="tiny">
                      {row.status === 'done'
                        ? `${row.found} worth a look`
                        : row.status === 'failed'
                          ? (row.error ?? 'failed')
                          : row.status === 'running'
                            ? 'searching'
                            : 'queued'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {failed.length > 0 && !loading ? (
              <p className="field__hint" style={{ marginTop: 10 }}>
                {failed.length} search{failed.length === 1 ? '' : 'es'} did not complete. The results below
                cover the rest.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* --- Starter categories ------------------------------------------ */}
      <section>
        <div className="row row--between" style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 17 }}>Where to start looking</h2>
        </div>

        <div className="notice notice--info" style={{ marginBottom: 16 }}>
          <span className="notice__icon">
            <IconInfo />
          </span>
          <div>
            <div className="notice__title">These are suggestions, not findings</div>
            <div className="notice__body">
              The categories below are hand written starting points chosen because they are easy to
              identify and check. Nothing here claims that a product is in demand or that it sells for a
              particular price. Numbers only appear once you run a scan, and they come from what is listed
              right now.
            </div>
          </div>
        </div>

        <div className="starter-grid">
          {STARTER_CATEGORIES.map((category) => (
            <StarterCard
              key={category.id}
              category={category}
              loading={loading}
              onRun={() => onRunCategory(category)}
              onRunSearch={onRunSearch}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
