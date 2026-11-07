import { API_BASE } from './api';

/**
 * Artwork is stored as a root-relative path by the API. When the frontend is
 * pointed at a remote API (VITE_API_BASE_URL), resolve it against that API
 * origin instead of the frontend origin.
 */
export function mediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (!path.startsWith('/') || !API_BASE.startsWith('http')) return path;
  try {
    return new URL(path, API_BASE).toString();
  } catch {
    return path;
  }
}
