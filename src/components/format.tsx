'use client';

/**
 * Shared presentation helpers.
 *
 * The rule these enforce: an unknown value renders as an em dash, never
 * as zero. A missing delivery cost is not free delivery, and an ROI that
 * could not be computed is not 0%.
 */

import { formatMoney, formatPercent } from '@/lib/money/money';
import { useLocale } from '@/lib/i18n/context';
import type { Opportunity } from '@/lib/market/analyse';

export { formatMoney, formatPercent };

/**
 * Money always renders in the active marketplace's currency. Reading the
 * format from context rather than passing it down means a price cannot be
 * shown in the wrong currency by forgetting a prop.
 */
export function Money({ pence, whole = false }: { pence: number | null | undefined; whole?: boolean }) {
  const { money } = useLocale();
  if (pence === null || pence === undefined || !Number.isFinite(pence)) {
    return <span className="unknown">—</span>;
  }
  return <span className="num">{formatMoney(pence, whole, money)}</span>;
}

export function Percent({ ratio, decimals = 0 }: { ratio: number | null | undefined; decimals?: number }) {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) {
    return <span className="unknown">—</span>;
  }
  return <span className="num">{formatPercent(ratio, decimals)}</span>;
}

/** Profit, coloured and signed, always with a word beside it in context. */
export function Profit({ pence, size = 'normal' }: { pence: number; size?: 'normal' | 'large' }) {
  const { money } = useLocale();
  const positive = pence > 0;
  return (
    <span
      className={`num ${size === 'large' ? 'profit-figure' : ''} ${positive ? 'positive' : 'negative'}`}
    >
      {formatMoney(pence, false, money)}
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

const STRENGTH_CLASS: Record<string, string> = {
  reasonable: 'badge--positive',
  moderate: 'badge--caution',
  limited: 'badge--negative',
};

export function EvidenceBadge({ strength }: { strength: string }) {
  const { t } = useLocale();
  const key = strength in STRENGTH_CLASS ? strength : 'limited';
  const label = t(`evidence.${key}` as 'evidence.limited');
  return <span className={`badge ${STRENGTH_CLASS[key]}`}>{label}</span>;
}

/** Where a figure came from. Four sources, always visually distinct. */
export function Provenance({ kind }: { kind: 'source' | 'seller' | 'calculated' | 'yours' }) {
  const { t } = useLocale();
  return (
    <span className={`provenance provenance--${kind}`}>
      {t(`provenance.${kind}` as 'provenance.source')}
    </span>
  );
}

export function relativeDays(days: number | null): string {
  if (days === null) return 'date unknown';
  if (days <= 0) return 'listed today';
  if (days === 1) return 'listed yesterday';
  if (days < 30) return `listed ${days} days ago`;
  const months = Math.round(days / 30);
  return `listed ${months} month${months === 1 ? '' : 's'} ago`;
}

export function formatDateTime(iso: string, locale = 'en-GB'): string {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return '—';
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  }).format(parsed);
}
