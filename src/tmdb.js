// TMDB-backed discovery catalogue.
//
// This module only provides *metadata* (titles, posters, descriptions) and
// IMDb IDs. It never resolves or returns streams. Nuvio takes the IMDb ID and
// asks whatever stream addons the user has installed, exactly as for any other
// title.

const API = 'https://api.themoviedb.org/3';
const IMAGE = 'https://image.tmdb.org/t/p';
const LIST_TTL_MS = 6 * 60 * 60 * 1000;
const ID_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PAGE_SIZE = 20; // TMDB returns 20 results per page
const MAX_CACHE = 5000;
const MAX_PAGES = 15;

// catalogue prefix -> TMDB filters
const CATALOGUE_FILTERS = {
  nollywood: { country: 'NG' },
  english: { country: 'NG', language: 'en' },
  yoruba: { country: 'NG', language: 'yo' },
  igbo: { country: 'NG', language: 'ig' },
  hausa: { country: 'NG', language: 'ha' }
};

function bounded(map) {
  if (map.size > MAX_CACHE) map.delete(map.keys().next().value);
  return map;
}

export function createTmdbCatalogue({ apiKey, fetchImpl = fetch, now = () => Date.now() } = {}) {
  if (!apiKey) return null;
  const isBearer = apiKey.startsWith('eyJ');
  const listCache = new Map();
  const idCache = new Map();

  async function tmdb(path, params = {}) {
    const url = new URL(API + path);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }
    const headers = { accept: 'application/json' };
    if (isBearer) headers.authorization = `Bearer ${apiKey}`;
    else url.searchParams.set('api_key', apiKey);
    const response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`TMDB ${path} responded ${response.status}`);
    return response.json();
  }

  async function imdbIdFor(type, tmdbId) {
    const key = `${type}:${tmdbId}`;
    const hit = idCache.get(key);
    if (hit && hit.expires > now()) return hit.value;
    let value = null;
    try {
      const path = type === 'movie' ? `/movie/${tmdbId}/external_ids` : `/tv/${tmdbId}/external_ids`;
      const body = await tmdb(path);
      value = typeof body.imdb_id === 'string' && /^tt\d+$/.test(body.imdb_id) ? body.imdb_id : null;
    } catch {
      return null; // do not cache transient failures
    }
    bounded(idCache).set(key, { value, expires: now() + ID_TTL_MS });
    return value;
  }

  function toMeta(type, entry, imdbId) {
    const date = type === 'movie' ? entry.release_date : entry.first_air_date;
    const meta = {
      id: imdbId,
      type,
      name: type === 'movie' ? entry.title : entry.name,
      poster: entry.poster_path ? `${IMAGE}/w500${entry.poster_path}` : undefined,
      background: entry.backdrop_path ? `${IMAGE}/w1280${entry.backdrop_path}` : undefined,
      description: entry.overview || undefined,
      releaseInfo: date ? date.slice(0, 4) : undefined,
      posterShape: 'poster'
    };
    for (const key of Object.keys(meta)) if (meta[key] === undefined || meta[key] === '') delete meta[key];
    return meta;
  }

  async function withImdbIds(type, entries) {
    const resolved = await Promise.all(entries.map(async (entry) => {
      const imdbId = await imdbIdFor(type, entry.id);
      return imdbId ? toMeta(type, entry, imdbId) : null;
    }));
    const seen = new Set();
    return resolved.filter((meta) => meta && !seen.has(meta.id) && seen.add(meta.id));
  }

  // Search has no country filter, so confirm each hit is Nigerian before showing it.
  async function isNigerian(type, entry) {
    try {
      const details = await tmdb(type === 'movie' ? `/movie/${entry.id}` : `/tv/${entry.id}`);
      if (type === 'movie') return (details.production_countries ?? []).some((c) => c.iso_3166_1 === 'NG');
      return (details.origin_country ?? []).includes('NG') ||
        (details.production_countries ?? []).some((c) => c.iso_3166_1 === 'NG');
    } catch {
      return false;
    }
  }

  async function fetchPage(type, prefix, filter, search, page) {
    const cacheKey = `${type}|${prefix}|${search.toLowerCase()}|${page}`;
    const hit = listCache.get(cacheKey);
    if (hit && hit.expires > now()) return hit.value;

    const kind = type === 'movie' ? 'movie' : 'tv';
    let metas;
    let totalPages;
    if (search) {
      const found = await tmdb(`/search/${kind}`, { query: search, page, include_adult: 'false' });
      totalPages = found.total_pages ?? 1;
      let candidates = found.results ?? [];
      if (filter.language) candidates = candidates.filter((e) => e.original_language === filter.language);
      const checks = await Promise.all(candidates.map((entry) => isNigerian(type, entry)));
      metas = await withImdbIds(type, candidates.filter((_, i) => checks[i]));
    } else {
      const found = await tmdb(`/discover/${kind}`, {
        with_origin_country: filter.country,
        with_original_language: filter.language,
        sort_by: 'popularity.desc',
        include_adult: 'false',
        page
      });
      totalPages = found.total_pages ?? 1;
      metas = await withImdbIds(type, found.results ?? []);
    }
    const value = { metas, totalPages };
    bounded(listCache).set(cacheKey, { value, expires: now() + LIST_TTL_MS });
    return value;
  }

  // Titles without an IMDb ID are dropped, so TMDB pages do not map 1:1 onto
  // client pages. Accumulate pages until the requested window is covered.
  async function list(type, catalogId, { search = '', skip = 0 } = {}) {
    const prefix = catalogId.replace(/-movies$|-series$/, '');
    const filter = CATALOGUE_FILTERS[prefix];
    if (!filter) return [];
    const wanted = skip + PAGE_SIZE;
    const collected = [];
    const seen = new Set();
    for (let page = 1; page <= MAX_PAGES && collected.length < wanted; page += 1) {
      const { metas, totalPages } = await fetchPage(type, prefix, filter, search, page);
      for (const meta of metas) if (!seen.has(meta.id)) { seen.add(meta.id); collected.push(meta); }
      if (page >= totalPages) break;
    }
    return collected.slice(skip, wanted);
  }

  return { list, PAGE_SIZE };
}
