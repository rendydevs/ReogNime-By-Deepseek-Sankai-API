import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LibraryDialogProvider } from './components/LibraryDialog';
import { AllAnimePage } from './pages/AllAnimePage';
import { AnimeDetailPage } from './pages/AnimeDetailPage';
import { ApiPage } from './pages/ApiPage';
import { ArchivePage } from './pages/ArchivePage';
import { CatalogPage } from './pages/CatalogPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { GenrePage, GenresPage } from './pages/GenresPage';
import { HomePage } from './pages/HomePage';
import { LibraryPage } from './pages/LibraryPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SearchPage } from './pages/SearchPage';
import { WatchAnimePage } from './pages/WatchAnimePage';
import { WatchEpisodePage } from './pages/WatchEpisodePage';
import { WatchSchedulePage } from './pages/WatchSchedulePage';
import { trackPageview } from './lib/analytics';

function PageviewTracker() {
  const location = useLocation();
  useEffect(() => {
    // Let the page update its document title before GA4 records the view.
    const timer = window.setTimeout(trackPageview, 0);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.search]);
  return null;
}

export function App() {
  return (
    <LibraryDialogProvider>
      <PageviewTracker />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="ongoing" element={<CatalogPage kind="ongoing" />} />
          <Route path="completed" element={<CatalogPage kind="completed" />} />
          <Route path="schedule" element={<WatchSchedulePage />} />
          <Route path="genres" element={<GenresPage />} />
          <Route path="genre/:slug" element={<GenrePage />} />
          <Route path="all" element={<AllAnimePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="watch" element={<Navigate to="/" replace />} />
          <Route path="watch/schedule" element={<Navigate to="/schedule" replace />} />
          <Route path="watch/anime/:slug" element={<WatchAnimePage />} />
          <Route path="watch/episode/:slug" element={<WatchEpisodePage />} />
          <Route path="archive" element={<ArchivePage />} />
          <Route path="discover" element={<DiscoverPage />} />
          <Route path="anime/:id" element={<AnimeDetailPage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="developers" element={<ApiPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </LibraryDialogProvider>
  );
}
