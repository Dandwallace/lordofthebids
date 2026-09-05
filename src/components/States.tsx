'use client';

/**
 * The states a screen can be in other than "here are your results":
 * not connected, loading, failed, and empty.
 *
 * Two rules throughout:
 *   - A failure never throws away what you typed.
 *   - An error always offers something you can actually do next.
 */

import { IconInfo, IconRefresh, IconWarning } from './Brand';
import type { ApiError } from '@/lib/types';

export function NotConnected({ onViewExample }: { onViewExample: () => void }) {
  return (
    <div className="card">
      <div className="card__body">
        <div className="empty">
          <span style={{ color: 'var(--amber-700)' }}>
            <IconWarning size={30} />
          </span>
          <h3>eBay connection needs setup</h3>
          <p className="secondary-text">
            This app has no eBay credentials configured on the server, so it cannot fetch live listings
            yet. Everything else works: you can see how results look using example data.
          </p>
          <div className="row" style={{ marginTop: 8 }}>
            <button type="button" className="btn btn--primary" onClick={onViewExample}>
              View example results
            </button>
          </div>
          <p className="tiny muted" style={{ marginTop: 12, maxWidth: '52ch' }}>
            Setting this up is a developer task: the API keys go in the server environment, never in the
            browser. The steps are in the project README under &ldquo;eBay developer portal steps&rdquo;.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  return (
    <div className="notice notice--error">
      <span className="notice__icon">
        <IconWarning />
      </span>
      <div style={{ flex: 1 }}>
        <div className="notice__title">{error.error}</div>
        <div className="notice__body">{error.recovery}</div>
        <button type="button" className="btn btn--secondary btn--small" style={{ marginTop: 12 }} onClick={onRetry}>
          <IconRefresh size={14} />
          Try again
        </button>
      </div>
    </div>
  );
}

export function ExampleBanner({ onExit }: { onExit: () => void }) {
  return (
    <div className="notice notice--example">
      <span className="notice__icon">
        <IconInfo />
      </span>
      <div style={{ flex: 1 }}>
        <div className="notice__title">These are example results, not live listings</div>
        <div className="notice__body">
          Realistic figures run through the real calculation, so you can see how everything fits
          together. Nothing here is for sale.
        </div>
      </div>
      <button type="button" className="btn btn--ghost btn--small" onClick={onExit}>
        Exit example
      </button>
    </div>
  );
}

/** A table shaped skeleton, so the layout does not jump when data lands. */
export function LoadingResults() {
  return (
    <div className="card" aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Searching eBay</span>
      {[0, 1, 2, 3, 4].map((row) => (
        <div className="skeleton-row" key={row}>
          <div className="skeleton" style={{ width: 56, height: 56, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 13, width: `${58 + row * 6}%`, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 11, width: '32%' }} />
          </div>
          <div className="skeleton" style={{ height: 22, width: 72, flexShrink: 0 }} />
        </div>
      ))}
    </div>
  );
}
