'use client';

/**
 * Running scans, and keeping track of what happened.
 *
 * Discover runs several searches at once, so this also handles bounded
 * concurrency and per search progress: the user sees which searches
 * finished, which are running, and which failed, rather than one opaque
 * spinner that either works or does not.
 */

import { useCallback, useRef, useState } from 'react';
import { parseEbayItemId } from '@/lib/ebay/url';
import type { AnalysisResult, Opportunity } from '@/lib/market/analyse';
import type { ApiError, SearchCriteria, SearchMeta, SearchResponse, SellingPreferences } from '@/lib/types';

export type ScanStatus = 'pending' | 'running' | 'done' | 'failed';

export interface ScanProgress {
  query: string;
  status: ScanStatus;
  found: number;
  error?: string;
}

interface ScanState {
  loading: boolean;
  analysis: AnalysisResult | null;
  meta: SearchMeta | null;
  error: ApiError | null;
  isExample: boolean;
  description: string | null;
  focusItemId: string | null;
  progress: ScanProgress[];
}

const EMPTY: ScanState = {
  loading: false,
  analysis: null,
  meta: null,
  error: null,
  isExample: false,
  description: null,
  focusItemId: null,
  progress: [],
};

async function postJson(url: string, body: unknown): Promise<SearchResponse & { focusItemId?: string; descriptionText?: string }> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error: ApiError =
      payload && typeof payload === 'object' && 'error' in payload
        ? (payload as ApiError)
        : { error: 'That search could not be completed.', recovery: 'Try again in a moment.', kind: 'upstreamUnavailable' };
    throw error;
  }

  return payload as SearchResponse;
}

/** Merges several analyses into one combined result set. */
function mergeAnalyses(parts: AnalysisResult[]): AnalysisResult | null {
  const usable = parts.filter((part) => part.reference !== null);
  if (usable.length === 0) return parts[0] ?? null;

  const opportunities: Opportunity[] = [];
  const seen = new Set<string>();
  for (const part of usable) {
    for (const opportunity of part.opportunities) {
      if (!seen.has(opportunity.id)) {
        seen.add(opportunity.id);
        opportunities.push(opportunity);
      }
    }
  }

  opportunities.sort((a, b) => {
    if (a.meetsTargets !== b.meetsTargets) return a.meetsTargets ? -1 : 1;
    return b.maths.profit - a.maths.profit;
  });

  // Each search keeps its own reference price; the combined view reports
  // the one with the most evidence behind it so the summary is not a
  // meaningless average of unrelated products.
  const best = usable.reduce((strongest, part) =>
    (part.reference?.evidence.sampleSize ?? 0) > (strongest.reference?.evidence.sampleSize ?? 0) ? part : strongest,
  );

  return {
    query: usable.map((part) => part.query).join(', '),
    listingsScanned: usable.reduce((total, part) => total + part.listingsScanned, 0),
    reference: best.reference,
    opportunities,
    exclusionTally: usable.flatMap((part) => part.exclusionTally).reduce<AnalysisResult['exclusionTally']>((tally, entry) => {
      const existing = tally.find((candidate) => candidate.label === entry.label);
      if (existing) existing.count += entry.count;
      else tally.push({ ...entry });
      return tally;
    }, []),
    filteredOutCount: usable.reduce((total, part) => total + part.filteredOutCount, 0),
  };
}

