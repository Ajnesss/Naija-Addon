import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { catalogItems, getItem, getVideo } from './catalog.js';

const manifest = JSON.parse(await readFile(fileURLToPath(new URL('../manifest.json', import.meta.url)), 'utf8'));

function sendJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  });
  res.end(JSON.stringify(body));
}

function toMetaPreview(item) {
  const meta = {
    id: item.id,
    type: item.type,
    name: item.name,
    poster: item.poster,
    description: item.description,
    releaseInfo: item.releaseInfo,
    genres: item.genres,
    posterShape: 'poster'
  };
  for (const key of Object.keys(meta)) {
    if (meta[key] === undefined || meta[key] === null || meta[key] === '') delete meta[key];
  }
  return meta;
}

function decodeId(value) {
  try { return decodeURIComponent(value); } catch { return null; }
}

export function createAddonServer(catalogApi = {}, { tmdb = null } = {}) {
  const listCatalogItems = catalogApi.catalogItems ?? catalogItems;
  const findItem = catalogApi.getItem ?? getItem;
  const findVideo = catalogApi.getVideo ?? getVideo;
  return http.createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (error) {
      console.error('Request failed:', error?.message ?? error);
      if (!res.headersSent) sendJson(res, 500, { error: 'Internal error' });
      else res.end();
    }
  });

  async function handle(req, res) {
    let url;
    try {
      url = new URL(req.url, 'http://localhost');
    } catch {
      return sendJson(res, 400, { error: 'Invalid request URL' });
    }
    const parts = url.pathname.split('/').filter(Boolean);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, OPTIONS',
        'access-control-allow-headers': 'content-type'
      });
      return res.end();
    }
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });
    if (url.pathname === '/health') return sendJson(res, 200, { status: 'ok', addon: manifest.id, version: manifest.version });
    if (url.pathname === '/manifest.json') return sendJson(res, 200, manifest);

    if (parts[0] === 'catalog' && (parts.length === 3 || parts.length === 4)) {
      const [, type, rawCatalogId, rawExtra] = parts;
      // /catalog/<type>/<id>.json when there are no extra args; /catalog/<type>/<id>/<extra>.json otherwise
      const catalogId = rawExtra === undefined && rawCatalogId.endsWith('.json') ? rawCatalogId.slice(0, -5) : rawCatalogId;
      if (!['movie', 'series'].includes(type)) return sendJson(res, 200, { metas: [] });
      // Stremio-compatible clients may send extra arguments as a fourth
      // path segment (search=...) rather than as a conventional query string.
      const extraPath = rawExtra?.endsWith('.json') ? rawExtra.slice(0, -5) : (rawExtra || '');
      const extra = new URLSearchParams(extraPath);
      const search = (url.searchParams.get('search') || extra.get('search') || '').slice(0, 120);
      const rawSkip = url.searchParams.get('skip') || extra.get('skip') || '0';
      const parsedSkip = Number.parseInt(rawSkip, 10);
      const skip = Number.isSafeInteger(parsedSkip) && parsedSkip > 0 ? Math.min(parsedSkip, 10000) : 0;
      const local = listCatalogItems(type, catalogId, search).slice(skip, skip + 100).map(toMetaPreview);
      let remote = [];
      if (tmdb) {
        try {
          remote = await tmdb.list(type, catalogId, { search, skip });
        } catch (error) {
          console.error('TMDB catalogue failed:', error?.message ?? error);
        }
      }
      const known = new Set(local.map((meta) => meta.id));
      return sendJson(res, 200, { metas: [...local, ...remote.filter((meta) => !known.has(meta.id))] });
    }

    if (parts[0] === 'meta' && parts.length === 3) {
      const [, type, rawId] = parts;
      const id = decodeId(rawId.endsWith('.json') ? rawId.slice(0, -5) : rawId);
      if (!id) return sendJson(res, 400, { error: 'Invalid title ID' });
      const item = findItem(id);
      if (!item || item.type !== type) return sendJson(res, 404, { error: 'Title not found' });
      const videos = (item.videos ?? []).map(({ streams, ...video }) => video);
      return sendJson(res, 200, { meta: { ...toMetaPreview(item), videos } });
    }

    if (parts[0] === 'stream' && parts.length === 3) {
      const [, type, rawId] = parts;
      const id = decodeId(rawId.endsWith('.json') ? rawId.slice(0, -5) : rawId);
      if (!id) return sendJson(res, 200, { streams: [] });
      const item = findItem(id);
      if (item && item.type === type) return sendJson(res, 200, { streams: item.streams ?? [] });
      if (type === 'series') {
        const resolved = findVideo(id);
        if (resolved && resolved.item.type === 'series') {
          return sendJson(res, 200, { streams: resolved.video.streams ?? [] });
        }
      }
      return sendJson(res, 200, { streams: [] });
    }

    return sendJson(res, 404, { error: 'Not found' });
  }
}
