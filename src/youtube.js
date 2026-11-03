// Finds full-length uploads of a title on YouTube using the official YouTube
// Data API (needs a free API key). Only returns a video when its title matches,
// its length fits the film/episode, and it is not a trailer, clip or review.

const API = 'https://www.googleapis.com/youtube/v3';
const HIT_TTL_MS = 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE = 2000;

const REJECT = /\b(trailer|teaser|review|reaction|reacts|behind the scenes|bts|interview|premiere|soundtrack|ost|song|music video|snippet|promo|recap|explained|ending explained)\b/;

export function normalise(text) {
  return String(text ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function parseIsoDuration(iso) {
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(String(iso ?? ''));
  if (!match) return 0;
  const [, d = 0, h = 0, m = 0, s = 0] = match.map((v) => (v === undefined ? undefined : Number(v)));
  return d * 1440 + h * 60 + m + s / 60;
}

function episodeMatches(title, season, episode) {
  const t = normalise(title);
  const episodeRe = new RegExp(`\\b(?:episode|ep|e)\\s*0*${episode}\\b`);
  if (!episodeRe.test(t) && !new RegExp(`\\bs\\s*0*${season}\\s*e\\s*0*${episode}\\b`).test(t)) return false;
  const seasonMatch = /\b(?:season|s)\s*0*(\d{1,2})\b/.exec(t);
  if (seasonMatch) return Number(seasonMatch[1]) === season;
  return season === 1; // no season stated: assume season 1
}

// Pure ranking function so it can be tested without any network.
export function rankVideos(target, videos) {
  const wanted = normalise(target.name);
  if (!wanted) return [];
  const isEpisode = target.type === 'series';
  const runtime = target.runtimeMinutes;
  const scored = [];

  for (const video of videos) {
    const title = normalise(video.title);
    if (!title.includes(wanted)) continue;
    if (REJECT.test(title)) continue;

    const minutes = video.minutes;
    if (isEpisode) {
      if (minutes < 15 || minutes > 150) continue;
      if (!episodeMatches(video.title, target.season, target.episode)) continue;
    } else {
      const minimum = Math.max(60, runtime ? runtime * 0.7 : 0);
      if (minutes < minimum) continue;
      if (runtime && minutes > runtime * 1.5 + 15) continue; // compilations
      const years = (title.match(/\b(19|20)\d{2}\b/g) ?? []).map(Number);
      if (target.year && years.length && !years.some((y) => Math.abs(y - target.year) <= 1)) continue;
    }

    let score = 0;
    if (/\bfull (movie|film|episode)\b/.test(title)) score += 3;
    if (!isEpisode && runtime && Math.abs(minutes - runtime) / runtime < 0.12) score += 2;
    score += Math.log10(Math.max(1, video.views));
    scored.push({ ...video, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, 3);
}

export function createYoutubeFinder({ apiKey, fetchImpl = fetch, now = () => Date.now(), dailySearchLimit = 80 } = {}) {
  if (!apiKey) return null;
  const cache = new Map();
  let day = new Date(now()).toISOString().slice(0, 10);
  let searchesToday = 0;

  async function call(path, params) {
    const url = new URL(API + path);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
    url.searchParams.set('key', apiKey);
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`YouTube ${path} responded ${response.status}`);
    return response.json();
  }

  function withinBudget() {
    const today = new Date(now()).toISOString().slice(0, 10);
    if (today !== day) { day = today; searchesToday = 0; }
    if (searchesToday >= dailySearchLimit) return false;
    searchesToday += 1; // each search costs 100 of the free 10,000 daily quota units
    return true;
  }

  async function find(target) {
    const key = [target.type, target.imdbId, target.season ?? '', target.episode ?? ''].join('|');
    const hit = cache.get(key);
    if (hit && hit.expires > now()) return hit.value;
    if (!withinBudget()) return [];

    const query = target.type === 'series'
      ? `${target.name} season ${target.season} episode ${target.episode}`
      : `${target.name} ${target.year ?? ''} full movie`.trim();
    const search = await call('/search', {
      part: 'snippet', type: 'video', maxResults: 10, q: query, videoEmbeddable: 'true',
      ...(target.type === 'movie' ? { videoDuration: 'long' } : {})
    });
    const ids = (search.items ?? []).map((item) => item?.id?.videoId).filter(Boolean);
    let ranked = [];
    if (ids.length) {
      const details = await call('/videos', { part: 'contentDetails,snippet,statistics', id: ids.join(',') });
      const videos = (details.items ?? []).map((item) => ({
        id: item.id,
        title: item.snippet?.title ?? '',
        channel: item.snippet?.channelTitle ?? '',
        minutes: parseIsoDuration(item.contentDetails?.duration),
        views: Number(item.statistics?.viewCount ?? 0)
      }));
      ranked = rankVideos(target, videos);
    }
    if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
    cache.set(key, { value: ranked, expires: now() + (ranked.length ? HIT_TTL_MS : MISS_TTL_MS) });
    return ranked;
  }

  return { find };
}
