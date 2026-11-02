# Provider research and integration status

Last checked: 2 November 2026

A free-to-watch website does not automatically permit scraping, stream extraction, embedding or redistribution.

## Current decisions

| Provider | Nollywood relevance | Free access evidence | Addon integration status | Decision |
|---|---|---|---|---|
| NolliStream | Dedicated Nollywood/African VOD | Official site and app listings describe free ad-supported Nollywood films | No public addon API/feed found. Terms explicitly prohibit automated tools to scrape/access content and prohibit copying/distribution without permission | Contact for written API/partner permission; do not scrape |
| BlackFameTV | Dedicated Nollywood category and title listings | Site describes AVOD/free streaming | Site currently reports movie playback is down during server migration; no public addon API/permission verified | Hold; retest when service is restored and request permission |
| AfroLandTV | African/Nollywood VOD | Free catalogue and rights-holder submission portal | Submission portal is for rights holders; no public addon feed/API or third-party integration permission found | Contact for partnership/API |
| AVO TV | Large Nollywood VOD catalogue | Official site advertises 2,000+ free Nollywood movies | Terms prohibit scraping, reverse engineering, redistribution and circumvention | Do not scrape; request formal integration |
| cAfrica | African movies, Nollywood, series and live channels | Official app listing describes free streaming with optional premium | No public addon API/feed or third-party playback permission verified | Contact for partnership/API |
| FilmFlux | Nollywood, Yoruba, Igbo and Hausa/Kannywood discovery | App listing describes free access | Discovery is explicitly based on YouTube creators and playback hands off to YouTube | Excluded as a core provider, per project requirement |
| NG-Movies | Broad Nigerian/African movie catalogue | Official site describes free access | Site says video is displayed using YouTube standard APIs/players/embeds | Not a core source; YouTube-led |
| Vuma+ | African film discovery, including Nollywood | Free, no account advertised | Terms say playback is through YouTube embedded player and prohibit automated bots/scrapers; not an independent playback source | Excluded from core sources; YouTube-led |
| MuviDB | Nollywood/African film metadata and where-to-watch discovery | Free non-commercial API preview advertised; first 500 catalogue records | Developer API offers metadata and streaming-platform availability, not authorised video playback. Requires an API key; commercial use requires a paid licence | Metadata-only candidate; never treat as a stream provider |
| African Movie Channel / Nolly Africa HD | Dedicated English-language Nollywood movies, series and unscripted content | Free ad-supported 24/7 live channel; available in the UK on Freeview 287, Samsung TV Plus 4208, LG Channels 1161 and Plex | Official broadcaster and rights owner for AMC Originals; no public third-party API or Nuvio playback feed documented. Linear channel only, not title-on-demand | **Best verified content/distribution lead.** Ask AMC about an authorised live FAST feed/API or Nuvio distribution permission; do not extract partner platform streams |
| Showmine Entertainment | Nigerian streaming service advertising thousands of Nollywood/African films and series | Subscription plans; no free full-catalogue tier confirmed | Official developer page explicitly invites integration partner enquiries and describes its own backend/CDN; no public API docs | Strong technical partnership lead, but paid service and access/API terms need confirmation |
| Aflik TV | Nollywood distributor with claimed large catalogue and multi-platform VOD licensing | Free access not established | Public site claims distribution/licensing across 124+ platforms, but information appears old; no API/feed docs | Potential rights-holder/distributor lead; verify current operation, catalogue, territory rights and integration capability before relying on it |
| GLO-TV | Nollywood movies in Hausa, Igbo, Yoruba and English, plus other content | App is free, but service requires a Glo prepaid/postpaid mobile subscription in Nigeria | No public API/feed; access is explicitly limited to Glo network subscribers in Nigeria | Not suitable for UK mum or Nuvio integration |

## Verification rules

- A catalogue page is not proof that a title is currently playable.
- A title is not added to the catalogue until its metadata is accurate and a permitted playback route is confirmed.
- A source is not marked as working until a full-length film or episode (not a trailer or clip) has been played through the proposed route.
- No stream URLs are extracted from private app traffic, hidden endpoints, DRM-protected players or authenticated sessions.
- External-page launching may be considered only where the provider permits linking and the target page is title-specific. It must be tested on Nuvio TV before being described as supported.

## Official references

- African Movie Channel / Nolly Africa HD: https://africanmoviechannel.tv/products-and-services
- Nolly Africa HD on Plex: https://watch.plex.tv/en-GB/live-tv/channel/nolly-africa-hd
- African Movie Channel contact: https://www.africanmoviechannel.tv/contact
- Showmine developer / integration information: https://www.showmine.ng/developers.php
- Aflik TV: https://afliktv.com/
- GLO-TV official app listing: https://play.google.com/store/apps/details?id=com.tvanywhereafrica.glotv
- NolliStream: https://nollistream.com/
- NolliStream terms: https://nollistream.com/terms
- BlackFameTV: https://blackfametv.com/
- AfroLandTV rights-holder submission portal: https://submit.afrolandtv.com/
- AVO TV on-demand catalogue: https://www.avo.tv/copy-of-live-channels
- AVO TV terms: https://www.avo.tv/terms-of-service
- cAfrica: https://cafrica.tv/
- FilmFlux: https://www.filmflux.app/
- NG-Movies: https://ng-movies.com/en
- Vuma+ terms: https://vumaplus.com/terms
- MuviDB developer API and licence tiers: https://muvidb.com/developers

## Next integration gate

Prioritise African Movie Channel for an authorised Nolly Africa HD live-channel feed or Nuvio distribution permission, and Showmine for a technical integration discussion. Separately verify Aflik TV's current rights catalogue. Request written permission or documented public API/feed details from NolliStream, BlackFameTV, AfroLandTV, AVO TV and cAfrica. The provider must specify whether its permitted integration is a catalogue metadata feed, a title-specific official watch-page link, or an authorised playback stream/feed for third-party clients. These permissions are not interchangeable.
