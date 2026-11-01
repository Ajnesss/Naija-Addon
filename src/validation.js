const allowedLanguages = new Set(['english', 'yoruba', 'igbo', 'hausa']);
const allowedTypes = new Set(['movie', 'series']);

export function isApprovedPlayableItem(item, providers) {
  if (!item || typeof item !== 'object') return false;
  if (!allowedTypes.has(item.type)) return false;
  if (typeof item.id !== 'string' || !item.id.startsWith('nollywood:')) return false;
  if (typeof item.name !== 'string' || !item.name.trim()) return false;
  if (!Array.isArray(item.languages) || !item.languages.length) return false;
  if (item.languages.some((language) => !allowedLanguages.has(String(language).toLowerCase()))) return false;

  const provider = providers.find((candidate) => candidate.id === item.providerId);
  if (!provider || provider.status !== 'approved' || provider.playbackVerified !== true) return false;
  if (!Array.isArray(item.streams) || item.streams.length === 0) return false;

  return item.streams.every((stream) => {
    if (!stream || typeof stream !== 'object') return false;
    const destination = stream.url || stream.externalUrl;
    if (typeof destination !== 'string') return false;
    try {
      return new URL(destination).protocol === 'https:';
    } catch {
      return false;
    }
  });
}

export function approvedItems(items, providers) {
  return items.filter((item) => isApprovedPlayableItem(item, providers));
}
