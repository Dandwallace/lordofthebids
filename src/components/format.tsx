'use client';

/**
 * Shared presentation helpers.
 *
 * The rule these enforce: an unknown value renders as an em dash, never
 * as zero. A missing delivery cost is not free delivery, and an ROI that
 * could not be computed is not 0%.
 */

import { formatMoney, formatPercent } from '@/lib/money/money';
import type { Opportunity } from '@/lib/market/analyse';

export { formatMoney, formatPercent };

export function Money({ pence, whole = false }: { pence: number | null | undefined; whole?: boolean }) {
  if (pence === null || pence === undefined || !Number.isFinite(pence)) {
    return <span className="unknown">—</span>;
  }
  return <span className="num">{formatMoney(pence, whole)}</span>;
}

export function Percent({ ratio, decimals = 0 }: { ratio: number | null | undefined; decimals?: number }) {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) {
    return <span className="unknown">—</span>;
  }
  return <span className="num">{formatPercent(ratio, decimals)}</span>;
}

/** Profit, coloured and signed, always with a word beside it in context. */
export function Profit({ pence, size = 'normal' }: { pence: number; size?: 'normal' | 'large' }) {
  const positive = pence > 0;
  return (
    <span
      className={`num ${size === 'large' ? 'profit-figure' : ''} ${positive ? 'positive' : 'negative'}`}
    >
      {formatMoney(pence)}
    </span>
  );
}

export const PRICE_BASIS_LABELS: Record<Opportunity['priceBasis'], string> = {
  buyItNow: 'Buy It Now',
  currentBid: 'Current bid',
  bestOffer: 'Or best offer',
};

/**
 * How the price was arrived at. A live auction bid is never presented as
 * a price you can rely on.
 */
export function PriceBasisBadge({ opportunity }: { opportunity: Opportunity }) {
  if (opportunity.priceBasis === 'currentBid') {
    return (
      <span className="badge badge--caution" title="This is the current bid. The final price will be higher.">
        Bid{typeof opportunity.bidCount === 'number' ? ` ×${opportunity.bidCount}` : ''}
      </span>
    );
  }
  if (opportunity.priceBasis === 'bestOffer') {
    return (
      <span className="badge badge--neutral" title="Buy It Now with offers accepted.">
        Offers
      </span>
    );
  }
  return (
    <span className="badge badge--neutral" title="A fixed price you can pay now.">
      Buy now
    </span>
  );
}

const STRENGTH_TEXT: Record<string, { label: string; className: string }> = {
  reasonable: { label: 'Reasonable evidence', className: 'badge--positive' },
  moderate: { label: 'Moderate evidence', className: 'badge--caution' },
  limited: { label: 'Limited evidence', className: 'badge--negative' },
};

export function EvidenceBadge({ strength }: { strength: string }) {
  const info = STRENGTH_TEXT[strength] ?? STRENGTH_TEXT.limited;
  return <span className={`badge ${info.className}`}>{info.label}</span>;
}

/** Where a figure came from. Four sources, always visually distinct. */
export function Provenance({ kind }: { kind: 'source' | 'seller' | 'calculated' | 'yours' }) {
  const text = {
    source: 'From eBay',
    seller: 'Seller says',
    calculated: 'Calculated',
    yours: 'Your input',
  }[kind];
  return <span className={`provenance provenance--${kind}`}>{text}</span>;
}

export function relativeDays(days: number | null): string {
  if (days === null) return 'date unknown';
  if (days <= 0) return 'listed today';
  if (days === 1) return 'listed yesterday';
  if (days < 30) return `listed ${days} days ago`;
  const months = Math.round(days / 30);
  return `listed ${months} month${months === 1 ? '' : 's'} ago`;
}

export function formatDateTime(iso: string): string {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return 'unknown';
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  }).format(parsed);
}
