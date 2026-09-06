'use client';

/**
 * Selling preferences and technical settings, kept out of the main
 * workspace because they are set once and then rarely touched.
 */

import { CATEGORY_KEYS, feeRulesFor, type CategoryKey } from '@/lib/money/fees';
import type { ConnectionStatus, SellingPreferences } from '@/lib/types';
import { toPence, toPounds } from '@/lib/money/money';
import { IconInfo, IconWarning } from './Brand';
import { useLocale } from '@/lib/i18n/context';
import { LANGUAGES } from '@/lib/i18n/dictionary';
import { MARKETPLACES, MARKETPLACE_IDS, type MarketplaceId } from '@/lib/ebay/marketplaces';
import { formatDateTime } from './format';

interface Props {
  preferences: SellingPreferences;
  onChange: (patch: Partial<SellingPreferences>) => void;
  connection: ConnectionStatus | null;
  lastRefreshedAt: string | null;
}

function MoneyField({
  id,
  label,
  hint,
  pence,
  onChange,
  symbol,
}: {
  symbol: string;
  id: string;
  label: string;
  hint?: string;
  pence: number;
  onChange: (pence: number) => void;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-prefix">
        <span className="input-prefix__symbol">{symbol}</span>
        <input
          id={id}
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={toPounds(pence)}
          onChange={(event) => onChange(toPence(Number(event.target.value) || 0))}
        />
      </div>
      {hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}

export default function SettingsPanel({ preferences, onChange, connection, lastRefreshedAt }: Props) {
  const { t, site } = useLocale();
  const rules = feeRulesFor(preferences.marketplaceId);
  const costs = preferences.costs;

  function patchCosts(patch: Partial<SellingPreferences['costs']>) {
    onChange({ costs: { ...costs, ...patch } });
  }

  return (
    <div className="stack" style={{ gap: 24 }}>
      {/* --- Region, language and currency ------------------------------
          Three separate concerns, presented as three rows rather than
          bundled, because they are easy to confuse: the region decides
          what is searched and how fees are charged, the language changes
          only the words, and the currency follows the region.
      */}
      <div className="settings-group">
        <div className="settings-group__title">{t('settings.regionGroup')}</div>
        <p className="settings-group__intro">{t('settings.regionGroupIntro')}</p>

        {/* 1. eBay region */}
        <div className="field" style={{ marginBottom: 18 }}>
          <label htmlFor="marketplace">{t('settings.region')}</label>
          <select
            id="marketplace"
            value={preferences.marketplaceId}
            onChange={(event) => onChange({ marketplaceId: event.target.value as MarketplaceId })}
          >
            {MARKETPLACE_IDS.map((id) => (
              <option key={id} value={id}>
                {MARKETPLACES[id].label}
              </option>
            ))}
          </select>
          <p className="field__hint">{t('settings.regionHint')}</p>
        </div>

        {/* 2. Interface language, deliberately independent of the region */}
        <div className="field" style={{ marginBottom: 18 }}>
          <span className="field__label" id="language-label">
            {t('settings.language')}
          </span>
          <div className="segmented segmented--block" role="group" aria-labelledby="language-label">
            {LANGUAGES.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={preferences.language === option.id}
                onClick={() => onChange({ language: option.id })}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="field__hint">{t('settings.languageIntro')}</p>
        </div>

        {/* 3. Currency. Shown as its own row so it is visible rather than
            implied, but not editable: converting would need an exchange
            rate, and there is no source for one here. */}
        <div className="field">
          <span className="field__label" id="currency-label">
            {t('settings.currency')}
          </span>
          <div className="rule-version" aria-labelledby="currency-label" style={{ marginTop: 0 }}>
            <span className="num" style={{ fontWeight: 700, fontSize: 15 }}>
              {site.currencySymbol} {site.currency}
            </span>
            <span className="muted">· {t('settings.currencyFixed')}</span>
          </div>
          <p className="field__hint">{t('settings.currencyHint')}</p>
        </div>

        <div className="notice notice--caution" style={{ marginTop: 16 }}>
          <span className="notice__icon">
            <IconWarning />
          </span>
          <div>
            <div className="notice__title">{t('settings.marketplaceWarning')}</div>
            <div className="notice__body">{t('settings.marketplaceWarningBody')}</div>
          </div>
        </div>
      </div>

      {/* --- How you sell ---------------------------------------------- */}
      <div className="settings-group">
        <div className="settings-group__title">{t('settings.howYouSell')}</div>
        <p className="settings-group__intro">{t('settings.howYouSellIntro')}</p>

        <div className="field" style={{ marginBottom: 16 }}>
          <span className="field__label" id="seller-type-label">
            {t('settings.sellerType')}
          </span>
          <div className="segmented segmented--block" role="group" aria-labelledby="seller-type-label">
            <button
              type="button"
              aria-pressed={preferences.sellerType === 'business'}
              onClick={() => onChange({ sellerType: 'business' })}
            >
              {t('settings.business')}
            </button>
            <button
              type="button"
              aria-pressed={preferences.sellerType === 'private'}
              onClick={() => onChange({ sellerType: 'private' })}
            >
              {t('settings.private')}
            </button>
          </div>
          {/* Region specific: the UK nil fee position for private sellers
              is not true in Spain, so this must never be a single string. */}
          <p className="field__hint">
            {t(
              `settings.hint.${preferences.sellerType}.${preferences.marketplaceId}` as 'settings.hint.private.EBAY_GB',
            )}
          </p>
        </div>

        <div className="field" style={{ marginBottom: 16 }}>
          <label htmlFor="category">{t('settings.category')}</label>
          <select
            id="category"
            value={preferences.category}
            onChange={(event) => onChange({ category: event.target.value as CategoryKey })}
          >
            {CATEGORY_KEYS.map((key) => (
              <option key={key} value={key}>
                {rules.categories[key].label}
              </option>
            ))}
          </select>
          <p className="field__hint">{t('settings.categoryHint')}</p>
        </div>

        <label className="check">
          <input
            type="checkbox"
            checked={preferences.vatOnFeesIsACost}
            onChange={(event) => onChange({ vatOnFeesIsACost: event.target.checked })}
          />
          <span className="check__text">
            {t('settings.vatCost')}
            <small>{t('settings.vatCostHint')}</small>
          </span>
        </label>

        <label className="check">
          <input
            type="checkbox"
            checked={preferences.internationalSale}
            onChange={(event) => onChange({ internationalSale: event.target.checked })}
          />
          <span className="check__text">
            {t('settings.international')}
            <small>{t('settings.internationalHint')}</small>
          </span>
        </label>

        <div className="field" style={{ marginTop: 8 }}>
          <label htmlFor="fvf-override">{t('settings.feeOverride')}</label>
          <div className="input-suffix">
            <span className="input-suffix__symbol">%</span>
            <input
              id="fvf-override"
              type="number"
              min="0"
              max="50"
              step="0.1"
              inputMode="decimal"
              placeholder={t('settings.useCategoryRate')}
              value={
                preferences.finalValueFeeRateOverride === null
                  ? ''
                  : (preferences.finalValueFeeRateOverride * 100).toFixed(1)
              }
              onChange={(event) => {
                const raw = event.target.value.trim();
                if (raw === '') return onChange({ finalValueFeeRateOverride: null });
                const parsed = Number(raw);
                onChange({
                  finalValueFeeRateOverride:
                    Number.isFinite(parsed) && parsed >= 0 && parsed <= 50 ? parsed / 100 : null,
                });
              }}
            />
          </div>
          <p className="field__hint">{t('settings.feeOverrideHint')}</p>
        </div>

        <div className="rule-version" style={{ marginTop: 12 }}>
          <IconInfo size={14} />
          <span>
            {site.id} · {rules.version}, {rules.verifiedOn}. {rules.verifiedAgainst}
          </span>
        </div>
      </div>

      {/* --- Your costs -------------------------------------------------- */}
      <div className="settings-group">
        <div className="settings-group__title">{t('settings.yourCosts')}</div>
        <p className="settings-group__intro">{t('settings.yourCostsIntro')}</p>

        <div className="grid-2">
          <MoneyField
            id="outbound"
            symbol={site.currencySymbol}
            label={t('settings.postageOut')}
            pence={costs.outboundPostage}
            onChange={(value) => patchCosts({ outboundPostage: value })}
          />
          <MoneyField
            id="packaging"
            symbol={site.currencySymbol}
            label={t('settings.packaging')}
            pence={costs.packaging}
            onChange={(value) => patchCosts({ packaging: value })}
          />
          <MoneyField
            id="preparation"
            symbol={site.currencySymbol}
            label={t('settings.preparation')}
            hint={t('settings.preparationHint')}
            pence={costs.preparation}
            onChange={(value) => patchCosts({ preparation: value })}
          />
          <MoneyField
            id="repair"
            symbol={site.currencySymbol}
            label={t('settings.repair')}
            hint={t('settings.repairHint')}
            pence={costs.repairAllowance}
            onChange={(value) => patchCosts({ repairAllowance: value })}
          />
        </div>

        <div className="field" style={{ marginTop: 16 }}>
          <label htmlFor="loss">{t('settings.lossAllowance')}</label>
          <div className="input-suffix">
            <span className="input-suffix__symbol">%</span>
            <input
              id="loss"
              type="number"
              min="0"
              max="90"
              step="1"
              inputMode="numeric"
              value={Math.round(costs.lossAllowanceRate * 100)}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                patchCosts({
                  lossAllowanceRate: Number.isFinite(parsed) ? Math.min(0.9, Math.max(0, parsed / 100)) : 0,
                });
              }}
            />
          </div>
          <p className="field__hint">{t('settings.lossAllowanceHint')}</p>
        </div>
      </div>

      {/* --- Data sources ------------------------------------------------ */}
      <div className="settings-group">
        <div className="settings-group__title">{t('settings.dataSources')}</div>
        <p className="settings-group__intro">{t('settings.dataSourcesIntro')}</p>

        <div className="breakdown">
          <div className="breakdown__row">
            <span className="breakdown__label">
              eBay Browse API
              <span className="breakdown__basis">Active listings. This is the only live source in use.</span>
            </span>
            <span className="breakdown__value">
              <span className={`badge ${connection?.configured ? 'badge--positive' : 'badge--negative'}`}>
                {connection?.configured ? 'Connected' : 'Not set up'}
              </span>
            </span>
          </div>
          <div className="breakdown__row">
            <span className="breakdown__label">
              Sold prices and demand
              <span className="breakdown__basis">
                eBay&rsquo;s Marketplace Insights API is a limited release and is not available to this app,
                so no sold price, sell through rate or selling time is shown anywhere.
              </span>
            </span>
            <span className="breakdown__value">
              <span className="badge badge--neutral">Unavailable</span>
            </span>
          </div>
          <div className="breakdown__row">
            <span className="breakdown__label">
              Third party research tools
              <span className="breakdown__basis">
                Not connected. A subscription to a research tool does not by itself grant the right to
                pull its data into another application, so none is used until that permission is
                established in writing.
              </span>
            </span>
            <span className="breakdown__value">
              <span className="badge badge--neutral">Not connected</span>
            </span>
          </div>
          <div className="breakdown__row">
            <span className="breakdown__label">
              Automated AI analysis of listings
              <span className="breakdown__basis">
                Off. Listing text is scanned for known phrases by fixed rules only, and is never sent to
                an external model.
              </span>
            </span>
            <span className="breakdown__value">
              <span className="badge badge--neutral">Off</span>
            </span>
          </div>
        </div>
      </div>

      {/* --- Connection --------------------------------------------------- */}
      <div className="settings-group">
        <div className="settings-group__title">{t('settings.connection')}</div>
        <div className="breakdown">
          <div className="breakdown__row">
            <span className="breakdown__label">{t('settings.environment')}</span>
            <span className="breakdown__value">{connection?.environment ?? 'unknown'}</span>
          </div>
          <div className="breakdown__row">
            <span className="breakdown__label">Marketplace</span>
            <span className="breakdown__value">{site.id}</span>
          </div>
          <div className="breakdown__row">
            <span className="breakdown__label">{t('settings.lastRefresh')}</span>
            <span className="breakdown__value">
              {lastRefreshedAt ? formatDateTime(lastRefreshedAt, site.locale) : t('settings.notYet')}
            </span>
          </div>
        </div>
        <p className="field__hint" style={{ marginTop: 12 }}>
          Searches are cached for ten minutes and pagination is handled automatically, so repeating a
          scan usually costs no extra calls against the shared daily allowance.
        </p>
      </div>
    </div>
  );
}
