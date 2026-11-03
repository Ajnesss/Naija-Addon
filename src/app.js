import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createCinemeta, isNigerian, runtimeMinutes } from './cinemeta.js';

const manifest = JSON.parse(await readFile(fileURLToPath(new URL('../manifest.json', import.meta.url)), 'utf8'));

// movie: tt1234567    series episode: tt1234567:1:2
const ID_PATTERN = /^(tt\d{1,10})(?::(\d{1,3}):(\d{1,4}))?$/;

function sendJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  });
  res.end(JSON.stringify(body));
}

function toStreams(videos) {
  const streams = videos.map((video) => ({
    name: 'Naija\nYouTube',
    title: `${video.title}\n${video.channel} · ${Math.round(video.minutes)} min`,
    ytId: video.id
  }));
  if (videos[0]) {
    streams.push({
      name: 'Naija\nOpen in YouTube',
      title: `${videos[0].title}\nOpens in the YouTube app or browser`,
      externalUrl: `https://www.youtube.com/watch?v=${videos[0].id}`
    });
  }
  return streams;
}

export function createAddonServer({ cinemeta = createCinemeta(), youtube = null } = {}) {
  async function streamsFor(type, rawId) {
    if (!youtube) return [];
    const match = ID_PATTERN.exec(rawId);
    if (!match) return [];
    const [, imdbId, seasonText, episodeText] = match;
    if (type === 'series' && !seasonText) return [];
    if (type === 'movie' && seasonText) return [];

    const meta = await cinemeta.getMeta(type, imdbId);
    // Stay silent for anything that is not a Nigerian title.
    if (!meta || !isNigerian(meta)) return [];

    const year = Number.parseInt(meta.year ?? meta.releaseInfo, 10) || null;
    const videos = await youtube.find({
      type,
      imdbId,
      name: meta.name,
      year,
      runtimeMinutes: runtimeMinutes(meta),
      season: seasonText ? Number(seasonText) : undefined,
      episode: episodeText ? Number(episodeText) : undefined
    });
    return toStreams(videos);
  }

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
    if (url.pathname === '/health') {
      return sendJson(res, 200, { status: 'ok', addon: manifest.id, version: manifest.version, youtube: Boolean(youtube) });
    }
    if (url.pathname === '/manifest.json') return sendJson(res, 200, manifest);

    if (parts[0] === 'stream' && parts.length === 3) {
      const [, type, rawId] = parts;
      if (!['movie', 'series'].includes(type)) return sendJson(res, 200, { streams: [] });
      let id;
      try { id = decodeURIComponent(rawId.endsWith('.json') ? rawId.slice(0, -5) : rawId); } catch { id = ''; }
      let streams = [];
      try {
        streams = await streamsFor(type, id);
      } catch (error) {
        console.error('Stream lookup failed:', error?.message ?? error);
      }
      return sendJson(res, 200, { streams });
    }

    return sendJson(res, 404, { error: 'Not found' });
  }

  return http.createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (error) {
      console.error('Request failed:', error?.message ?? error);
      if (!res.headersSent) sendJson(res, 500, { error: 'Internal error' });
      else res.end();
    }
  });
}
