'use client';

/**
 * The strip above the results: what the market looks like, and how much
 * the evidence behind it is worth.
 */

import type { AnalysisResult } from '@/lib/market/analyse';
import type { SearchMeta } from '@/lib/types';
import { IconInfo, IconWarning } from './Brand';
import { EvidenceBadge, Money, formatDateTime } from './format';

export default function MarketSummary({
  analysis,
  meta,
  isExample,
}: {
  analysis: AnalysisResult;
  meta: SearchMeta;
  isExample: boolean;
}) {
  const reference = analysis.reference;
  const passing = analysis.opportunities.filter((o) => o.meetsTargets).length;

  return (
    <div className="stack">
      <div className="summary">
        <div className="summary__cell">
          <div className="summary__label">Listings scanned</div>
          <div className="summary__value num">{analysis.listingsScanned}</div>
          <div className="summary__note">
            {reference ? `${reference.evidence.sampleSize} comparable` : 'none comparable'}
            {reference && reference.evidence.excludedNotProduct > 0
              ? `, ${reference.evidence.excludedNotProduct} not the product`
              : ''}
          </div>
        </div>

        <div className="summary__cell">
          <div className="summary__label">
            Reference value
            <span title="The 40th percentile of what comparable listings are asking, delivery included.">
              <IconInfo size={12} />
            </span>
          </div>
          <div className="summary__value">
            <Money pence={reference?.referenceValue ?? null} whole />
          </div>
          <div className="summary__note">asking prices, not sold prices</div>
        </div>

        <div className="summary__cell">
          <div className="summary__label">Usual asking range</div>
          <div className="summary__value">
            {reference ? (
              <>
                <Money pence={reference.q1} whole /> – <Money pence={reference.q3} whole />
              </>
            ) : (
              <span className="unknown">—</span>
            )}
          </div>
          <div className="summary__note">
            {reference ? (
              <>
                midpoint <Money pence={reference.median} whole />
              </>
            ) : (
              'no comparable listings'
            )}
          </div>
        </div>

        <div className="summary__cell">
          <div className="summary__label">Evidence</div>
          <div className="summary__value" style={{ fontSize: 15, paddingTop: 3 }}>
            {reference ? <EvidenceBadge strength={reference.evidence.strength} /> : <span className="unknown">—</span>}
          </div>
          <div className="summary__note">
            {passing} of {analysis.opportunities.length} meet your criteria
          </div>
        </div>
      </div>

      {/* What the evidence does and does not support, in plain words. */}
      {reference ? (
        <div className="card">
          <div className="card__body" style={{ paddingTop: 16, paddingBottom: 16 }}>
            <div className="row row--between" style={{ marginBottom: 10 }}>
              <span className="section-label">What this is based on</span>
              <span className="tiny muted">
                {isExample ? 'example data' : meta.fromCache ? 'from cache' : `${meta.apiCallsUsed} API calls`}
                {' · '}
                {formatDateTime(meta.fetchedAt)}
              </span>
            </div>
            <ul className="bullets">
              {reference.evidence.observations.map((line) => (
                <li key={line}>{line}</li>
              ))}
              {meta.excludedByTerms > 0 ? (
                <li>{meta.excludedByTerms} listings dropped by your excluded keywords.</li>
              ) : null}
              {meta.totalMatchingOnEbay > analysis.listingsScanned ? (
                <li>
                  eBay reports {meta.totalMatchingOnEbay.toLocaleString('en-GB')} matching listings in total.
                  A deeper search would widen the sample.
                </li>
              ) : null}
            </ul>

            <div className="notice notice--caution" style={{ marginTop: 14 }}>
              <span className="notice__icon">
                <IconWarning />
              </span>
              <div>
                <div className="notice__title">What this cannot tell you</div>
                <div className="notice__body">
                  <ul className="bullets" style={{ paddingLeft: 16, marginTop: 4 }}>
                    {reference.evidence.limitations.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Why listings are missing from the results. */}
      {analysis.exclusionTally.length > 0 ? (
        <div className="card">
          <div className="card__body" style={{ paddingTop: 16, paddingBottom: 16 }}>
            <div className="section-label" style={{ marginBottom: 10 }}>
              Listings set aside
            </div>
            <div className="chips">
              {analysis.exclusionTally.map((entry) => (
                <span key={entry.label} className="chip" title={entry.explanation} style={{ paddingRight: 11 }}>
                  {entry.label}
                  <strong className="num">{entry.count}</strong>
                </span>
              ))}
            </div>
            <p className="field__hint" style={{ marginTop: 10 }}>
              These were kept out of the reference price because they are not the product itself. Hover any
              one for the reason.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
