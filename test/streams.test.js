import test from 'node:test';
import assert from 'node:assert/strict';
import { createAddonServer } from '../src/app.js';
import { createCinemeta, isNigerian, runtimeMinutes } from '../src/cinemeta.js';
import { createYoutubeFinder, parseIsoDuration, rankVideos, normalise } from '../src/youtube.js';

const METAS = {
  'movie:tt21432050': { name: 'Anikulapo', year: '2022', country: 'Nigeria', runtime: '142 min' },
  'movie:tt0111161': { name: 'The Shawshank Redemption', year: '1994', country: 'USA', runtime: '142 min' },
  'series:tt9999999': { name: 'Jenifa\'s Diary', year: '2015', country: 'Nigeria' }
};

function fakeFetch(calls = []) {
  return async (input) => {
    const url = new URL(input);
    calls.push(url.hostname + url.pathname);
    const json = (body, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => body });
    const cine = url.pathname.match(/^\/meta\/(movie|series)\/(tt\d+)\.json$/);
    if (url.hostname === 'v3-cinemeta.strem.io' && cine) {
      const meta = METAS[`${cine[1]}:${cine[2]}`];
      return meta ? json({ meta }) : json({}, false);
    }
    if (url.pathname === '/youtube/v3/search') {
      return json({ items: ['good', 'trailer', 'short', 'other'].map((id) => ({ id: { videoId: id } })) });
    }
    if (url.pathname === '/youtube/v3/videos') {
      const data = {
        good: { title: 'ANIKULAPO (2022) FULL MOVIE | Kunle Afolayan', ch: 'Kunle Afolayan Productions', d: 'PT2H20M10S', v: '5000000' },
        trailer: { title: 'Anikulapo Official Trailer', ch: 'Netflix Naija', d: 'PT2M30S', v: '9000000' },
        short: { title: 'Anikulapo full movie clip', ch: 'Random', d: 'PT12M', v: '1000' },
        other: { title: 'Totally Different Movie full movie', ch: 'Else', d: 'PT2H', v: '100' }
      };
      return json({ items: url.searchParams.get('id').split(',').map((id) => ({
        id,
        snippet: { title: data[id].title, channelTitle: data[id].ch },
        contentDetails: { duration: data[id].d },
        statistics: { viewCount: data[id].v }
      })) });
    }
    return json({}, false);
  };
}

async function start(t, options) {
  const server = createAddonServer(options);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  t.after(() => new Promise((r) => server.close(r)));
  return `http://127.0.0.1:${server.address().port}`;
}

test('helpers: durations, Nigeria gate, runtime, normalising', () => {
  assert.equal(parseIsoDuration('PT2H20M10S').toFixed(1), '140.2');
  assert.equal(parseIsoDuration('PT45M'), 45);
  assert.equal(parseIsoDuration('PT30S'), 0.5);
  assert.equal(isNigerian({ country: 'Nigeria' }), true);
  assert.equal(isNigerian({ country: 'Nigeria, UK' }), true);
  assert.equal(isNigerian({ country: 'USA' }), false);
  assert.equal(isNigerian(null), false);
  assert.equal(runtimeMinutes({ runtime: '142 min' }), 142);
  assert.equal(runtimeMinutes({}), null);
  assert.equal(normalise('Orí: Rebirth!'), 'ori rebirth');
});

test('movie ranking rejects trailers, short clips, wrong titles and wrong years', () => {
  const target = { type: 'movie', name: 'Anikulapo', year: 2022, runtimeMinutes: 142 };
  const mk = (id, title, minutes, views = 1000) => ({ id, title, channel: 'c', minutes, views });
  const ranked = rankVideos(target, [
    mk('a', 'Anikulapo (2022) Full Movie', 140),
    mk('b', 'Anikulapo Official Trailer', 2),
    mk('c', 'Anikulapo clip', 12),
    mk('d', 'Something Else Full Movie', 140),
    mk('e', 'Anikulapo (1998) Full Movie', 140),
    mk('f', 'Anikulapo ALL PARTS compilation', 400)
  ]);
  assert.deepEqual(ranked.map((v) => v.id), ['a']);
});

