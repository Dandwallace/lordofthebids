/**
 * Browser storage helpers.
 *
 * WHAT THIS MEANS FOR YOU: preferences and saved opportunities live in
 * this browser only. They are not on a server and not in an account, so
 * they do not follow you to another device or another browser, and
 * clearing site data erases them. The app says so on the Saved screen
 * rather than letting you discover it the hard way.
 *
 * There is no database in this project yet. When one arrives, this module
 * is the single seam to replace.
 *
 * Nothing sensitive is stored here. eBay credentials live on the server
 * and never reach the browser, so they can never end up in this store.
 */

const PREFIX = 'lotb.v1.';

export function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as object) } as T;
  } catch {
    // Private mode, disabled storage, or corrupt JSON: carry on with defaults.
    return fallback;
  }
}

export function readArray<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function writeJson(key: string, value: unknown): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    // Quota exceeded or storage blocked. The app keeps working in memory.
    return false;
  }
}

/** True when this browser will actually keep what we write. */
export function storageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const probe = `${PREFIX}probe`;
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
