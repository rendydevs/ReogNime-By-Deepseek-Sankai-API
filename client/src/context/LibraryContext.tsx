import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { LibraryEntry, LibraryStats } from '../types';

interface LibraryContextValue {
  entries: LibraryEntry[];
  stats: LibraryStats;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  getEntry: (animeId: number) => LibraryEntry | undefined;
  refresh: () => Promise<void>;
  addEntry: (input: Parameters<typeof api.createLibrary>[0]) => Promise<LibraryEntry>;
  updateEntry: (animeId: number, patch: Parameters<typeof api.updateLibrary>[1]) => Promise<LibraryEntry>;
  removeEntry: (animeId: number) => Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

const emptyStats: LibraryStats = {
  total: 0,
  statusCounts: { WATCHING: 0, PLANNING: 0, COMPLETED: 0, ON_HOLD: 0, DROPPED: 0 },
  episodesWatched: 0,
  minutesWatched: 0,
  hoursWatched: 0,
  daysWatched: 0,
  meanScore: null,
  scoredTitles: 0,
  favorites: 0,
  completionRate: 0,
  topGenres: [],
};

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [stats, setStats] = useState<LibraryStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const payload = await api.library();
      setEntries(payload.data);
      setStats(payload.meta.stats);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load your library.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const getEntry = useCallback((animeId: number) => entries.find((entry) => entry.animeId === animeId), [entries]);

  const addEntry = useCallback(
    async (input: Parameters<typeof api.createLibrary>[0]) => {
      const result = await api.createLibrary(input);
      await refresh();
      return result.data;
    },
    [refresh],
  );

  const updateEntry = useCallback(
    async (animeId: number, patch: Parameters<typeof api.updateLibrary>[1]) => {
      const result = await api.updateLibrary(animeId, patch);
      await refresh();
      return result.data;
    },
    [refresh],
  );

  const removeEntry = useCallback(
    async (animeId: number) => {
      await api.deleteLibrary(animeId);
      await refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({ entries, stats, loading, refreshing, error, getEntry, refresh, addEntry, updateEntry, removeEntry }),
    [entries, stats, loading, refreshing, error, getEntry, refresh, addEntry, updateEntry, removeEntry],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) throw new Error('useLibrary must be used inside LibraryProvider');
  return context;
}
