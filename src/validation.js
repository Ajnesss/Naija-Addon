const allowedLanguages = new Set(['english', 'yoruba', 'igbo', 'hausa']);
const allowedTypes = new Set(['movie', 'series']);

function isHttpsDestination(stream) {
  if (!stream || typeof stream !== 'object') return false;
  const destination = stream.url || stream.externalUrl;
  if (typeof destination !== 'string') return false;
  try {
    const parsed = new URL(destination);
    return parsed.protocol === 'https:' && Boolean(parsed.hostname) && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

function hasPlayableStreams(streams) {
  return Array.isArray(streams) && streams.length > 0 && streams.every(isHttpsDestination);
}

export function isApprovedPlayableItem(item, providers) {
  if (!item || typeof item !== 'object') return false;
  if (!allowedTypes.has(item.type)) return false;
  if (typeof item.id !== 'string' || !/^nollywood:[a-z0-9][a-z0-9:_-]*$/i.test(item.id)) return false;
  if (typeof item.name !== 'string' || !item.name.trim()) return false;
  if (!Array.isArray(item.languages) || !item.languages.length) return false;
  if (item.languages.some((language) => !allowedLanguages.has(String(language).toLowerCase()))) return false;

  const provider = providers.find((candidate) => candidate.id === item.providerId);
  if (!provider || provider.status !== 'approved' || provider.playbackVerified !== true) return false;

  if (item.type === 'movie') return hasPlayableStreams(item.streams);
  if (!Array.isArray(item.videos) || item.videos.length === 0) return false;

  const seenVideoIds = new Set();
  return item.videos.every((video) => {
    if (!video || typeof video.id !== 'string' || !video.id.startsWith(`${item.id}:`) ||
        !/^nollywood:[a-z0-9][a-z0-9:_-]*$/i.test(video.id)) return false;
    if (seenVideoIds.has(video.id)) return false;
    seenVideoIds.add(video.id);
    return typeof video.title === 'string' && video.title.trim() &&
      Number.isInteger(video.season) && video.season >= 1 &&
      Number.isInteger(video.episode) && video.episode >= 1 &&
      hasPlayableStreams(video.streams);
  });
}

export function approvedItems(items, providers) {
  if (!Array.isArray(items) || !Array.isArray(providers)) return [];
  return items.filter((item) => isApprovedPlayableItem(item, providers));
}