test('episode ranking needs the right episode and season', () => {
  const target = { type: 'series', name: "Jenifa's Diary", season: 2, episode: 5 };
  const mk = (id, title, minutes = 24) => ({ id, title, channel: 'c', minutes, views: 10 });
  const ranked = rankVideos(target, [
    mk('ok', "Jenifa's Diary Season 2 Episode 5"),
    mk('wrong-ep', "Jenifa's Diary Season 2 Episode 6"),
    mk('wrong-season', "Jenifa's Diary Season 3 Episode 5"),
    mk('ok2', "Jenifa's Diary S2 E5 full episode")
  ]);
  assert.deepEqual(ranked.map((v) => v.id).sort(), ['ok', 'ok2']);
});

test('Nigerian movie returns only the good full-length upload', async (t) => {
  const f = fakeFetch();
  const base = await start(t, {
    cinemeta: createCinemeta({ fetchImpl: f }),
    youtube: createYoutubeFinder({ apiKey: 'k', fetchImpl: f })
  });
  const body = await (await fetch(`${base}/stream/movie/tt21432050.json`)).json();
  const yt = body.streams.find((s) => s.ytId);
  assert.equal(yt.ytId, 'good');
  assert.match(yt.title, /Kunle Afolayan Productions/);
  assert.ok(body.streams.some((s) => s.externalUrl === 'https://www.youtube.com/watch?v=good'));
  assert.ok(!body.streams.some((s) => ['trailer', 'short', 'other'].includes(s.ytId)));
});

test('non-Nigerian titles get nothing and never touch YouTube', async (t) => {
  const calls = [];
  const f = fakeFetch(calls);
  const base = await start(t, {
    cinemeta: createCinemeta({ fetchImpl: f }),
    youtube: createYoutubeFinder({ apiKey: 'k', fetchImpl: f })
  });
  const body = await (await fetch(`${base}/stream/movie/tt0111161.json`)).json();
  assert.deepEqual(body, { streams: [] });
  assert.ok(!calls.some((c) => c.startsWith('www.googleapis.com')));
});

test('bad IDs, unknown types and missing key are handled safely', async (t) => {
  const f = fakeFetch();
  const base = await start(t, {
    cinemeta: createCinemeta({ fetchImpl: f }),
    youtube: createYoutubeFinder({ apiKey: 'k', fetchImpl: f })
  });
  for (const path of ['/stream/movie/notanid.json', '/stream/tv/tt21432050.json', '/stream/series/tt9999999.json', '/stream/movie/tt21432050:1:1.json']) {
    assert.deepEqual(await (await fetch(base + path)).json(), { streams: [] }, path);
  }
  const noKey = await start(t, { cinemeta: createCinemeta({ fetchImpl: f }), youtube: null });
  assert.deepEqual(await (await fetch(`${noKey}/stream/movie/tt21432050.json`)).json(), { streams: [] });
});

test('results are cached and the daily search cap is enforced', async () => {
  const calls = [];
  const f = fakeFetch(calls);
  const finder = createYoutubeFinder({ apiKey: 'k', fetchImpl: f, dailySearchLimit: 1 });
  const target = { type: 'movie', imdbId: 'tt1', name: 'Anikulapo', year: 2022, runtimeMinutes: 142 };
  assert.equal((await finder.find(target)).length, 1);
  const searches = () => calls.filter((c) => c.endsWith('/search')).length;
  assert.equal(searches(), 1);
  await finder.find(target);
  assert.equal(searches(), 1); // cached
  assert.deepEqual(await finder.find({ ...target, imdbId: 'tt2' }), []); // cap reached
  assert.equal(searches(), 1);
});

test('YouTube failure returns empty streams, not an error', async (t) => {
  const f = fakeFetch();
  const failing = async (input, init) => (String(input).includes('googleapis') ? { ok: false, status: 403, json: async () => ({}) } : f(input, init));
  const base = await start(t, {
    cinemeta: createCinemeta({ fetchImpl: f }),
    youtube: createYoutubeFinder({ apiKey: 'k', fetchImpl: failing })
  });
  const res = await fetch(`${base}/stream/movie/tt21432050.json`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { streams: [] });
});

test('manifest is stream-only with no catalogues', async (t) => {
  const base = await start(t, {});
  const m = await (await fetch(`${base}/manifest.json`)).json();
  assert.deepEqual(m.catalogs, []);
  assert.deepEqual(m.resources.map((r) => r.name), ['stream']);
  assert.deepEqual(m.resources[0].idPrefixes, ['tt']);
  const health = await (await fetch(`${base}/health`)).json();
  assert.equal(health.status, 'ok');
});
