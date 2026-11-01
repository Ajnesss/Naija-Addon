# Provider adapter contract

A provider adapter must not be enabled merely because a website lists films. It must have documented permission and a playback path verified in Nuvio.

## Required provider record
- Stable provider ID and display name
- Official homepage and contact/permission reference
- Integration method: `api`, `partner_feed`, or `official_deep_link`
- Permission status and any scope/expiry
- Whether playback is external or in-player
- Supported territories, languages and content types

## Required title record
- Stable addon ID: `nollywood:<provider>:<slug>`
- Type: `movie` or `series`
- Display title and original title where useful
- Language: `english`, `yoruba`, `igbo`, or `hausa`
- Provider ID, official title URL, artwork URL where permitted
- For series: a `videos` array with a unique `nollywood:` video ID, episode title, season and episode number, plus its own verified HTTPS stream list
- Source attribution and rights/permission notes

## Playback rules
1. Prefer provider-issued API or partner feed.
2. Official deep links may be used only when the provider permits third-party linking and the Nuvio client can open them reliably.
3. Never extract HLS/DASH URLs from protected pages, reverse engineer private APIs, defeat DRM, evade anti-bot controls, or bypass subscriptions/geoblocks.
4. Do not label a title playable until a full film or a complete episode has been tested in the target Nuvio client.
5. Trailers, clips, search results and catalogue pages do not count as playback verification.
6. Keep provider attribution visible in metadata or stream descriptions where supported.

## Activation gate
A provider must be marked `approved` and `playbackVerified: true` only after permission and a successful end-to-end playback test have both been recorded. The server validation layer rejects unapproved providers.
