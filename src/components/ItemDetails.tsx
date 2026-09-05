'use client';

/**
 * Everything known about one listing, and where each part came from.
 *
 * Four kinds of statement are kept visually distinct, because confusing
 * them is how people talk themselves into bad buys:
 *   From eBay   - a fact from the API
 *   Seller says - a claim in the listing, unverified
 *   Calculated  - this app's arithmetic on the above
 *   Your input  - your own assumption or override
 */

import { useMemo, useState } from 'react';
import type { MarketReference, Opportunity } from '@/lib/market/analyse';
import { calculateDeal, type CostAssumptions } from '@/lib/money/deal';
import { EBAY_UK_FEE_RULES } from '@/lib/money/fees';
import { toPence } from '@/lib/money/money';
import type { SellingPreferences } from '@/lib/types';
import { IconBookmark, IconExternal, IconInfo, IconWarning } from './Brand';
import { EvidenceBadge, Money, Percent, PriceBasisBadge, Profit, Provenance, relativeDays } from './format';

interface Props {
  opportunity: Opportunity;
  reference: MarketReference | null;
  preferences: SellingPreferences;
  costs: CostAssumptions;
  description?: string | null;
  isExample: boolean;
  saved: boolean;
  onSave: () => void;
}

function Row({
  label,
  value,
  basis,
  tone,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  basis?: string;
  tone?: 'total' | 'group' | 'negative';
}) {
  const className =
    tone === 'group'
      ? 'breakdown__row breakdown__row--group'
      : tone === 'total'
        ? 'breakdown__row breakdown__row--total'
        : tone === 'negative'
          ? 'breakdown__row breakdown__row--total is-negative'
          : 'breakdown__row';

  return (
    <div className={className}>
      <span className="breakdown__label">
        {label}
        {basis ? <span className="breakdown__basis">{basis}</span> : null}
      </span>
      <span className="breakdown__value">{value}</span>
    </div>
  );
}

/**
 * Questions this app cannot answer from the listing data, plus what to
 * check on arrival. Driven by the flags actually found, so it is specific
 * to this listing rather than generic advice.
 */
function buildChecklist(opportunity: Opportunity): string[] {
  const checks: string[] = [];

  for (const caution of opportunity.flags.cautions) {
    switch (caution.reason) {
      case 'untested':
        checks.push('Ask the seller whether it has been powered on at all, and what happened.');
        break;
      case 'accountLocked':
        checks.push('Confirm the device is not account or network locked. A locked unit is usually unsellable.');
        break;
      case 'missingAccessory':
        checks.push('Price up the missing accessory before bidding, and add it to your costs.');
        break;
      case 'cosmeticDamage':
        checks.push('Ask for photographs of the damage in daylight before committing.');
        break;
      case 'incomplete':
        checks.push('Confirm exactly what is included against the full contents list.');
        break;
      case 'soldAsSeen':
      case 'noReturns':
        checks.push('There is no route back if it is wrong. Only bid what you would accept losing.');
        break;
      case 'readDescription':
        checks.push('Read the full description: the seller is pointing at a caveat.');
        break;
    }
  }

  if (opportunity.priceIsProvisional) {
    checks.push('This is a live auction. Decide your maximum bid now and do not exceed it.');
  }
  if (opportunity.deliveryCost === null) {
    checks.push('Delivery cost was not quoted. Confirm it before working out your margin.');
  }
  if (opportunity.itemLocationCountry && opportunity.itemLocationCountry !== 'GB') {
    checks.push('Item is outside the UK. Check import charges and delivery time.');
  }
  if ((opportunity.seller.feedbackScore ?? 0) < 20) {
    checks.push('Seller has little feedback history. Consider the risk of a slow or absent dispatch.');
  }

  checks.push('Confirm the exact model and variant matches the ones the reference price is built from.');

  return checks;
}

