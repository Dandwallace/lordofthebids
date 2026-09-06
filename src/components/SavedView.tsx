'use client';

/**
 * Saved: the shortlist.
 *
 * A record of what you were looking at and what you decided. Marking
 * something "Purchased" changes this list and nothing else - this app
 * cannot buy anything and never places an order.
 */

import { isStale, STATUS_LABELS, type SavedItem, type SavedStatus } from '@/lib/store/saved';
import { IconExternal, IconImage, IconInfo, IconRefresh, IconWarning } from './Brand';
import { Money, Percent, formatDateTime } from './format';
import { useLocale } from '@/lib/i18n/context';
import { marketplace } from '@/lib/ebay/marketplaces';

interface Props {
  items: SavedItem[];
  persists: boolean;
  onPatch: (id: string, changes: Partial<SavedItem>) => void;
  onRemove: (id: string) => void;
  onRefresh: (item: SavedItem) => void;
  refreshingId: string | null;
}

function SavedRow({
  item,
  onPatch,
  onRemove,
  onRefresh,
  refreshing,
}: {
  item: SavedItem;
  onPatch: (id: string, changes: Partial<SavedItem>) => void;
  onRemove: (id: string) => void;
  onRefresh: (item: SavedItem) => void;
  refreshing: boolean;
}) {
  const { t, site } = useLocale();
  // The snapshot is in the currency of the market it was saved from, not
  // whichever region is selected now.
  const itemSite = marketplace(item.marketplaceId);
  const money = { currency: itemSite.currency, locale: itemSite.locale };
  const otherMarket = item.marketplaceId !== site.id;
  const stale = isStale(item);
  const priceMoved =
    item.refresh?.currentItemPrice != null && item.refresh.currentItemPrice !== item.snapshot.itemPrice;

  return (
    <li className="saved-item">
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="thumb" src={item.imageUrl} alt="" loading="lazy" style={{ width: 64, height: 64 }} />
      ) : (
        <div className="thumb thumb--empty" style={{ width: 64, height: 64 }} aria-hidden="true">
          <IconImage size={18} />
        </div>
      )}

      <div style={{ minWidth: 0 }}>
        <div className="row row--between row--wrap" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 600, lineHeight: 1.35 }}>{item.title}</div>
            <div className="row row--wrap" style={{ gap: 6, marginTop: 4 }}>
              <span className={`badge ${otherMarket ? 'badge--caution' : 'badge--neutral'}`}>
                {itemSite.country} · {itemSite.currency}
              </span>
              <span className="tiny muted">
                {t('saved.savedFrom', {
                  when: formatDateTime(item.savedAt, site.locale),
                  query: item.query,
                })}
              </span>
            </div>
          </div>

          <div className="status-picker" role="group" aria-label={`Status for ${item.title}`}>
            {(Object.keys(STATUS_LABELS) as SavedStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                aria-pressed={item.status === status}
                onClick={() => onPatch(item.id, { status })}
              >
                {t(`saved.${status}` as 'saved.interested')}
              </button>
            ))}
          </div>
        </div>

        {/* The figures as they were when saved. */}
        <div className="result-card__figures" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
          <div>
            <div className="figure__label">Price then</div>
            <div className="figure__value">
              <Money pence={item.snapshot.itemPrice} format={money} />
            </div>
          </div>
          <div>
            <div className="figure__label">Profit then</div>
            <div className={`figure__value ${item.snapshot.profit >= 0 ? 'positive' : 'negative'}`}>
              <Money pence={item.snapshot.profit} format={money} />
            </div>
          </div>
          <div>
            <div className="figure__label">ROI then</div>
            <div className="figure__value">
              <Percent ratio={item.snapshot.roi} />
            </div>
          </div>
          <div>
            <div className="figure__label">Max price</div>
            <div className="figure__value">
              <Money pence={item.snapshot.maxItemPrice > 0 ? item.snapshot.maxItemPrice : null} format={money} />
            </div>
          </div>
        </div>

        {/* What a refresh found, if one has been run. */}
        {item.refresh ? (
          <div
            className={`notice ${item.refresh.stillAvailable ? 'notice--info' : 'notice--caution'}`}
            style={{ marginTop: 12, padding: 10 }}
          >
            <div>
              <div className="notice__body">
                {item.refresh.stillAvailable ? (
                  <>
                    Still listed as of {formatDateTime(item.refresh.checkedAt)}.{' '}
                    {priceMoved ? (
                      <>
                        Price is now <Money pence={item.refresh.currentItemPrice} format={money} />, was{' '}
                        <Money pence={item.snapshot.itemPrice} format={money} />.
                      </>
                    ) : (
                      'Price unchanged.'
                    )}
                  </>
                ) : (
                  <>
                    Not available when checked at {formatDateTime(item.refresh.checkedAt)}. That does not
                    prove it sold: listings also end unsold, get withdrawn or are relisted.
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {stale ? (
          <div className="row" style={{ marginTop: 10 }}>
            <span className="badge badge--caution">
              <IconWarning size={11} />
              {t('saved.stale')}
            </span>
          </div>
        ) : null}

        <div className="field" style={{ marginTop: 12 }}>
          <label className="visually-hidden" htmlFor={`note-${item.id}`}>
            Note about {item.title}
          </label>
          <textarea
            id={`note-${item.id}`}
            className="saved-item__note"
            placeholder={t('saved.notePlaceholder')}
            value={item.note}
            onChange={(event) => onPatch(item.id, { note: event.target.value })}
          />
        </div>

        <div className="row row--wrap" style={{ marginTop: 10, gap: 8 }}>
          <button
            type="button"
            className="btn btn--secondary btn--small"
            onClick={() => onRefresh(item)}
            disabled={refreshing}
          >
            {refreshing ? <span className="spinner spinner--dark" aria-hidden="true" /> : <IconRefresh size={14} />}
            {refreshing ? t('saved.checking') : t('saved.refresh')}
          </button>
          <a className="btn btn--secondary btn--small" href={item.url} target="_blank" rel="noopener noreferrer">
            <IconExternal size={14} />
            {t('results.openEbay')}
          </a>
          <span className="spacer" />
          <button type="button" className="btn btn--ghost btn--small" onClick={() => onRemove(item.id)}>
            {t('saved.remove')}
          </button>
        </div>
      </div>
    </li>
  );
}

export default function SavedView({ items, persists, onPatch, onRemove, onRefresh, refreshingId }: Props) {
  const { t } = useLocale();
  if (items.length === 0) {
    return (
      <div className="card">
        <div className="empty">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/saved-empty.webp" alt="" width={520} height={520} />
          <h3>{t('saved.empty')}</h3>
          <p className="secondary-text">{t('saved.emptyBody')}</p>
        </div>
      </div>
    );
  }

  const counts = items.reduce<Record<string, number>>((tally, item) => {
    tally[item.status] = (tally[item.status] ?? 0) + 1;
    return tally;
  }, {});

  return (
    <div className="stack">
      <div className="row row--between row--wrap">
        <div className="chips">
          {(Object.keys(STATUS_LABELS) as SavedStatus[]).map((status) => (
            <span key={status} className="badge badge--neutral">
              {t(`saved.${status}` as 'saved.interested')}{' '}
              <strong className="num">{counts[status] ?? 0}</strong>
            </span>
          ))}
        </div>
      </div>

      {!persists ? (
        <div className="notice notice--caution">
          <span className="notice__icon">
            <IconWarning />
          </span>
          <div>
            <div className="notice__title">{t('saved.notPersisting')}</div>
            <div className="notice__body">{t('saved.notPersistingBody')}</div>
          </div>
        </div>
      ) : (
        <div className="notice notice--info">
          <span className="notice__icon">
            <IconInfo />
          </span>
          <div>
            <div className="notice__title">{t('saved.browserOnly')}</div>
            <div className="notice__body">{t('saved.browserOnlyBody')}</div>
          </div>
        </div>
      )}

      <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map((item) => (
          <SavedRow
            key={item.id}
            item={item}
            onPatch={onPatch}
            onRemove={onRemove}
            onRefresh={onRefresh}
            refreshing={refreshingId === item.id}
          />
        ))}
      </ul>
    </div>
  );
}
