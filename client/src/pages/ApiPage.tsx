import { ArrowUpRight, Check, Copy, ExternalLink, Terminal } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { API_BASE, API_HEALTH_URL } from '../lib/api';
import { useDocumentTitle } from '../lib/hooks';

interface Endpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  title: string;
  description: string;
}

const ENDPOINT_GROUPS: { label: string; note: string; endpoints: Endpoint[] }[] = [
  {
    label: 'Discovery',
    note: 'Public, read-only, cached for 30–300 seconds.',
    endpoints: [
      { method: 'GET', path: '/home', title: 'Editorial home', description: 'Spotlight, trending, top-rated, new releases, genres and catalog totals in one payload.' },
      { method: 'GET', path: '/anime', title: 'List & search', description: 'Paginated search with q, genre, year, season, format, status, minScore and sort.' },
      { method: 'GET', path: '/anime/:id', title: 'Title detail', description: 'Full metadata, synopsis, characters, trailer, related titles and episode tracker.' },
      { method: 'GET', path: '/anime/:id/episodes', title: 'Episode index', description: 'Paginated episode list with air dates and durations.' },
      { method: 'GET', path: '/anime/:id/related', title: 'Related titles', description: 'Genre, studio and era affinity, ranked for relevance.' },
      { method: 'GET', path: '/search/suggestions', title: 'Typeahead', description: 'Lightweight suggestions for command palettes. Empty q returns popular picks.' },
      { method: 'GET', path: '/random', title: 'Random pick', description: 'Accepts the same filters as /anime and returns one matching title.' },
    ],
  },
  {
    label: 'Library',
    note: 'A single local profile. JSON persistence, no account required.',
    endpoints: [
      { method: 'GET', path: '/library', title: 'Read the list', description: 'Entries joined with anime summaries and aggregate stats.' },
      { method: 'POST', path: '/library', title: 'Add a title', description: 'Create an entry with status, score, progress, notes and favourite flag.' },
      { method: 'GET', path: '/library/:animeId', title: 'Read one entry', description: 'A single library entry with its joined anime summary.' },
      { method: 'PATCH', path: '/library/:animeId', title: 'Update an entry', description: 'Partial update. Completing a title fills progress to the episode count.' },
      { method: 'DELETE', path: '/library/:animeId', title: 'Remove an entry', description: 'Deletes the entry and returns 204.' },
      { method: 'GET', path: '/library/stats', title: 'Stats only', description: 'Status counts, episodes and hours watched, mean score and top genres.' },
      { method: 'GET', path: '/library/export', title: 'Export JSON', description: 'Download the full library as a portable JSON document.' },
    ],
  },
  {
    label: 'Streaming',
    note: 'The live watch API, sourced from the Otakudesu API. All twelve endpoints are wired into the UI and rate-guarded by the ReogNime server.',
    endpoints: [
      { method: 'GET', path: '/otakudesu/home', title: 'Streaming home', description: 'Ongoing and completed lists plus a featured ongoing title.' },
      { method: 'GET', path: '/otakudesu/ongoing', title: 'Ongoing anime', description: 'Paginated currently airing titles. Optional ?page=1.' },
      { method: 'GET', path: '/otakudesu/completed', title: 'Completed anime', description: 'Paginated finished series. Optional ?page=1.' },
      { method: 'GET', path: '/otakudesu/schedule', title: 'Release schedule', description: 'Airing titles grouped by day of the week.' },
      { method: 'GET', path: '/otakudesu/search', title: 'Search streaming titles', description: 'Search titles by keyword. Required: ?q=frieren.' },
      { method: 'GET', path: '/otakudesu/genres', title: 'Streaming genres', description: 'All streaming genres with their slugs.' },
      { method: 'GET', path: '/otakudesu/genres/:slug', title: 'Anime by genre', description: 'Paginated genre results. Example: /otakudesu/genres/action?page=1.' },
      { method: 'GET', path: '/otakudesu/anime/:slug', title: 'Series detail', description: 'Synopsis, metadata, genres, episode list, related titles and batch reference.' },
      { method: 'GET', path: '/otakudesu/episode/:slug', title: 'Episode + mirrors', description: 'Streaming servers, downloadable qualities, prev/next episode and episode list.' },
      { method: 'GET', path: '/otakudesu/batch/:slug', title: 'Batch downloads', description: 'Batch qualities, sizes and mirror links for a complete series.' },
      { method: 'GET', path: '/otakudesu/server/:serverId', title: 'Resolve embed URL', description: 'Turn a mirror server id into an embeddable player URL.' },
      { method: 'GET', path: '/otakudesu/unlimited', title: 'All anime (A–Z)', description: 'Every streaming title, grouped by initial.' },
      { method: 'GET', path: '/otakudesu/status', title: 'Provider status', description: 'Cache size, artwork index size, and current upstream request budget.' },
    ],
  },
  {
    label: 'Reference',
    note: 'Everything needed to build a dynamic interface.',
    endpoints: [
      { method: 'GET', path: '/genres', title: 'Genres', description: 'Genre names with title counts.' },
      { method: 'GET', path: '/filters', title: 'Filter options', description: 'Years, formats, seasons, statuses and supported sort values.' },
      { method: 'GET', path: '/meta', title: 'Catalog metadata', description: 'Source, counts and API version information.' },
      { method: 'GET', path: '/openapi.json', title: 'OpenAPI 3.1', description: 'A complete machine-readable specification for the API.' },
    ],
  },
];

