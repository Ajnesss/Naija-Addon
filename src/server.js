import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { catalogItems, getItem } from './catalog.js';

const manifest = JSON.parse(await readFile(fileURLToPath(new URL('../manifest.json', import.meta.url)), 'utf8'));
const port = Number(process.env.PORT || 7000);
const host = process.env.HOST || '0.0.0.0';

function sendJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'cache-control': 'no-store'
  });
  res.end(JSON.stringify(body));
}

function toMetaPreview(item) {
  return {
    id: item.id, type: item.type, name: item.name, poster: item.poster,
    description: item.description, releaseInfo: item.releaseInfo,
    genres: item.genres, posterShape: 'poster'
  };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
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

  if (parts[0] === 'catalog' && parts.length >= 3) {
    const [, type, catalogId] = parts;
    const metas = catalogItems(type, catalogId, url.searchParams.get('search') || '').map(toMetaPreview);
    return sendJson(res, 200, { metas });
  }

  if (parts[0] === 'meta' && parts.length === 3) {
    const [, type, rawId] = parts;
    const item = getItem(decodeURIComponent(rawId));
    if (!item || item.type !== type) return sendJson(res, 404, { error: 'Title not found' });
    return sendJson(res, 200, { meta: { ...toMetaPreview(item), videos: item.videos ?? [] } });
  }

  if (parts[0] === 'stream' && parts.length === 3) {
    const [, type, rawId] = parts;
    const item = getItem(decodeURIComponent(rawId));
    if (!item || item.type !== type) return sendJson(res, 200, { streams: [] });
    return sendJson(res, 200, { streams: item.streams ?? [] });
  }

  return sendJson(res, 404, { error: 'Not found' });
});

server.listen(port, host, () => console.log(`Naija addon listening on http://${host}:${port}`));