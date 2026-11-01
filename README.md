# Naija Addon for Nuvio

A standalone Node.js addon for discovering Nollywood films and series through Nuvio's Stremio-compatible addon protocol.

## Status

This is the protocol foundation. It exposes a manifest, movie/series catalogues, metadata and stream routes. The catalogue starts empty intentionally: no provider is marked as working until its public integration method, rights/terms and playback behaviour have been verified. This avoids presenting dead links, trailers or YouTube clips as full-film streams.

## Run

- Node.js 18+
- `npm test`
- `npm start`

The server listens on `PORT` (default `7000`) and `HOST` (default `0.0.0.0`). Check `/health` and `/manifest.json`.

## Catalogues

- Nollywood Movies
- Nollywood Series
- Yoruba Films
- Igbo Films
- Hausa & Kannywood Films

Add verified title metadata to `data/catalog.json`. Use IDs prefixed with `nollywood:`. `languages` may contain `yoruba`, `igbo`, and `hausa`.

## Provider policy

Only integrate a provider through a documented public API/feed or explicit permission from the service owner. Do not bypass DRM, subscriptions, geoblocks, anti-bot controls or access restrictions, and do not redistribute stream URLs contrary to provider terms. A title should only be labelled playable after a full-length playback test.

## Deployment isolation

This repository is independent. It must use its own service, environment and deployment. Do not reuse or modify the German addon repository, its Oracle instance, its secrets, or its running services.
