# Standalone deployment

This service is designed to run independently from any other addon.

## Deploy on Render

A Render Blueprint is included at `render.yaml`. It creates a separate web service named `naija-nuvio-addon` with its own runtime, environment and HTTPS hostname. It does not use or modify the German addon or its Oracle server.

1. Sign in to Render and choose **New + → Blueprint**.
2. Connect the GitHub account that can access `Ajnesss/Naija-Addon`.
3. Select this repository and deploy the Blueprint.
4. Render reads `render.yaml`, builds with `npm install`, starts with `npm start`, and checks `/health`.
5. When the deploy finishes, open the service's **onrender.com** URL and check `/health` and `/manifest.json`.

The Blueprint uses Render's free web-service plan. Free instances can spin down after inactivity, so the first request after a quiet period may take longer. If always-on availability is important, change the service plan in Render.

## Local / Docker

Requirements: Node.js 22 or Docker.

```sh
npm test
npm run validate:catalog
npm start
```

The service listens on `0.0.0.0` and uses the Render-provided `PORT` (or port 7000 locally).

```sh
docker build -t naija-nuvio-addon .
docker run --rm -p 7000:7000 -e PORT=7000 naija-nuvio-addon
```

## Deployment safety

- Deploy this repository as a new Render service, not as part of another addon or server.
- Do not reuse another addon's VM, systemd service, reverse-proxy route, environment file, SSH key, or credentials.
- Do not add provider credentials until the provider has supplied an authorised integration.
- The current catalogue is intentionally empty. A healthy service does not mean playable Nollywood sources have been integrated.

## Before public release

1. Confirm `GET /health` returns success.
2. Confirm `GET /manifest.json` and all catalogue routes respond.
3. Add only provider-approved catalogue entries and playback links.
4. Test on the actual Nuvio TV client before advertising playback support.
