# Deployment

This service is independent. Do not reuse another addon's server, secrets or deployment.

## Render

1. New + -> Blueprint, select this repository. `render.yaml` creates a web service `naija-nuvio-addon` (free plan; it sleeps when idle, so the first request after a quiet period is slow).
2. In the service's Environment tab, set `YOUTUBE_API_KEY`. Optional: `YOUTUBE_DAILY_SEARCH_LIMIT` (default 80).
3. Open `/health`. It should show `"youtube": true`.
4. Add `/manifest.json` to Nuvio and open a Nigerian title (for example Anikulapo, tt21432050).

## Local / Docker

```sh
npm test
YOUTUBE_API_KEY=... npm start
docker build -t naija-nuvio-addon . && docker run --rm -p 7000:7000 -e YOUTUBE_API_KEY=... naija-nuvio-addon
```
