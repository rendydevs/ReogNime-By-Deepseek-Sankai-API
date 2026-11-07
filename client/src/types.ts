export type LibraryStatus = 'WATCHING' | 'PLANNING' | 'COMPLETED' | 'ON_HOLD' | 'DROPPED';
export type AnimeStatus = 'FINISHED' | 'RELEASING' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS';
export type AnimeFormat = 'TV' | 'MOVIE' | 'OVA' | 'ONA' | 'SPECIAL' | 'MUSIC';
export type Season = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';

export interface AiringEpisode {
  episode: number;
  airingAt: string;
}

export interface AnimeSummary {
  id: number;
  slug: string;
  title: string;
  originalTitle: string;
  nativeTitle: string;
  cover: string | null;
  banner: string | null;
  accent: string;
  score: number | null;
  popularity: number;
  episodes: number | null;
  duration: number | null;
  status: AnimeStatus;
  format: AnimeFormat;
  season: Season | null;
  seasonYear: number | null;
  startDate: string | null;
  genres: string[];
  studios: string[];
  nextAiringEpisode: AiringEpisode | null;
}

export interface Character {
  id: number;
  name: string;
  role: 'Main' | 'Supporting';
  image: string | null;
}

export interface Anime extends AnimeSummary {
  synopsis: string;
  meanScore: number | null;
  favorites: number;
  chapters: number | null;
  volumes: number | null;
  source: string;
  endDate: string | null;
  trailer: { id: string; site: 'youtube' } | null;
  characters: Character[];
  related: AnimeSummary[];
  episodeTracker: {
    available: boolean;
    totalEpisodes: number | null;
    nextEpisode: number | null;
  };
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface SpotlightAnime extends AnimeSummary {
  synopsis: string;
  trailer: { id: string; site: 'youtube' } | null;
}

export interface GenreCount {
  name: string;
  count: number;
}

export interface HomePayload {
  spotlight: SpotlightAnime[];
  trending: AnimeSummary[];
  topRated: AnimeSummary[];
  newReleases: AnimeSummary[];
  season: {
    season: Season;
    year: number;
    titles: AnimeSummary[];
    count: number;
  };
  genres: GenreCount[];
  stats: {
    titles: number;
    episodes: number;
    genres: number;
    earliestYear: number;
    latestYear: number;
  };
}

export interface LibraryEntry {
  animeId: number;
  status: LibraryStatus;
  score: number | null;
  progress: number;
  notes: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  anime: AnimeSummary | null;
}

export interface LibraryStats {
  total: number;
  statusCounts: Record<LibraryStatus, number>;
  episodesWatched: number;
  minutesWatched: number;
  hoursWatched: number;
  daysWatched: number;
  meanScore: number | null;
  scoredTitles: number;
  favorites: number;
  completionRate: number;
  topGenres: GenreCount[];
}

export interface LibraryPayload {
  data: LibraryEntry[];
  meta: { total: number; stats: LibraryStats };
}

export interface Episode {
  number: number;
  title: string;
  airDate: string | null;
  duration: number | null;
  aired: boolean;
}

export interface EpisodesPayload {
  data: Episode[];
  pagination: PageMeta;
  meta: {
    totalEpisodes: number | null;
    nextAiringEpisode: AiringEpisode | null;
  };
}

export interface FilterOptions {
  genres: GenreCount[];
  years: number[];
  formats: { value: AnimeFormat; count: number }[];
  seasons: { value: Season; count: number }[];
  statuses: { value: AnimeStatus; count: number }[];
  sorts: { value: DiscoverSort; label: string }[];
}

export type DiscoverSort = 'popularity' | 'score' | 'newest' | 'favorites' | 'title';

export interface DiscoverFilters {
  q: string;
  genre: string;
  year: string;
  season: string;
  format: string;
  status: string;
  sort: DiscoverSort;
}

/* ---------- Streaming watch layer ---------- */

export interface OtakuPagination {
  currentPage: number;
  hasPrevPage: boolean;
  prevPage: number | null;
  hasNextPage: boolean;
  nextPage: number | null;
  totalPages: number;
}

export interface OtakuGenre {
  name: string;
  slug: string;
}

export interface OtakuCard {
  slug: string;
  title: string;
  poster: string | null;
  sourceUrl: string | null;
  status: string | null;
  episodes: number | null;
  score: number | null;
  type: string | null;
  season: string | null;
  studios: string[];
  releaseDay: string | null;
  latestReleaseDate: string | null;
  genres: OtakuGenre[];
  synopsis: string[];
}

export interface OtakuHome {
  ongoing: OtakuCard[];
  completed: OtakuCard[];
  featured: OtakuCard | null;
}

export interface OtakuListMeta {
  pagination: OtakuPagination | null;
  section?: string;
  genre?: string;
  query?: string;
}

export interface OtakuEpisodeNav {
  slug: string;
  label: string;
}

export interface OtakuEpisodeSummary {
  slug: string;
  title: string;
  number: number | null;
  date: string | null;
}

export interface OtakuDownloadMirror {
  name: string;
  url: string;
}

export interface OtakuDownloadQuality {
  quality: string;
  size: string | null;
  urls: OtakuDownloadMirror[];
}

export interface OtakuDownloadGroup {
  format: string;
  qualities: OtakuDownloadQuality[];
}

export interface OtakuEpisodeServer {
  name: string;
  id: string;
}

export interface OtakuServerGroup {
  quality: string;
  servers: OtakuEpisodeServer[];
}

export interface OtakuAnimeDetail extends OtakuCard {
  japanese: string | null;
  producers: string[];
  duration: string | null;
  aired: string | null;
  batch: { slug: string; title: string } | null;
  episodeList: OtakuEpisodeSummary[];
  recommendations: OtakuCard[];
}

export interface OtakuBatch {
  slug: string;
  title: string;
  poster: string | null;
  sourceUrl: string | null;
  japanese: string | null;
  score: number | null;
  type: string | null;
  episodes: number | null;
  duration: string | null;
  studios: string[];
  producers: string[];
  aired: string | null;
  genres: OtakuGenre[];
  downloads: OtakuDownloadGroup[];
}

export interface OtakuEpisodePage {
  slug: string;
  title: string;
  animeSlug: string;
  releaseTime: string | null;
  defaultStreamingUrl: string | null;
  previous: OtakuEpisodeNav | null;
  next: OtakuEpisodeNav | null;
  servers: OtakuServerGroup[];
  downloads: OtakuDownloadGroup[];
  info: {
    credit: string | null;
    encoder: string | null;
    duration: string | null;
    type: string | null;
    genres: OtakuGenre[];
  };
  episodes: OtakuEpisodeSummary[];
}

export interface OtakuScheduleDay {
  day: string;
  animeList: Pick<OtakuCard, 'slug' | 'title' | 'poster' | 'sourceUrl'>[];
}

export interface OtakuUnlimitedGroup {
  letter: string;
  animeList: { slug: string; title: string }[];
}
