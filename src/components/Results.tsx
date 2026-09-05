'use client';

/**
 * Results, as a table on a wide screen and as cards on a narrow one.
 *
 * Sorting rules that matter:
 *   - Unknown values always sort last, in both directions. An item with
 *     no ROI is not the worst performer, it is unmeasured, and letting it
 *     float to the top of an ascending sort would be a lie.
 *   - Auction prices are marked wherever they appear, because the figures
 *     derived from them are provisional.
 */

import { useMemo, useState } from 'react';
import type { Opportunity } from '@/lib/market/analyse';
import { IconBookmark, IconExternal, IconImage, IconWarning } from './Brand';
import { Money, Percent, PriceBasisBadge, Profit, relativeDays } from './format';

export type SortKey = 'profit' | 'roi' | 'acquisitionCost' | 'maxItemPrice' | 'recency';
export type SortDirection = 'asc' | 'desc';

const COLUMNS: { key: SortKey; label: string; numeric: boolean; help?: string }[] = [
  { key: 'acquisitionCost', label: 'Total cost', numeric: true, help: 'Item price plus delivery to you.' },
  { key: 'profit', label: 'Est. profit', numeric: true, help: 'Reference value, less eBay fees and all your costs.' },
  { key: 'roi', label: 'ROI', numeric: true, help: 'Profit divided by total cost.' },
  { key: 'maxItemPrice', label: 'Max price', numeric: true, help: 'The most you can pay and still hit your targets.' },
];

/** Sorts with unknowns pushed to the bottom regardless of direction. */
function compare(a: number | null, b: number | null, direction: SortDirection): number {
  const aKnown = a !== null && Number.isFinite(a);
  const bKnown = b !== null && Number.isFinite(b);
  if (!aKnown && !bKnown) return 0;
  if (!aKnown) return 1;
  if (!bKnown) return -1;
  return direction === 'asc' ? a! - b! : b! - a!;
}

function valueFor(opportunity: Opportunity, key: SortKey): number | null {
  switch (key) {
    case 'profit':
      return opportunity.maths.profit;
    case 'roi':
      return opportunity.maths.roi;
    case 'acquisitionCost':
      return opportunity.acquisitionCost;
    case 'maxItemPrice':
      return opportunity.maxItemPrice > 0 ? opportunity.maxItemPrice : null;
    case 'recency':
      // Fewer days ago sorts as "more recent" under a descending sort.
      return opportunity.listedAgoDays === null ? null : -opportunity.listedAgoDays;
    default:
      return null;
  }
}

interface Props {
  opportunities: Opportunity[];
  onOpen: (opportunity: Opportunity) => void;
  onSave: (opportunity: Opportunity) => void;
  savedIds: Set<string>;
  showExcluded: boolean;
}

function FlagBadges({ opportunity }: { opportunity: Opportunity }) {
  const flags = [
    ...opportunity.flags.exclusions.map((flag) => ({ ...flag, tone: 'badge--negative' })),
    ...opportunity.flags.cautions.map((flag) => ({ ...flag, tone: 'badge--caution' })),
  ].slice(0, 3);

  if (flags.length === 0) return null;

  return (
    <div className="cell-flags">
      {flags.map((flag) => (
        <span key={`${flag.reason}-${flag.matched}`} className={`badge ${flag.tone}`} title={flag.explanation}>
          <IconWarning size={11} />
          {flag.label}
        </span>
      ))}
    </div>
  );
}

function Thumb({ opportunity }: { opportunity: Opportunity }) {
  if (!opportunity.imageUrl) {
    return (
      <div className="thumb thumb--empty" aria-hidden="true">
        <IconImage size={18} />
      </div>
    );
  }
  // A plain img: eBay serves thumbnails from many hostnames, so there is
  // nothing useful to configure for next/image.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="thumb" src={opportunity.imageUrl} alt="" loading="lazy" />;
}