export function useScanner() {
  const [state, setState] = useState<ScanState>(EMPTY);
  /** Guards against a slow response overwriting a newer one. */
  const runId = useRef(0);

  const reset = useCallback(() => setState(EMPTY), []);

  /** A single search, or a listing lookup when a link is pasted. */
  const scan = useCallback(
    async (query: string, criteria: SearchCriteria, preferences: SellingPreferences) => {
      const id = ++runId.current;
      const isLink = parseEbayItemId(query) !== null;

      setState({ ...EMPTY, loading: true, progress: [{ query, status: 'running', found: 0 }] });

      try {
        const payload = isLink
          ? await postJson('/api/item', { url: query, criteria, preferences })
          : await postJson('/api/search', { query, criteria, preferences });

        if (id !== runId.current) return;

        setState({
          loading: false,
          analysis: payload.analysis,
          meta: payload.meta,
          error: null,
          isExample: false,
          description: payload.descriptionText ?? null,
          focusItemId: payload.focusItemId ?? null,
          progress: [{ query, status: 'done', found: payload.analysis.opportunities.length }],
        });
      } catch (error) {
        if (id !== runId.current) return;
        const apiError = error as ApiError;
        setState({
          ...EMPTY,
          error: apiError,
          // The inputs are untouched, so nothing typed is lost on failure.
          progress: [{ query, status: 'failed', found: 0, error: apiError.error }],
        });
      }
    },
    [],
  );

  /**
   * Several searches, run two at a time, reporting progress as they land.
   * A failure in one does not abandon the others.
   */
  const scanMany = useCallback(
    async (queries: string[], criteria: SearchCriteria, preferences: SellingPreferences) => {
      const id = ++runId.current;
      const bounded = queries.slice(0, 6);

      setState({
        ...EMPTY,
        loading: true,
        progress: bounded.map((query) => ({ query, status: 'pending', found: 0 })),
      });

      const results: AnalysisResult[] = [];
      const metas: SearchMeta[] = [];
      let cursor = 0;

      const worker = async () => {
        while (true) {
          const index = cursor++;
          if (index >= bounded.length) return;
          const query = bounded[index];

          if (id === runId.current) {
            setState((current) => ({
              ...current,
              progress: current.progress.map((row, i) => (i === index ? { ...row, status: 'running' } : row)),
            }));
          }

          try {
            const payload = await postJson('/api/search', { query, criteria, preferences });
            if (id !== runId.current) return;
            results.push(payload.analysis);
            metas.push(payload.meta);
            const found = payload.analysis.opportunities.filter((o) => o.meetsTargets).length;
            setState((current) => ({
              ...current,
              progress: current.progress.map((row, i) => (i === index ? { ...row, status: 'done', found } : row)),
            }));
          } catch (error) {
            if (id !== runId.current) return;
            const apiError = error as ApiError;
            setState((current) => ({
              ...current,
              progress: current.progress.map((row, i) =>
                i === index ? { ...row, status: 'failed', error: apiError.error } : row,
              ),
            }));
          }
        }
      };

      // Two at a time: enough to feel quick, gentle on the shared allowance.
      await Promise.all([worker(), worker()]);
      if (id !== runId.current) return;

      const merged = mergeAnalyses(results);

      setState((current) => ({
        ...current,
        loading: false,
        analysis: merged,
        meta: metas.length
          ? {
              apiCallsUsed: metas.reduce((total, meta) => total + meta.apiCallsUsed, 0),
              fromCache: metas.every((meta) => meta.fromCache),
              totalMatchingOnEbay: metas.reduce((total, meta) => total + meta.totalMatchingOnEbay, 0),
              fetchedAt: new Date().toISOString(),
              warnings: [...new Set(metas.flatMap((meta) => meta.warnings))],
              excludedByTerms: metas.reduce((total, meta) => total + meta.excludedByTerms, 0),
            }
          : null,
        // Every search failing is an error; some failing is a partial result.
        error:
          results.length === 0
            ? {
                error: 'None of those searches completed.',
                recovery: 'Check the connection status, then try again.',
                kind: 'upstreamUnavailable',
              }
            : null,
      }));
    },
    [],
  );

  /** Loads the bundled example set, clearly flagged as such. */
  const showExample = useCallback((analysis: AnalysisResult, description: string) => {
    runId.current += 1;
    setState({
      loading: false,
      analysis,
      meta: {
        apiCallsUsed: 0,
        fromCache: false,
        totalMatchingOnEbay: analysis.listingsScanned,
        fetchedAt: new Date().toISOString(),
        warnings: [],
        excludedByTerms: 0,
      },
      error: null,
      isExample: true,
      description,
      focusItemId: null,
      progress: [],
    });
  }, []);

  return { ...state, scan, scanMany, showExample, reset };
}
