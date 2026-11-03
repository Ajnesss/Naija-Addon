// Looks up a title's details from Cinemeta (the metadata service Stremio and
// Nuvio use for IMDb IDs). Used to (a) recognise Nigerian titles so the addon
// stays silent for everything else, and (b) get the runtime for matching.

const BASE = 'https://v3-cinemeta.strem.io';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE = 5000;

export function createCinemeta({ fetchImpl = fetch, now = () => Date.now() } = {}) {
  const cache = new Map();

  async function getMeta(type, imdbId) {
    const key = `${type}:${imdbId}`;
    const hit = cache.get(key);
    if (hit && hit.expires > now()) return hit.value;
    let value = null;
    let ttl = MISS_TTL_MS;
    try {
      const response = await fetchImpl(`${BASE}/meta/${type}/${imdbId}.json`, { signal: AbortSignal.timeout(6000) });
      if (response.ok) {
        const body = await response.json();
        value = body?.meta ?? null;
        if (value) ttl = TTL_MS;
      }
    } catch {
      value = null;
    }
    if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
    cache.set(key, { value, expires: now() + ttl });
    return value;
  }

  return { getMeta };
}

export function isNigerian(meta) {
  return /nigeria/i.test(String(meta?.country ?? ''));
}

export function runtimeMinutes(meta) {
  const match = /(\d+)/.exec(String(meta?.runtime ?? ''));
  return match ? Number(match[1]) : null;
}
