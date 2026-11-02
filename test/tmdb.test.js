import test from 'node:test';
import assert from 'node:assert/strict';
import { createTmdbCatalogue } from '../src/tmdb.js';
import { createAddonServer } from '../src/app.js';

function fakeTmdb() {
  const calls = [];
  const imdb = { 1: 'tt1000001', 2: 'tt1000002', 3: null, 4: 'tt1000004', 5: 'tt1000005' };
  async function fetchImpl(url) {
    const u = new URL(url);
    calls.push(u.pathname + u.search);
    const json = (body, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => body });
    if (u.pathname === '/3/discover/movie') {
      const page = Number(u.searchParams.get('page'));
      if (page === 1) {
        return json({ total_pages: 2, results: [
          { id: 1, title: 'Anikulapo', original_language: 'yo', release_date: '2022-09-30', poster_path: '/a.jpg', overview: 'Yoruba epic' },
          { id: 3, title: 'No IMDb ID', original_language: 'yo', release_date: '2020-01-01' },
          { id: 2, title: 'Aníkúlápó duplicate-id check', original_language: 'yo', release_date: '2022-01-01' }
        ] });
      }
      return json({ total_pages: 2, results: [{ id: 4, title: 'Page Two', original_language: 'yo', release_date: '2021-05-05' }] });
    }
    if (u.pathname === '/3/discover/tv') {
      return json({ total_pages: 1, results: [{ id: 5, name: 'Jenifa\'s Diary', original_language: 'en', first_air_date: '2015-03-01', backdrop_path: '/b.jpg' }] });
    }
    if (u.pathname === '/3/search/movie') {
      return json({ total_pages: 1, results: [
        { id: 1, title: 'Anikulapo', original_language: 'yo' },
        { id: 99, title: 'Anikulapo (not Nigerian)', original_language: 'yo' }
      ] });
    }
    if (u.pathname === '/3/movie/1') return json({ production_countries: [{ iso_3166_1: 'NG' }] });
    if (u.pathname === '/3/movie/99') return json({ production_countries: [{ iso_3166_1: 'US' }] });
    const external = u.pathname.match(/^\/3\/(movie|tv)\/(\d+)\/external_ids$/);
    if (external) return json({ imdb_id: imdb[external[2]] ?? null });
    return json({}, false);
  }
  return { fetchImpl, calls };
}

test('no API key means no TMDB catalogue', () => {
  assert.equal(createTmdbCatalogue({}), null);
});

test('Yoruba discovery filters by Nigeria + yo and skips titles without IMDb IDs', async () => {
  const { fetchImpl, calls } = fakeTmdb();
  const tmdb = createTmdbCatalogue({ apiKey: 'key', fetchImpl });
  const metas = await tmdb.list('movie', 'yoruba-movies', { skip: 0 });
  assert.deepEqual(metas.map((m) => m.id), ['tt1000001', 'tt1000002', 'tt1000004']);
  assert.equal(metas[0].poster, 'https://image.tmdb.org/t/p/w500/a.jpg');
  assert.equal(metas[0].releaseInfo, '2022');
  const discover = calls.find((c) => c.startsWith('/3/discover/movie'));
  assert.match(discover, /with_origin_country=NG/);
  assert.match(discover, /with_original_language=yo/);
});

test('skip pages through results without repeats', async () => {
  const { fetchImpl } = fakeTmdb();
  const tmdb = createTmdbCatalogue({ apiKey: 'key', fetchImpl });
  const second = await tmdb.list('movie', 'yoruba-movies', { skip: 2 });
  assert.deepEqual(second.map((m) => m.id), ['tt1000004']);
});

test('series catalogue and bearer-token auth', async () => {
  const seen = [];
  const { fetchImpl } = fakeTmdb();
  const tmdb = createTmdbCatalogue({
    apiKey: 'eyJtoken',
    fetchImpl: (url, init) => { seen.push(init.headers.authorization); return fetchImpl(url, init); }
  });
  const metas = await tmdb.list('series', 'english-series', {});
  assert.deepEqual(metas.map((m) => m.id), ['tt1000005']);
  assert.equal(metas[0].type, 'series');
  assert.ok(seen.every((h) => h === 'Bearer eyJtoken'));
});

test('search keeps only Nigerian titles', async () => {
  const { fetchImpl } = fakeTmdb();
  const tmdb = createTmdbCatalogue({ apiKey: 'key', fetchImpl });
  const metas = await tmdb.list('movie', 'yoruba-movies', { search: 'Anikulapo' });
  assert.deepEqual(metas.map((m) => m.id), ['tt1000001']);
});

test('results are cached between requests', async () => {
  const { fetchImpl, calls } = fakeTmdb();
  const tmdb = createTmdbCatalogue({ apiKey: 'key', fetchImpl });
  await tmdb.list('movie', 'yoruba-movies', {});
  const before = calls.length;
  await tmdb.list('movie', 'yoruba-movies', {});
  assert.equal(calls.length, before);
});

test('HTTP catalogue route serves TMDB titles, and survives TMDB failure', async (t) => {
  const { fetchImpl } = fakeTmdb();
  const good = createAddonServer({}, { tmdb: createTmdbCatalogue({ apiKey: 'key', fetchImpl }) });
  const broken = createAddonServer({}, { tmdb: { list: async () => { throw new Error('boom'); } } });
  await Promise.all([good, broken].map((s) => new Promise((r) => s.listen(0, '127.0.0.1', r))));
  t.after(() => Promise.all([good, broken].map((s) => new Promise((r) => s.close(r)))));

  const ok = await fetch(`http://127.0.0.1:${good.address().port}/catalog/movie/yoruba-movies.json`);
  assert.equal(ok.status, 200);
  assert.deepEqual((await ok.json()).metas.map((m) => m.id), ['tt1000001', 'tt1000002', 'tt1000004']);

  const paged = await fetch(`http://127.0.0.1:${good.address().port}/catalog/movie/yoruba-movies/skip=2.json`);
  assert.deepEqual((await paged.json()).metas.map((m) => m.id), ['tt1000004']);

  const fail = await fetch(`http://127.0.0.1:${broken.address().port}/catalog/movie/yoruba-movies.json`);
  assert.equal(fail.status, 200);
  assert.deepEqual(await fail.json(), { metas: [] });
});

test('manifest keeps meta/stream scoped to nollywood: IDs only', async () => {
  const manifest = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../manifest.json', import.meta.url), 'utf8'));
  const scoped = manifest.resources.filter((r) => typeof r === 'object');
  assert.ok(scoped.length === 2 && scoped.every((r) => r.idPrefixes.join() === 'nollywood:'));
  assert.ok(manifest.resources.includes('catalog'));
});