export default function ItemDetails({
  opportunity,
  reference,
  preferences,
  costs,
  description,
  isExample,
  saved,
  onSave,
}: Props) {
  const [manualResale, setManualResale] = useState('');

  const manualPence = useMemo(() => {
    const parsed = Number(manualResale);
    return Number.isFinite(parsed) && parsed > 0 ? toPence(parsed) : null;
  }, [manualResale]);

  /** Recomputed live when you enter your own resale figure. */
  const scenario = useMemo(() => {
    if (manualPence === null) return null;
    return calculateDeal({
      itemPrice: opportunity.itemPrice,
      inboundPostage: opportunity.deliveryCost,
      resalePrice: manualPence,
      costs,
      selling: {
        sellerType: preferences.sellerType,
        category: preferences.category,
        internationalSale: preferences.internationalSale,
        vatOnFeesIsACost: preferences.vatOnFeesIsACost,
        finalValueFeeRateOverride: preferences.finalValueFeeRateOverride,
      },
    });
  }, [manualPence, opportunity, costs, preferences]);

  const shown = scenario ?? opportunity.maths;
  const resaleValue = reference?.referenceValue ?? 0;
  const checklist = buildChecklist(opportunity);

  return (
    <>
      {isExample ? (
        <div className="notice notice--example">
          <span className="notice__icon">
            <IconInfo />
          </span>
          <div>
            <div className="notice__title">Example listing</div>
            <div className="notice__body">
              Nothing here is a real listing. These figures show how the calculation is laid out.
            </div>
          </div>
        </div>
      ) : null}

      {/* --- What it is ------------------------------------------------- */}
      <section>
        <h3 className="drawer-section__title">What it is</h3>
        <div className="row row--wrap" style={{ marginBottom: 12 }}>
          <PriceBasisBadge opportunity={opportunity} />
          <span className="badge badge--neutral">{opportunity.condition ?? 'Condition not stated'}</span>
          {reference ? <EvidenceBadge strength={reference.evidence.strength} /> : null}
        </div>

        <div className="breakdown">
          <Row label={<>Condition <Provenance kind="seller" /></>} value={opportunity.condition ?? '—'} />
          {opportunity.flags.signals.capacityGb ? (
            <Row
              label={<>Capacity <Provenance kind="seller" /></>}
              value={
                opportunity.flags.signals.capacityGb >= 1024
                  ? `${opportunity.flags.signals.capacityGb / 1024}TB`
                  : `${opportunity.flags.signals.capacityGb}GB`
              }
            />
          ) : null}
          {opportunity.flags.signals.modelCodes.length > 0 ? (
            <Row
              label={<>Model code <Provenance kind="seller" /></>}
              value={opportunity.flags.signals.modelCodes.join(', ')}
            />
          ) : null}
          {opportunity.flags.signals.edition ? (
            <Row label={<>Edition <Provenance kind="seller" /></>} value={opportunity.flags.signals.edition} />
          ) : null}
          {opportunity.flags.signals.region ? (
            <Row label={<>Region <Provenance kind="seller" /></>} value={opportunity.flags.signals.region} />
          ) : null}
          <Row
            label={<>Seller <Provenance kind="source" /></>}
            value={
              opportunity.seller.feedbackScore === null
                ? '—'
                : `${opportunity.seller.feedbackScore} feedback${
                    opportunity.seller.feedbackPercentage !== null
                      ? ` (${opportunity.seller.feedbackPercentage}%)`
                      : ''
                  }`
            }
          />
          <Row
            label={<>Location <Provenance kind="source" /></>}
            value={opportunity.itemLocationCountry ?? '—'}
          />
          <Row label={<>Listed <Provenance kind="source" /></>} value={relativeDays(opportunity.listedAgoDays)} />
        </div>
      </section>

      {/* --- Issues ----------------------------------------------------- */}
      {opportunity.flags.exclusions.length > 0 || opportunity.flags.cautions.length > 0 ? (
        <section>
          <h3 className="drawer-section__title">
            <IconWarning size={14} />
            Issues found in the listing
          </h3>
          <div className="stack">
            {opportunity.flags.exclusions.map((flag) => (
              <div key={flag.reason} className="notice notice--error">
                <div>
                  <div className="notice__title">
                    {flag.label} — &ldquo;{flag.matched}&rdquo;
                  </div>
                  <div className="notice__body">{flag.explanation}</div>
                </div>
              </div>
            ))}
            {opportunity.flags.cautions.map((flag) => (
              <div key={flag.reason} className="notice notice--caution">
                <div>
                  <div className="notice__title">
                    {flag.label} — &ldquo;{flag.matched}&rdquo;
                  </div>
                  <div className="notice__body">{flag.explanation}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* --- Reference value -------------------------------------------- */}
      {reference ? (
        <section>
          <h3 className="drawer-section__title">Where the reference value comes from</h3>
          <div className="breakdown">
            <Row
              label={<>Reference value <Provenance kind="calculated" /></>}
              value={<Money pence={reference.referenceValue} />}
              basis={reference.method}
            />
            <Row label="Middle half of asking prices" value={<><Money pence={reference.q1} /> – <Money pence={reference.q3} /></>} />
            <Row label="Midpoint of asking prices" value={<Money pence={reference.median} />} />
            <Row label="Comparable listings used" value={String(reference.evidence.sampleSize)} />
          </div>
          <ul className="bullets" style={{ marginTop: 12 }}>
            {reference.evidence.observations.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <div className="notice notice--caution" style={{ marginTop: 12 }}>
            <span className="notice__icon">
              <IconWarning />
            </span>
            <div>
              <div className="notice__title">These are asking prices</div>
              <div className="notice__body">
                {reference.evidence.limitations.join(' ')}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* --- The calculation -------------------------------------------- */}
      <section>
        <h3 className="drawer-section__title">
          The profit calculation
          {scenario ? <span className="badge badge--example">Manual scenario</span> : null}
        </h3>

        <div className="breakdown">
          <Row label="Money in" value="" tone="group" />
          <Row
            label={scenario ? <>Your resale figure <Provenance kind="yours" /></> : <>Reference value <Provenance kind="calculated" /></>}
            value={<Money pence={scenario ? manualPence! : resaleValue} />}
            basis="What the buyer pays you, delivery included"
          />
          {shown.fees.lines.map((line) => (
            <Row
              key={line.key}
              label={line.label}
              value={<span className="negative">−<Money pence={line.amount} /></span>}
              basis={line.basis}
            />
          ))}
          {shown.fees.vat > 0 ? (
            <Row
              label="VAT on fees"
              value={
                preferences.vatOnFeesIsACost ? (
                  <span className="negative">−<Money pence={shown.fees.vat} /></span>
                ) : (
                  <span className="muted"><Money pence={shown.fees.vat} /> reclaimable</span>
                )
              }
              basis={preferences.vatOnFeesIsACost ? '20% on all eBay fees' : 'Not treated as a cost: you reclaim it'}
            />
          ) : null}
          <Row label="Net receipts" value={<Money pence={shown.netReceipts} />} />

          <Row label="Money out" value="" tone="group" />
          <Row label="Item price" value={<span className="negative">−<Money pence={opportunity.itemPrice} /></span>} />
          <Row
            label="Delivery to you"
            value={
              opportunity.deliveryCost === null ? (
                <span className="unknown">not quoted</span>
              ) : (
                <span className="negative">−<Money pence={opportunity.deliveryCost} /></span>
              )
            }
          />
          <Row label="Postage out" value={<span className="negative">−<Money pence={costs.outboundPostage} /></span>} basis="Your setting" />
          <Row label="Packaging" value={<span className="negative">−<Money pence={costs.packaging} /></span>} basis="Your setting" />
          {costs.preparation > 0 ? (
            <Row label="Preparation" value={<span className="negative">−<Money pence={costs.preparation} /></span>} basis="Your setting" />
          ) : null}
          {costs.repairAllowance > 0 ? (
            <Row label="Repair allowance" value={<span className="negative">−<Money pence={costs.repairAllowance} /></span>} basis="Your setting" />
          ) : null}
          <Row
            label="Loss allowance"
            value={<span className="negative">−<Money pence={shown.lossAllowance} /></span>}
            basis={`${(costs.lossAllowanceRate * 100).toFixed(0)}% of the resale value, for returns and items that do not sell`}
          />
          <Row label="Total cost" value={<Money pence={shown.totalCost} />} />

          <Row
            label="Estimated profit"
            value={<Profit pence={shown.profit} />}
            tone={shown.profit >= 0 ? 'total' : 'negative'}
            basis="Trading profit before any tax you owe on it"
          />
        </div>

        <div className="grid-2" style={{ marginTop: 12 }}>
          <div className="breakdown">
            <Row label="ROI" value={<Percent ratio={shown.roi} />} basis="Profit ÷ total cost" />
          </div>
          <div className="breakdown">
            <Row label="Margin" value={<Percent ratio={shown.margin} />} basis="Profit ÷ resale value" />
          </div>
        </div>

        {/*
          Business category rates came from secondary references rather
          than eBay directly, so say so where the fee is actually shown.
          Not shown for private sellers: the nil fee position on eligible
          domestic sales is not in doubt, and warning about it would be
          noise.
        */}
        {preferences.sellerType === 'business' && shown.fees.rateConfidence === 'indicative' ? (
          <div className="notice notice--caution" style={{ marginTop: 12 }}>
            <span className="notice__icon">
              <IconWarning />
            </span>
            <div>
              <div className="notice__title">This category rate is unverified</div>
              <div className="notice__body">
                The {EBAY_UK_FEE_RULES.categories[preferences.category].label} final value fee has not
                been confirmed against eBay directly. If you know your exact rate, set it as an
                override in Settings.
              </div>
            </div>
          </div>
        ) : null}

        <div className="rule-version" style={{ marginTop: 12 }}>
          <IconInfo size={14} />
          <span>
            Fee rules version {shown.fees.rulesVersion}, checked {shown.fees.verifiedOn}
            {shown.fees.usedOverride ? '. A manual fee rate override is in use.' : ''}
          </span>
        </div>
      </section>

      {/* --- Max price --------------------------------------------------- */}
      <section>
        <h3 className="drawer-section__title">The most you should pay</h3>
        <div className="breakdown">
          <Row
            label={<>Maximum item price <Provenance kind="calculated" /></>}
            value={<Money pence={opportunity.maxItemPrice > 0 ? opportunity.maxItemPrice : null} />}
            tone="total"
            basis={
              opportunity.priceIsProvisional
                ? 'Your maximum bid. Set it and stop.'
                : 'Above this, the deal stops meeting your targets.'
            }
          />
          <Row
            label="Maximum all in"
            value={<Money pence={opportunity.maxAcquisitionCost > 0 ? opportunity.maxAcquisitionCost : null} />}
            basis="Including delivery to you"
          />
        </div>
        <ul className="bullets" style={{ marginTop: 12 }}>
          {opportunity.maxPriceAssumptions.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      {/* --- Manual scenario --------------------------------------------- */}
      <section>
        <h3 className="drawer-section__title">Try your own resale figure</h3>
        <div className="field">
          <label htmlFor="manual-resale">
            If you think it sells for a different amount, enter it here
          </label>
          <div className="input-prefix">
            <span className="input-prefix__symbol">£</span>
            <input
              id="manual-resale"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={manualResale}
              placeholder={(resaleValue / 100).toFixed(2)}
              onChange={(event) => setManualResale(event.target.value)}
            />
          </div>
          <p className="field__hint">
            {scenario
              ? 'The calculation above is now a manual scenario built on your figure, not on market evidence.'
              : 'Leave blank to use the reference value derived from current listings.'}
          </p>
        </div>
      </section>

      {/* --- Description -------------------------------------------------- */}
      {description ? (
        <section>
          <h3 className="drawer-section__title">
            Seller&rsquo;s description <Provenance kind="seller" />
          </h3>
          <div className="description-box">{description}</div>
          <p className="field__hint" style={{ marginTop: 8 }}>
            Shown as plain text. Nothing written in a listing changes how this app calculates or behaves.
          </p>
        </section>
      ) : null}

      {/* --- Checklist ---------------------------------------------------- */}
      <section>
        <h3 className="drawer-section__title">Before you buy</h3>
        <ul className="checklist">
          {checklist.map((check) => (
            <li key={check}>{check}</li>
          ))}
        </ul>
      </section>

      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn btn--secondary" onClick={onSave} aria-pressed={saved}>
          <IconBookmark />
          {saved ? 'Saved' : 'Save'}
        </button>
        <a className="btn btn--primary" href={opportunity.url} target="_blank" rel="noopener noreferrer">
          <IconExternal />
          Open on eBay
        </a>
      </div>
    </>
  );
}