const METHOD_CLASS: Record<Endpoint['method'], string> = {
  GET: 'method-get',
  POST: 'method-post',
  PATCH: 'method-patch',
  DELETE: 'method-delete',
};

export function ApiPage() {
  useDocumentTitle('API reference');
  const { notify } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const base = API_BASE.startsWith('http') ? API_BASE : `${window.location.origin}${API_BASE}`;
  const openApiUrl = `${base}/openapi.json`;

  const copy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1800);
    } catch {
      notify('Clipboard access was blocked by the browser.', { tone: 'info' });
    }
  };

  const quickStart = `# The whole shelf in one request
curl "${base}/home"

# Search with filters
curl "${base}/anime?genre=Drama&sort=score&limit=3"

# Streaming layer
curl "${base}/otakudesu/home"
curl "${base}/otakudesu/search?q=frieren"

# Add a title to your list
curl -X POST "${base}/library" \\
  -H "Content-Type: application/json" \\
  -d '{"animeId": 154587, "status": "WATCHING"}'`;

  const responseShape = `{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}`;

  return (
    <div className="api-page">
      <header className="api-masthead container">
        <div className="api-masthead-copy">
          <p className="eyebrow">Developer reference / v1</p>
          <h1>The shelf,<br />as an <em>API.</em></h1>
          <p>
            The same catalog that powers ReogNime, plus the live streaming API,
            exposed as a small, predictable REST surface. No key. No SDK. No ceremony.
          </p>
        </div>
        <div className="api-terminal" aria-hidden="true">
          <div className="api-terminal-bar"><span /><span /><span /><em>GET /api/v1/home</em></div>
          <div className="api-terminal-body">
            <p><span className="terminal-prompt">$</span> curl /home</p>
            <p className="terminal-response">{'{'}</p>
            <p className="terminal-response">  "titles": 45,</p>
            <p className="terminal-response">  "genres": 18,</p>
            <p className="terminal-response">  "source": "AniList"</p>
            <p className="terminal-response">{'}'}</p>
            <p className="terminal-cursor"><span className="terminal-prompt">$</span> <span className="cursor" /></p>
          </div>
        </div>
      </header>

      <div className="api-base container">
        <div>
          <span className="eyebrow">Base URL</span>
          <code>{base}</code>
        </div>
        <button className="button button-quiet" onClick={() => void copy(base, 'base')}>
          {copied === 'base' ? <Check size={15} /> : <Copy size={15} />}
          {copied === 'base' ? 'Copied' : 'Copy'}
        </button>
        <a className="button button-outline" href={openApiUrl} target="_blank" rel="noreferrer">
          OpenAPI 3.1 <ExternalLink size={14} />
        </a>
      </div>

      <div className="api-layout container">
        <aside className="api-toc">
          <p className="eyebrow">On this page</p>
          <a href="#quick-start">Quick start</a>
          <a href="#conventions">Conventions</a>
          {ENDPOINT_GROUPS.map((group) => (
            <a key={group.label} href={`#${group.label.toLowerCase()}`}>{group.label}</a>
          ))}
          <a href="#notes">Notes</a>
          <div className="api-toc-footer">
            <Terminal size={15} />
            <span>JSON only.<br />CORS enabled.</span>
          </div>
        </aside>

        <main className="api-content">
          <section className="api-section" id="quick-start">
            <div className="api-section-head">
              <p className="section-index">01</p>
              <div>
                <h2>Quick start</h2>
                <p>Every GET endpoint is public. The library endpoints write to a local JSON file.</p>
              </div>
            </div>
            <div className="code-block">
              <div className="code-block-head">
                <span>Terminal</span>
                <button onClick={() => void copy(quickStart, 'quick')}>
                  {copied === 'quick' ? <Check size={13} /> : <Copy size={13} />}
                  {copied === 'quick' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre><code>{quickStart}</code></pre>
            </div>
            <div className="api-callout">
              <strong>Frontend integration.</strong>
              <p>
                The Vite dev server proxies <code>/api</code> to the API on port 8787, so a relative fetch works
                in development and production without a base URL:
              </p>
              <pre className="inline-code"><code>{`const res = await fetch('/api/v1/anime?genre=Drama');\nconst { data, meta } = await res.json();`}</code></pre>
            </div>
          </section>

          <section className="api-section" id="conventions">
            <div className="api-section-head">
              <p className="section-index">02</p>
              <div>
                <h2>Conventions</h2>
                <p>Small and consistent, so a frontend can be built without guesswork.</p>
              </div>
            </div>
            <div className="convention-grid">
              <div>
                <h3>Envelope</h3>
                <p>Every successful response uses <code>{'{ data }'}</code>. Lists add <code>meta</code> with pagination and filters.</p>
              </div>
              <div>
                <h3>Errors</h3>
                <p>Errors return <code>{'{ error: { code, message } }'}</code> with a useful HTTP status and optional field details.</p>
              </div>
              <div>
                <h3>Validation</h3>
                <p>Query params and bodies are validated. Invalid input returns <code>422</code> before it reaches the data layer.</p>
              </div>
              <div>
                <h3>Pagination</h3>
                <p>Use <code>page</code> and <code>limit</code> (max 50). The response always reports <code>total</code> and <code>hasNextPage</code>.</p>
              </div>
            </div>
            <div className="code-block code-block-small">
              <div className="code-block-head"><span>List response</span></div>
              <pre><code>{responseShape}</code></pre>
            </div>
          </section>

          {ENDPOINT_GROUPS.map((group, groupIndex) => (
            <section className="api-section" id={group.label.toLowerCase()} key={group.label}>
              <div className="api-section-head">
                <p className="section-index">{String(groupIndex + 3).padStart(2, '0')}</p>
                <div>
                  <h2>{group.label}</h2>
                  <p>{group.note}</p>
                </div>
              </div>
              <div className="endpoint-list">
                {group.endpoints.map((endpoint) => (
                  <div className="endpoint-row" key={`${endpoint.method}-${endpoint.path}`}>
                    <span className={`method ${METHOD_CLASS[endpoint.method]}`}>{endpoint.method}</span>
                    <div className="endpoint-main">
                      <div className="endpoint-path-line">
                        <code>{endpoint.path}</code>
                        <button
                          className="endpoint-copy"
                          onClick={() => void copy(`${base}${endpoint.path.replace(':id', '154587').replace(':animeId', '154587').replace(':slug', 'sousou-frieren-sub-indo').replace(':serverId', '6AE5C9-5-C75u')}`, endpoint.path)}
                          aria-label={`Copy ${endpoint.path}`}
                        >
                          {copied === endpoint.path ? <Check size={13} /> : <Copy size={13} />}
                        </button>
                      </div>
                      <strong>{endpoint.title}</strong>
                      <p>{endpoint.description}</p>
                    </div>
                    {endpoint.method === 'GET' && !endpoint.path.includes(':') && endpoint.path !== '/otakudesu/search' && (
                      <a
                        className="endpoint-open"
                        href={`${base}${endpoint.path}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Open response"
                      >
                        <ArrowUpRight size={15} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}

          <section className="api-section api-notes" id="notes">
            <div className="api-section-head">
              <p className="section-index">{String(ENDPOINT_GROUPS.length + 3).padStart(2, '0')}</p>
              <div>
                <h2>Notes & limits</h2>
                <p>The small print, kept small.</p>
              </div>
            </div>
            <ul>
              <li><strong>Data source.</strong> Metadata and artwork are sourced from AniList and cached locally for the demo. All rights remain with their respective holders.</li>
              <li><strong>Rate limit.</strong> 240 requests per minute per IP in the running demo. Catalog responses are cached in the browser and at the CDN boundary.</li>
              <li><strong>Streaming source.</strong> The watch layer is sourced from the public Otakudesu API, rate-guarded to 30 upstream requests per minute (the provider allows 45) and cached. Some mirrors are third-party and may be offline; ReogNime never hosts video files.</li>
              <li><strong>No auth by design.</strong> This is a local, single-profile demo. If you expose it publicly, put the library routes behind authentication at the reverse-proxy layer.</li>
              <li><strong>Persistence.</strong> Your library lives in <code>server/data/library.json</code>. Writes are atomic. Export it at any time from the button above or from <code>/library/export</code>.</li>
            </ul>
            <div className="api-notes-actions">
              <Link to="/discover" className="text-link">Browse the catalog <ArrowUpRight size={14} /></Link>
              <a href={API_HEALTH_URL} target="_blank" rel="noreferrer" className="text-link">API health <ArrowUpRight size={14} /></a>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