export default function Results({ opportunities, onOpen, onSave, savedIds, showExcluded }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('profit');
  const [direction, setDirection] = useState<SortDirection>('desc');

  const rows = useMemo(() => {
    const visible = showExcluded ? opportunities : opportunities.filter((o) => o.meetsTargets);
    return [...visible].sort((a, b) => compare(valueFor(a, sortKey), valueFor(b, sortKey), direction));
  }, [opportunities, showExcluded, sortKey, direction]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setDirection('desc');
    }
  }

  function ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
    if (key !== sortKey) return 'none';
    return direction === 'asc' ? 'ascending' : 'descending';
  }

  if (rows.length === 0) {
    return (
      <div className="card">
        <div className="empty">
          <h3>Nothing matches your criteria</h3>
          <p className="secondary-text">
            Every listing was either excluded or fell short of your profit and return targets. Turn on
            &ldquo;Show excluded&rdquo; to see them and why.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Wide screens: a table, because these are numbers to compare. */}
      <div className="table-wrap desktop-only">
        <table className="results">
          <caption className="visually-hidden">
            Opportunities, sorted by {sortKey}, {direction === 'asc' ? 'ascending' : 'descending'}
          </caption>
          <thead>
            <tr>
              <th scope="col">
                <button type="button" className="results__sort" onClick={() => toggleSort('recency')} aria-sort={ariaSort('recency')}>
                  Product {sortKey === 'recency' ? (direction === 'asc' ? '↑' : '↓') : ''}
                </button>
              </th>
              {COLUMNS.map((column) => (
                <th key={column.key} scope="col" className={column.numeric ? 'is-numeric' : ''}>
                  <button
                    type="button"
                    className="results__sort"
                    onClick={() => toggleSort(column.key)}
                    aria-sort={ariaSort(column.key)}
                    title={column.help}
                  >
                    {column.label} {sortKey === column.key ? (direction === 'asc' ? '↑' : '↓') : ''}
                  </button>
                </th>
              ))}
              <th scope="col" className="is-numeric">
                <span style={{ display: 'inline-block', padding: '0 12px' }}>Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((opportunity) => (
              <tr key={opportunity.id} className={opportunity.meetsTargets ? '' : 'is-excluded'}>
                <td>
                  <div className="cell-product">
                    <Thumb opportunity={opportunity} />
                    <div style={{ minWidth: 0 }}>
                      <button type="button" className="cell-title__name" onClick={() => onOpen(opportunity)}>
                        {opportunity.title}
                      </button>
                      <div className="cell-title__meta">
                        <PriceBasisBadge opportunity={opportunity} />
                        <span>{opportunity.condition ?? 'Condition not stated'}</span>
                        <span>{relativeDays(opportunity.listedAgoDays)}</span>
                      </div>
                      {opportunity.filteredOutBecause ? (
                        <div className="cell-title__meta">
                          <span className="badge badge--neutral">Excluded: {opportunity.filteredOutBecause}</span>
                        </div>
                      ) : null}
                      <FlagBadges opportunity={opportunity} />
                    </div>
                  </div>
                </td>
                <td className="is-numeric">
                  <Money pence={opportunity.acquisitionCost} />
                  <div className="tiny muted">
                    {opportunity.deliveryCost === null
                      ? 'delivery unknown'
                      : opportunity.deliveryCost === 0
                        ? 'free delivery'
                        : `inc. delivery`}
                  </div>
                </td>
                <td className="is-numeric">
                  <Profit pence={opportunity.maths.profit} size="large" />
                  {opportunity.priceIsProvisional ? <div className="tiny caution">if won at this bid</div> : null}
                </td>
                <td className="is-numeric">
                  <span className={`roi-figure ${opportunity.maths.roi !== null && opportunity.maths.roi > 0 ? 'positive' : 'negative'}`}>
                    <Percent ratio={opportunity.maths.roi} />
                  </span>
                </td>
                <td className="is-numeric">
                  <Money pence={opportunity.maxItemPrice > 0 ? opportunity.maxItemPrice : null} />
                </td>
                <td>
                  <div className="table-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-pressed={savedIds.has(opportunity.id)}
                      aria-label={savedIds.has(opportunity.id) ? `Saved: ${opportunity.title}` : `Save ${opportunity.title}`}
                      onClick={() => onSave(opportunity)}
                    >
                      <IconBookmark />
                    </button>
                    <a
                      className="icon-btn"
                      href={opportunity.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open on eBay: ${opportunity.title}`}
                    >
                      <IconExternal />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Narrow screens: cards with the figures that decide it. */}
      <ul className="result-cards mobile-only">
        {rows.map((opportunity) => (
          <li
            key={opportunity.id}
            className={`result-card ${opportunity.meetsTargets ? '' : 'result-card--excluded'}`}
          >
            <button type="button" className="result-card__main" onClick={() => onOpen(opportunity)}>
              <Thumb opportunity={opportunity} />
              <div className="result-card__body">
                <div className="result-card__title">{opportunity.title}</div>
                <div className="cell-title__meta">
                  <PriceBasisBadge opportunity={opportunity} />
                  <span>{opportunity.condition ?? 'Condition not stated'}</span>
                </div>
                {opportunity.filteredOutBecause ? (
                  <div className="cell-title__meta">
                    <span className="badge badge--neutral">Excluded: {opportunity.filteredOutBecause}</span>
                  </div>
                ) : null}
                <FlagBadges opportunity={opportunity} />

                <div className="result-card__figures">
                  <div>
                    <div className="figure__label">Cost</div>
                    <div className="figure__value">
                      <Money pence={opportunity.acquisitionCost} />
                    </div>
                  </div>
                  <div>
                    <div className="figure__label">Profit</div>
                    <div className="figure__value">
                      <Profit pence={opportunity.maths.profit} />
                    </div>
                  </div>
                  <div>
                    <div className="figure__label">ROI</div>
                    <div className="figure__value">
                      <Percent ratio={opportunity.maths.roi} />
                    </div>
                  </div>
                </div>
              </div>
            </button>
            <div className="result-card__footer">
              <button
                type="button"
                className="btn btn--secondary btn--small"
                aria-pressed={savedIds.has(opportunity.id)}
                onClick={() => onSave(opportunity)}
              >
                <IconBookmark />
                {savedIds.has(opportunity.id) ? 'Saved' : 'Save'}
              </button>
              <a className="btn btn--secondary btn--small" href={opportunity.url} target="_blank" rel="noopener noreferrer">
                <IconExternal />
                eBay
              </a>
              <button type="button" className="btn btn--primary btn--small" onClick={() => onOpen(opportunity)}>
                Details
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
