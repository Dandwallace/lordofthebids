'use client';

import type { AnalysisResponse, Deal } from '@/lib/types';

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 2,
});

const gbp0 = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

const QUALITY_LABEL = { high: 'Good', medium: 'Fair', low: 'Poor' } as const;

function formatOf(deal: Deal): string {
  if (deal.buyingFormat === 'auction') {
    return deal.bidCount === null ? 'Auction' : `Auction, ${deal.bidCount} bids`;
  }
  if (deal.buyingFormat === 'both') return 'Auction with Buy It Now';
  return 'Buy It Now';
}

function DealRow({ deal }: { deal: Deal }) {
  return (
    <li className="deal">
      {deal.imageUrl ? (
        // Plain img: eBay serves thumbnails from many hostnames, so there is
        // nothing useful to whitelist for next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="deal-thumb" src={deal.imageUrl} alt="" loading="lazy" />
      ) : (
        <div className="deal-thumb deal-thumb--empty">no image</div>
      )}

      <div>
        <a className="deal-title" href={deal.url} target="_blank" rel="noopener noreferrer">
          {deal.title}
        </a>

        <dl className="deal-figures">
          <div>
            <dt>Buy price</dt>
            <dd>
              {gbp.format(deal.buyCost)}
              {deal.shippingCost !== null && deal.shippingCost > 0 ? (
                <> <span style={{ color: 'var(--text-faint)' }}>inc. {gbp.format(deal.shippingCost)} post</span></>
              ) : deal.shippingCost === 0 ? (
                <> <span style={{ color: 'var(--text-faint)' }}>free post</span></>
              ) : null}
            </dd>
          </div>
          <div>
            <dt>Assumed resale</dt>
            <dd>{gbp.format(deal.assumedResale)}</dd>
          </div>
          <div>
            <dt>Below market</dt>
            <dd className="below-market">{deal.belowMarketPct.toFixed(0)}%</dd>
          </div>
          <div>
            <dt>eBay fees</dt>
            <dd>{gbp.format(deal.fees.total)}</dd>
          </div>
        </dl>

        <p className="deal-meta">
          {formatOf(deal)}
          {deal.condition ? ` · ${deal.condition}` : ''}
          {deal.sellerFeedbackScore !== null
            ? ` · seller ${deal.sellerFeedbackScore}${
                deal.sellerFeedbackPercentage !== null ? ` (${deal.sellerFeedbackPercentage}%)` : ''
              }`
            : ''}
          {` · ${deal.percentileRank.toFixed(0)}th percentile of this search`}
        </p>

        {deal.riskFlags.length > 0 && (
          <div className="flags">
            {deal.riskFlags.map((flag) => (
              <span key={flag.kind} className={`flag flag--${flag.severity}`} title={flag.detail}>
                {flag.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="deal-profit">
        <strong>{gbp.format(deal.netProfit)}</strong>
        <span>{deal.returnPct.toFixed(0)}% return</span>
      </div>
    </li>
  );
}

export default function ResultsPanel({
  result,
  loading,
  error,
}: {
  result: AnalysisResponse | null;
  loading: boolean;
  error: string | null;
}) {
  if (error) {
    return <div className="notice notice--error">{error}</div>;
  }

  if (loading) {
    return <div className="notice">Pulling active listings from eBay UK…</div>;
  }

  if (!result) {
    return (
      <div className="notice">
        Enter a search term to scan active eBay UK listings. The reference price is built from the
        spread of everything else on sale for the same thing right now, trimmed of outliers, taken at
        the 40th percentile because asking prices sit above selling prices.
      </div>
    );
  }

  const { summary, deals, belowThresholdCount } = result;

  return (
    <div>
      <dl className="summary">
        <div className="summary-cell">
          <dt>Listings scanned</dt>
          <dd>
            {summary.listingsScanned}
            <small>
              {summary.comparableListings} comparable
              {summary.outliersTrimmed > 0 ? `, ${summary.outliersTrimmed} trimmed` : ''}
            </small>
          </dd>
        </div>
        <div className="summary-cell">
          <dt>Market median</dt>
          <dd>
            {gbp0.format(summary.median)}
            <small>resale taken at {gbp0.format(summary.referencePrice)}</small>
          </dd>
        </div>
        <div className="summary-cell">
          <dt>Usual range</dt>
          <dd>
            {gbp0.format(summary.q1)}–{gbp0.format(summary.q3)}
            <small>
              middle half, full {gbp0.format(summary.min)}–{gbp0.format(summary.max)}
            </small>
          </dd>
        </div>
        <div className="summary-cell">
          <dt>Comparison quality</dt>
          <dd>
            <span className={`quality quality--${summary.confidence.level}`}>
              {QUALITY_LABEL[summary.confidence.level]}
            </span>
            <small>{summary.apiCallsUsed} API calls used</small>
          </dd>
        </div>
      </dl>

      <div className="reasons">
        <ul>
          {summary.confidence.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
          {summary.totalMatchingOnEbay > summary.listingsScanned && (
            <li>
              eBay reports {summary.totalMatchingOnEbay.toLocaleString('en-GB')} matching listings in
              total, pull more pages to widen the sample.
            </li>
          )}
          {summary.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      </div>

      <div className="results-head">
        <h2>
          {deals.length} {deals.length === 1 ? 'listing' : 'listings'} worth a look
        </h2>
        <span>
          Bottom quarter of the distribution only
          {belowThresholdCount > 0
            ? `, ${belowThresholdCount} more were under your profit thresholds`
            : ''}
        </span>
      </div>

      {deals.length === 0 ? (
        <div className="empty">
          Nothing cleared your thresholds. Lower the minimum profit, pull more pages, or try a
          different search term.
        </div>
      ) : (
        <ul className="deal-list">
          {deals.map((deal) => (
            <DealRow key={deal.itemId} deal={deal} />
          ))}
        </ul>
      )}
    </div>
  );
}
