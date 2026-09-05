/**
 * Shortlisted opportunities.
 *
 * Deliberately not an inventory system. It records what you were looking
 * at, what you thought, and where you got to, and nothing else.
 *
 * "Purchased" is a note to yourself. It never places an order, and this
 * app has no ability to buy anything.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Opportunity } from '../market/analyse';
import { readArray, storageAvailable, writeJson } from './storage';

export type SavedStatus = 'interested' | 'purchased' | 'passed';

export const STATUS_LABELS: Record<SavedStatus, string> = {
  interested: 'Interested',
  purchased: 'Purchased',
  passed: 'Passed',
};

/**
 * A saved assessment is a snapshot. Prices and availability move, so the
 * figures are stamped with when they were true.
 */
export interface SavedItem {
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  query: string;
  savedAt: string;
  status: SavedStatus;
  note: string;

  snapshot: {
    itemPrice: number;
    deliveryCost: number | null;
    acquisitionCost: number;
    referenceValue: number;
    profit: number;
    roi: number | null;
    maxItemPrice: number;
    priceBasis: Opportunity['priceBasis'];
    evidenceStrength: string;
  };

  /** Set by a refresh. Absent until one has been run. */
  refresh?: {
    checkedAt: string;
    currentItemPrice: number | null;
    stillAvailable: boolean;
  };
}

const KEY = 'saved';

/** A snapshot older than this is called out as stale. */
export const STALE_AFTER_DAYS = 3;

export function isStale(item: SavedItem, now = Date.now()): boolean {
  const reference = item.refresh?.checkedAt ?? item.savedAt;
  const age = now - Date.parse(reference);
  return Number.isFinite(age) && age > STALE_AFTER_DAYS * 86_400_000;
}

export function toSavedItem(opportunity: Opportunity, query: string, evidenceStrength: string): SavedItem {
  return {
    id: opportunity.id,
    title: opportunity.title,
    url: opportunity.url,
    imageUrl: opportunity.imageUrl,
    query,
    savedAt: new Date().toISOString(),
    status: 'interested',
    note: '',
    snapshot: {
      itemPrice: opportunity.itemPrice,
      deliveryCost: opportunity.deliveryCost,
      acquisitionCost: opportunity.acquisitionCost,
      referenceValue: opportunity.maths.netReceipts + opportunity.maths.fees.total,
      profit: opportunity.maths.profit,
      roi: opportunity.maths.roi,
      maxItemPrice: opportunity.maxItemPrice,
      priceBasis: opportunity.priceBasis,
      evidenceStrength,
    },
  };
}

export function useSavedItems() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [persists, setPersists] = useState(true);

  useEffect(() => {
    setItems(readArray<SavedItem>(KEY));
    setPersists(storageAvailable());
    setHydrated(true);
  }, []);

  const commit = useCallback((next: SavedItem[]) => {
    setItems(next);
    writeJson(KEY, next);
  }, []);

  const save = useCallback(
    (item: SavedItem) => {
      setItems((current) => {
        // Re-saving refreshes the snapshot but keeps your own words.
        const existing = current.find((candidate) => candidate.id === item.id);
        const merged = existing ? { ...item, note: existing.note, status: existing.status } : item;
        const next = [merged, ...current.filter((candidate) => candidate.id !== item.id)];
        writeJson(KEY, next);
        return next;
      });
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setItems((current) => {
      const next = current.filter((item) => item.id !== id);
      writeJson(KEY, next);
      return next;
    });
  }, []);

  const patch = useCallback((id: string, changes: Partial<SavedItem>) => {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...changes } : item));
      writeJson(KEY, next);
      return next;
    });
  }, []);

  return { items, hydrated, persists, save, remove, patch, commit };
}
