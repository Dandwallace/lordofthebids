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
import { useLocale } from '@/lib/i18n/context';

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
  const { t, site } = useLocale();
  const done = progress.filter((row) => row.status === 'done').length;
  const failed = progress.filter((row) => row.status === 'failed');

  return (
    <div className="stack" style={{ gap: 24 }}>
      <section className="hero">
        <div>
          <h1>{t('discover.title')}</h1>
          <p>{t('discover.intro')}</p>
        </div>
        {/* Decorative: the categories below carry the same meaning in text. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="hero__art" src="/brand/discover-hero.webp" alt="" width={1100} height={733} />
      </section>

      {/* --- Constraints ------------------------------------------------- */}
      <section className="card">
        <div className="card__header">
          <h2>{t('discover.limits')}</h2>
          <span className="tiny muted">{t('discover.limitsNote')}</span>
        </div>
        <div className="card__body">
          <div className="grid-3">
            <div className="field">
              <label htmlFor="d-max">{t('discover.maxPrice')}</label>
              <div className="input-prefix">
                <span className="input-prefix__symbol">{site.currencySymbol}</span>
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
              <p className="field__hint">{t('discover.maxPriceHint')}</p>
            </div>

            <div className="field">
              <label htmlFor="d-profit">{t('discover.minProfit')}</label>
              <div className="input-prefix">
                <span className="input-prefix__symbol">{site.currencySymbol}</span>
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
              <p className="field__hint">{t('discover.minProfitHint')}</p>
            </div>

            <div className="field">
              <label htmlFor="d-roi">{t('discover.minReturn')}</label>
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
              <p className="field__hint">{t('discover.minReturnHint')}</p>
            </div>
          </div>

          <hr className="divider" />

          <div className="grid-2">
            <div className="field">
              <label htmlFor="d-condition">{t('discover.condition')}</label>
              <select
                id="d-condition"
                value={criteria.condition}
                onChange={(event) =>
                  onCriteriaChange({ condition: event.target.value as SearchCriteria['condition'] })
                }
              >
                <option value="any">{t('condition.any')}</option>
                <option value="new">{t('condition.new')}</option>
                <option value="used">{t('condition.used')}</option>
                <option value="refurbished">{t('condition.refurbished')}</option>
                <option value="parts">{t('condition.parts')}</option>
              </select>
            </div>

            <div>
              <span className="field__label">{t('discover.preferences')}</span>
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
                  {t('discover.collect')}
                  <small>{t('discover.collectHint')}</small>
                </span>
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={discoverPrefs.preferSmallParcels}
                  onChange={(event) => onDiscoverPrefsChange({ preferSmallParcels: event.target.checked })}
                />
                <span className="check__text">
                  {t('discover.smallParcels')}
                  <small>{t('discover.smallParcelsHint')}</small>
                </span>
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={discoverPrefs.preferEasyTesting}
                  onChange={(event) => onDiscoverPrefsChange({ preferEasyTesting: event.target.checked })}
                />
                <span className="check__text">
                  {t('discover.easyTest')}
                  <small>{t('discover.easyTestHint')}</small>
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
                {loading ? t('discover.scanning') : t('discover.scanFinished')}
              </span>
              <span className="tiny muted num">
                {t('discover.searchesProgress', { done, total: progress.length })}
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
          <h2 style={{ fontSize: 17 }}>{t('discover.whereToStart')}</h2>
        </div>

        <div className="notice notice--info" style={{ marginBottom: 16 }}>
          <span className="notice__icon">
            <IconInfo />
          </span>
          <div>
            <div className="notice__title">{t('discover.suggestionsTitle')}</div>
            <div className="notice__body">{t('discover.suggestionsBody')}</div>
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
