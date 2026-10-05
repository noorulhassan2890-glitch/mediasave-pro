/**
 * Browser persistence: download history + theme preference (localStorage).
 * All access is guarded — localStorage can be unavailable (private mode).
 */

import type { HistoryItem } from './types';

const HISTORY_KEY = 'mediasave.history.v1';
const THEME_KEY = 'mediasave.theme';
const MAX_HISTORY = 12;

/** Read the download history (newest first). */
export function getHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const list = raw ? (JSON.parse(raw) as HistoryItem[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Prepend an entry, de-duplicate by URL, cap the length. */
export function addHistory(item: HistoryItem): HistoryItem[] {
  const next = [item, ...getHistory().filter((h) => h.url !== item.url)].slice(0, MAX_HISTORY);
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode — history is a nice-to-have, ignore failures */
  }
  return next;
}

export function removeHistory(id: string): HistoryItem[] {
  const next = getHistory().filter((h) => h.id !== id);
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function clearHistory(): void {
  try {
    window.localStorage.removeItem(HISTORY_KEY);
  } catch {
    /* ignore */
  }
}

// --------------------------------------------------------------------------- #
// Theme (dark / light)
// --------------------------------------------------------------------------- #
export type Theme = 'light' | 'dark';

export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

export function storeTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
}
