'use client';

/**
 * The application shell: three destinations, a settings drawer, and the
 * state that has to survive moving between them.
 *
 * Results live here rather than inside a view so that switching to Saved
 * and back does not throw away a scan that cost API calls.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { STARTER_CATEGORIES, type StarterCategory } from '@/lib/discover/starters';
import { buildExampleAnalysis, EXAMPLE_DESCRIPTION } from '@/lib/fixtures/example';
import type { Opportunity } from '@/lib/market/analyse';
import { DEFAULT_CRITERIA, DEFAULT_PREFERENCES, usePersistentState } from '@/lib/store/preferences';
import { toSavedItem, useSavedItems, type SavedItem } from '@/lib/store/saved';
import type { ConnectionStatus, SearchCriteria, SellingPreferences } from '@/lib/types';
import {
  CrownTagLogo,
  IconBookmark,
  IconCompass,
  IconSearch,
  IconSettings,
} from './Brand';
import DiscoverView, { type DiscoverPreferences } from './DiscoverView';
import Drawer from './Drawer';
import ItemDetails from './ItemDetails';
import MarketSummary from './MarketSummary';
import Results from './Results';
import SavedView from './SavedView';
import SearchControls from './SearchControls';
import SettingsPanel from './SettingsPanel';
import { ErrorState, ExampleBanner, LoadingResults, NotConnected } from './States';
import { formatDateTime } from './format';
import { useScanner } from './useScanner';

type Tab = 'discover' | 'search' | 'saved';

const TABS: { id: Tab; label: string; Icon: typeof IconCompass }[] = [
  { id: 'discover', label: 'Discover', Icon: IconCompass },
  { id: 'search', label: 'Search', Icon: IconSearch },
  { id: 'saved', label: 'Saved', Icon: IconBookmark },
];

const DEFAULT_DISCOVER_PREFS: DiscoverPreferences = {
  canCollectLocally: false,
  preferSmallParcels: true,
  preferEasyTesting: true,
};

export default function AppShell() {
  const [tab, setTab] = useState<Tab>('discover');
  const [query, setQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [showExcluded, setShowExcluded] = useState(false);
  const [connection, setConnection] = useState<ConnectionStatus | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const preferences = usePersistentState<SellingPreferences>('preferences', DEFAULT_PREFERENCES);
  const criteria = usePersistentState<SearchCriteria>('criteria', DEFAULT_CRITERIA);
  const discover = usePersistentState<DiscoverPreferences>('discover', DEFAULT_DISCOVER_PREFS);
  const saved = useSavedItems();
  const scanner = useScanner();

  /** Connection state, checked once on load. */
  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then((response) => (response.ok ? response.json() : null))
      .then((status: ConnectionStatus | null) => {
        if (!cancelled && status) setConnection(status);
      })
      .catch(() => {
        if (!cancelled) {
          setConnection({
            configured: false,
            environment: 'production',
            marketplaceId: 'EBAY_GB',
            deletionEndpointConfigured: false,
            checkedAt: new Date().toISOString(),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Records the time of the last scan that actually returned data. */
  useEffect(() => {
    if (scanner.meta && !scanner.isExample) setLastRefreshedAt(scanner.meta.fetchedAt);
  }, [scanner.meta, scanner.isExample]);

  const savedIds = useMemo(() => new Set(saved.items.map((item) => item.id)), [saved.items]);

  const runSearch = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      setQuery(trimmed);
      setTab('search');
      void scanner.scan(trimmed, criteria.value, preferences.value);
    },
    [scanner, criteria.value, preferences.value],
  );

  const runCategory = useCallback(
    (category: StarterCategory) => {
      setTab('search');
      // A category's searches get its own fee category, so the numbers are
      // right without the user having to know which one applies.
      const merged = { ...preferences.value, category: category.suggestedCategory };
      preferences.update({ category: category.suggestedCategory });
      void scanner.scanMany(category.searches, criteria.value, merged);
    },
    [scanner, criteria.value, preferences],
  );

  const handleSave = useCallback(
    (opportunity: Opportunity) => {
      if (savedIds.has(opportunity.id)) {
        saved.remove(opportunity.id);
        return;
      }
      saved.save(
        toSavedItem(
          opportunity,
          scanner.analysis?.query ?? query,
          scanner.analysis?.reference?.evidence.strength ?? 'limited',
        ),
      );
    },
    [saved, savedIds, scanner.analysis, query],
  );

  /** Re-checks a saved listing, keeping the note and status untouched. */
  const refreshSaved = useCallback(
    async (item: SavedItem) => {
      setRefreshingId(item.id);
      try {
        const response = await fetch('/api/item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: item.url, criteria: criteria.value, preferences: preferences.value }),
        });

        if (!response.ok) {
          saved.patch(item.id, {
            refresh: { checkedAt: new Date().toISOString(), currentItemPrice: null, stillAvailable: false },
          });
          return;
        }

        const payload = await response.json();
        const found = (payload.analysis?.opportunities ?? []).find(
          (candidate: Opportunity) => candidate.id === payload.focusItemId,
        );

        saved.patch(item.id, {
          refresh: {
            checkedAt: new Date().toISOString(),
            currentItemPrice: found ? found.itemPrice : null,
            stillAvailable: Boolean(found),
          },
        });
      } catch {
        saved.patch(item.id, {
          refresh: { checkedAt: new Date().toISOString(), currentItemPrice: null, stillAvailable: false },
        });
      } finally {
        setRefreshingId(null);
      }
    },
    [criteria.value, preferences.value, saved],
  );

  const viewExample = useCallback(() => {
    setTab('search');
    scanner.showExample(buildExampleAnalysis(preferences.value, criteria.value), EXAMPLE_DESCRIPTION);
  }, [scanner, preferences.value, criteria.value]);

  const notConfigured = connection !== null && !connection.configured;

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="app-header">
        <div className="app-header__inner">
          <span className="brand">
            <CrownTagLogo />
            <span className="brand__name">Lord of the Bids</span>
          </span>

          <nav className="nav" aria-label="Main">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                className="nav__item"
                aria-current={tab === id ? 'page' : undefined}
                onClick={() => setTab(id)}
              >
                <Icon size={15} />
                {label}
                {id === 'saved' && saved.items.length > 0 ? (
                  <span className="nav__count num">{saved.items.length}</span>
                ) : null}
              </button>
            ))}
          </nav>

          <div className="header-tools">
            <span className="status" title={connection ? `eBay ${connection.environment}` : 'Checking connection'}>
              <span
                className={`status__dot ${
                  connection === null ? 'status__dot--off' : connection.configured ? 'status__dot--ok' : 'status__dot--warn'
                }`}
              />
              <span className="desktop-inline">
                {connection === null
                  ? 'Checking'
                  : connection.configured
                    ? lastRefreshedAt
                      ? `Updated ${formatDateTime(lastRefreshedAt)}`
                      : 'Connected'
                    : 'Not connected'}
              </span>
            </span>

            <button
              type="button"
              className="btn btn--secondary btn--small"
              onClick={() => setSettingsOpen(true)}
              aria-haspopup="dialog"
            >
              <IconSettings size={15} />
              <span className="desktop-inline">Settings</span>
            </button>
          </div>
        </div>
      </header>

      <main className="page" id="main">
        {tab === 'discover' ? (
          <DiscoverView
            criteria={criteria.value}
            onCriteriaChange={criteria.update}
            discoverPrefs={discover.value}
            onDiscoverPrefsChange={discover.update}
            onRunCategory={runCategory}
            onRunSearch={runSearch}
            loading={scanner.loading}
            progress={scanner.progress}
          />
        ) : null}

        {tab === 'search' ? (
          <div className="stack" style={{ gap: 20 }}>
            <div className="page-head" style={{ marginBottom: 0 }}>
              <h1>Search</h1>
              <p>
                Look up a product, or paste an eBay listing link to review one listing against its own
                market.
              </p>
            </div>

            <SearchControls
              query={query}
              onQueryChange={setQuery}
              criteria={criteria.value}
              onCriteriaChange={criteria.update}
              onSubmit={() => runSearch(query)}
              loading={scanner.loading}
              onClearFilters={() => criteria.replace(DEFAULT_CRITERIA)}
            />

            {scanner.isExample ? <ExampleBanner onExit={scanner.reset} /> : null}
            {scanner.error ? <ErrorState error={scanner.error} onRetry={() => runSearch(query)} /> : null}
            {scanner.loading ? <LoadingResults /> : null}

            {!scanner.loading && !scanner.analysis && !scanner.error && notConfigured ? (
              <NotConnected onViewExample={viewExample} />
            ) : null}

            {!scanner.loading && !scanner.analysis && !scanner.error && !notConfigured ? (
              <div className="card">
                <div className="empty">
                  <h3>Ready when you are</h3>
                  <p className="secondary-text">
                    Enter a product above, or start from a category on Discover if you are not sure what to
                    look for.
                  </p>
                  <button type="button" className="btn btn--secondary" onClick={viewExample}>
                    View example results
                  </button>
                </div>
              </div>
            ) : null}

            {scanner.analysis && scanner.meta && !scanner.loading ? (
              <>
                <MarketSummary analysis={scanner.analysis} meta={scanner.meta} isExample={scanner.isExample} />

                <div className="row row--between row--wrap">
                  <h2 style={{ fontSize: 17 }}>
                    {scanner.analysis.opportunities.filter((o) => o.meetsTargets).length} worth a look
                  </h2>
                  <label className="check" style={{ minHeight: 0 }}>
                    <input
                      type="checkbox"
                      checked={showExcluded}
                      onChange={(event) => setShowExcluded(event.target.checked)}
                    />
                    <span className="check__text">
                      Show excluded ({scanner.analysis.filteredOutCount})
                    </span>
                  </label>
                </div>

                <Results
                  opportunities={scanner.analysis.opportunities}
                  onOpen={setSelected}
                  onSave={handleSave}
                  savedIds={savedIds}
                  showExcluded={showExcluded}
                />
              </>
            ) : null}
          </div>
        ) : null}

        {tab === 'saved' ? (
          <div className="stack" style={{ gap: 20 }}>
            <div className="page-head" style={{ marginBottom: 0 }}>
              <h1>Saved</h1>
              <p>Opportunities you shortlisted, with your own notes and where you got to.</p>
            </div>
            <SavedView
              items={saved.items}
              persists={saved.persists}
              onPatch={saved.patch}
              onRemove={saved.remove}
              onRefresh={refreshSaved}
              refreshingId={refreshingId}
            />
          </div>
        ) : null}
      </main>

      {/* --- Item details ------------------------------------------------ */}
      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ''}
        titleId="item-drawer-title"
      >
        {selected ? (
          <ItemDetails
            opportunity={selected}
            reference={scanner.analysis?.reference ?? null}
            preferences={preferences.value}
            costs={preferences.value.costs}
            description={scanner.focusItemId === selected.id || scanner.isExample ? scanner.description : null}
            isExample={scanner.isExample}
            saved={savedIds.has(selected.id)}
            onSave={() => handleSave(selected)}
          />
        ) : null}
      </Drawer>

      {/* --- Settings ---------------------------------------------------- */}
      <Drawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Settings"
        titleId="settings-drawer-title"
      >
        <SettingsPanel
          preferences={preferences.value}
          onChange={preferences.update}
          connection={connection}
          lastRefreshedAt={lastRefreshedAt}
        />
      </Drawer>
    </>
  );
}
