# Naija Streams (Nuvio addon)

A **stream-only** addon. It has no catalogue: keep using your normal catalogue (Xperience, Cinemeta, TMDB) to browse. When you open a title, Nuvio asks this addon for streams by IMDb ID.

## What it does

1. Looks up the title in Cinemeta. If the country is not Nigeria it returns nothing, so other titles are never touched.
2. Searches YouTube (official Data API) for a full-length upload of that exact film or episode.
3. Only returns a video if the title matches, the length fits the film's runtime (episodes: 15-150 min, correct season/episode), and it is not a trailer, clip, review or compilation. Up to three matches are returned, each with a channel name and length, plus an "Open in YouTube" fallback.

Torrent/debrid results for the same titles still come from your other addons (Select, Torrentio, etc.). This addon adds the YouTube route alongside them.

## Setup

1. Create a free YouTube Data API v3 key in Google Cloud Console (APIs & Services -> Library -> YouTube Data API v3 -> Credentials).
2. Set `YOUTUBE_API_KEY` on the service (see `DEPLOYMENT.md`).
3. Add `https://<your-service>/manifest.json` in Nuvio.

Without a key the addon runs but returns no streams.

## Limits

- Each search costs 100 of Google's 10,000 free daily quota units. Results are cached (24 hours when found, 1 hour when not) and `YOUTUBE_DAILY_SEARCH_LIMIT` (default 80) caps searches per day.
- It only finds what is on YouTube. Titles with no full upload will show no stream from this addon.
- `ytId` streams depend on the Nuvio client supporting them. The extra "Open in YouTube" stream is the fallback. Test on the actual device.
- Matching is by title, year and length, so occasional misses or wrong matches are possible.

## Run

Node.js 22+. `npm test`, then `npm start` (port 7000, or `PORT`). Check `/health` and `/manifest.json`.

## Background

`PROVIDER_STATUS.md`, `CONTACTS_AND_ACCESS.md` and `PROVIDER_OUTREACH.md` are research notes on licensed Nollywood providers. They are not used by the code.
