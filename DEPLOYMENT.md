# Standalone deployment

This service is designed to run independently from any other addon or server.

## Requirements
- Node.js 22 or Docker
- A separate host/container for this addon
- HTTPS in production

## Docker
Build and run:

```sh
docker build -t naija-nuvio-addon .
docker run --rm -p 7000:7000 -e PORT=7000 naija-nuvio-addon
```

The service listens on `0.0.0.0` and uses port 7000 by default (or `PORT`).

## Deployment safety
- Deploy this repository as a new application/service on a separate host.
- Do not reuse another addon’s VM, systemd service, reverse-proxy route, environment file, SSH key, or credentials.
- Configure a dedicated HTTPS hostname and health check at `/health`.
- Do not add provider credentials until the provider has supplied an authorised integration.
- The current catalogue is intentionally empty. A healthy service does not mean playable Nollywood sources have been integrated.

## Before public release
1. Run `npm test`.
2. Confirm `GET /health` returns success.
3. Confirm manifest and all catalogue routes respond.
4. Add only provider-approved catalogue entries and playback links.
5. Test on the actual Nuvio TV client before advertising playback support.
