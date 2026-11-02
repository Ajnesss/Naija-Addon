# Naija Addon for Nuvio

A standalone Node.js addon for discovering Nollywood films and series through Nuvio's Stremio-compatible addon protocol.

## How it works (v0.2)

The addon is a **discovery catalogue**. With a free TMDB key set (`TMDB_API_KEY`) it lists Nigerian films and series by language (Yoruba, Igbo, Hausa, English) using IMDb IDs. When you open a title, Nuvio asks the stream addons you already have installed (for example your AIOStreams config) for streams, exactly as for any other title. This addon never returns streams for TMDB titles and does not host, scrape or link to video.

Without a key the catalogues are empty. Set `TMDB_API_KEY` to either a TMDB v3 API key or a v4 read-access token (starts with `eyJ`).

Limits: only titles TMDB has an IMDb ID for are shown, and TMDB's coverage of Yoruba/Igbo/Hausa titles is patchy, so some catalogues will be short. Whether a title plays depends on your stream addons.

## Status

This is the protocol foundation. It exposes a manifest, movie/series catalogues, metadata and stream routes. The catalogue starts empty intentionally: no provider is marked as working until its public integration method, rights/terms and playback behaviour have been verified. This avoids presenting dead links, trailers or YouTube clips as full-film streams.

## Run

- Node.js 18+
- `npm test`
- `npm start`

The server listens on `PORT` (default `7000`) and `HOST` (default `0.0.0.0`). Check `/health` and `/manifest.json`.

## Catalogues

- All Nollywood Movies
- English-language Nollywood Movies and Series
- Nollywood Series
- Yoruba Films and Series
- Igbo Films and Series
- Hausa & Kannywood Films and Series

Add verified title metadata to `data/catalog.json`. Use IDs prefixed with `nollywood:`. `languages` may contain `english`, `yoruba`, `igbo`, and `hausa`. Movie entries use a verified `streams` array. Series entries use a `videos` array with a unique episode ID, season/episode numbers, and a verified stream list for each episode. See [the adapter contract](providers/ADAPTER_CONTRACT.md) before adding data.

## Provider policy

Only integrate a provider through a documented public API/feed or explicit permission from the service owner. Do not bypass DRM, subscriptions, geoblocks, anti-bot controls or access restrictions, and do not redistribute stream URLs contrary to provider terms. A title should only be labelled playable after a full-length playback test.

## Deployment isolation

This repository is independent. It must use its own service, environment and deployment. Do not reuse or modify the German addon repository, its Oracle instance, its secrets, or its running services.


## Provider verification

See [PROVIDER_STATUS.md](PROVIDER_STATUS.md) and [CONTACTS_AND_ACCESS.md](CONTACTS_AND_ACCESS.md). A provider must be explicitly approved and have verified full-length playback before any title is exposed in the catalogue. This gate is enforced in the server code; unapproved providers are filtered out.

GitHub Actions runs the Node test suite on pushes and pull requests.
