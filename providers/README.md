# Provider adapters

Keep one adapter per provider. Add an adapter only when the provider offers a documented public API/feed that permits this use, or has explicitly authorised integration.

For each provider document:
- official service URL and territory availability
- API/feed documentation or written permission
- terms and permitted playback/linking method
- exact full-length title tested (not trailer/clip)
- playback test result on desktop and Nuvio TV
- whether login/subscription is required

Do not scrape protected pages, extract hidden media URLs, defeat DRM/anti-bot controls, or redistribute private stream URLs. When the permitted route is an official page link, represent it as an external destination only if Nuvio's current stream model supports that behaviour and the provider terms permit it.