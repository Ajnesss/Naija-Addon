import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogItems, getItem } from '../src/catalog.js';
import { isApprovedPlayableItem } from '../src/validation.js';

test('empty catalogue does not invent titles', () => {
  assert.deepEqual(catalogItems('movie', 'nollywood-movies'), []);
});
test('unknown IDs do not resolve', () => {
  assert.equal(getItem('nollywood:not-a-title'), null);
});
test('language catalogue is safely empty until verified titles are added', () => {
  assert.deepEqual(catalogItems('movie', 'yoruba-movies'), []);
});
test('unapproved provider cannot publish a stream', () => {
  const item = {
    id: 'nollywood:test-title', type: 'movie', name: 'Test title',
    languages: ['yoruba'], providerId: 'sample',
    streams: [{ externalUrl: 'https://provider.example/watch/test-title' }]
  };
  const providers = [{ id: 'sample', status: 'permission_required', playbackVerified: false }];
  assert.equal(isApprovedPlayableItem(item, providers), false);
});
test('approved provider needs verified playback and HTTPS destination', () => {
  const item = {
    id: 'nollywood:test-title', type: 'movie', name: 'Test title',
    languages: ['yoruba'], providerId: 'sample',
    streams: [{ externalUrl: 'https://provider.example/watch/test-title' }]
  };
  const providers = [{ id: 'sample', status: 'approved', playbackVerified: true }];
  assert.equal(isApprovedPlayableItem(item, providers), true);
  assert.equal(isApprovedPlayableItem({ ...item, streams: [{ url: 'http://unsafe.example/video.m3u8' }] }, providers), false);
});


import { createAddonServer } from '../src/app.js';

test('HTTP protocol exposes manifest, health and empty catalogues', async (t) => {
  const server = createAddonServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;

  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, 'ok');

  const manifest = await fetch(`${base}/manifest.json`);
  const manifestBody = await manifest.json();
  assert.equal(manifestBody.id, 'community.naija.nuvio');
  assert.ok(manifestBody.catalogs.some((catalog) => catalog.id === 'hausa-movies'));

  const catalog = await fetch(`${base}/catalog/movie/nollywood-movies.json`);
  assert.deepEqual(await catalog.json(), { metas: [] });

  const searchCatalog = await fetch(`${base}/catalog/movie/nollywood-movies/search=Yoruba.json`);
  assert.deepEqual(await searchCatalog.json(), { metas: [] });
});

test('HTTP protocol handles unknown and malformed IDs without crashing', async (t) => {
  const server = createAddonServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;

  const missing = await fetch(`${base}/meta/movie/nollywood%3Amissing.json`);
  assert.equal(missing.status, 404);

  const streams = await fetch(`${base}/stream/movie/nollywood%3Amissing.json`);
  assert.deepEqual(await streams.json(), { streams: [] });

  const malformed = await fetch(`${base}/meta/movie/%E0%A4%A.json`);
  assert.equal(malformed.status, 400);

  const method = await fetch(`${base}/manifest.json`, { method: 'POST' });
  assert.equal(method.status, 405);
});


test('series require episode-level playable streams', () => {
  const provider = [{ id: 'sample', status: 'approved', playbackVerified: true }];
  const series = {
    id: 'nollywood:test-series', type: 'series', name: 'Test series',
    languages: ['igbo'], providerId: 'sample',
    videos: [{
      id: 'nollywood:test-series:1:1', title: 'Episode 1', season: 1, episode: 1,
      streams: [{ externalUrl: 'https://provider.example/watch/episode-1' }]
    }]
  };
  assert.equal(isApprovedPlayableItem(series, provider), true);
  assert.equal(isApprovedPlayableItem({ ...series, videos: [] }, provider), false);
  assert.equal(isApprovedPlayableItem({
    ...series, videos: [{ ...series.videos[0], streams: [] }]
  }, provider), false);
});

test('stream destinations cannot contain embedded credentials', () => {
  const item = {
    id: 'nollywood:test-title', type: 'movie', name: 'Test title',
    languages: ['english'], providerId: 'sample',
    streams: [{ url: 'https://user:pass@provider.example/video' }]
  };
  const providers = [{ id: 'sample', status: 'approved', playbackVerified: true }];
  assert.equal(isApprovedPlayableItem(item, providers), false);
});


test('metadata and movie or episode stream routes resolve protocol IDs', async (t) => {
  const movie = {
    id: 'nollywood:fixture-movie', type: 'movie', name: 'Fixture movie',
    streams: [{ url: 'https://media.example/fixture.mp4' }]
  };
  const series = {
    id: 'nollywood:fixture-series', type: 'series', name: 'Fixture series',
    videos: [{
      id: 'nollywood:fixture-series:1:1', title: 'Episode 1', season: 1, episode: 1,
      streams: [{ url: 'https://media.example/episode-1.mp4' }]
    }]
  };
  const items = [movie, series];
  const server = createAddonServer({
    catalogItems: () => items,
    getItem: (id) => items.find((item) => item.id === id) ?? null,
    getVideo: (id) => {
      for (const item of items) {
        const video = (item.videos ?? []).find((entry) => entry.id === id);
        if (video) return { item, video };
      }
      return null;
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;

  const meta = await fetch(`${base}/meta/movie/nollywood%3Afixture-movie.json`);
  assert.equal((await meta.json()).meta.id, movie.id);

  const movieStreams = await fetch(`${base}/stream/movie/nollywood%3Afixture-movie.json`);
  assert.deepEqual((await movieStreams.json()).streams, movie.streams);

  const episodeStreams = await fetch(`${base}/stream/series/nollywood%3Afixture-series%3A1%3A1.json`);
  assert.deepEqual((await episodeStreams.json()).streams, series.videos[0].streams);
});
