import { useCallback, useEffect, useState } from 'react';

const SEARCH_KEY = 'reognime-recent-search-v1';
const SEARCH_EVENT = 'reognime-recent-search';

function readSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SEARCH_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 6) : [];
  } catch {
    return [];
  }
}

function emitSearchChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SEARCH_EVENT));
}

export function addRecentSearch(value: string) {
  const term = value.trim().replace(/\s+/g, ' ');
  if (term.length < 2 || typeof window === 'undefined') return;
  const next = [term, ...readSearches().filter((item) => item.toLowerCase() !== term.toLowerCase())].slice(0, 6);
  try {
    window.localStorage.setItem(SEARCH_KEY, JSON.stringify(next));
    emitSearchChange();
  } catch {}
}

export function clearRecentSearches() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SEARCH_KEY);
    emitSearchChange();
  } catch {}
}

export function useRecentSearches() {
  const [items, setItems] = useState<string[]>(readSearches);

  useEffect(() => {
    const update = () => setItems(readSearches());
    window.addEventListener('storage', update);
    window.addEventListener(SEARCH_EVENT, update);
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener(SEARCH_EVENT, update);
    };
  }, []);

  const clear = useCallback(() => clearRecentSearches(), []);
  return { items, clear };
}
