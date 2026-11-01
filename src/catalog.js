import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { approvedItems } from './validation.js';

const dataPath = fileURLToPath(new URL('../data/catalog.json', import.meta.url));
const providersPath = fileURLToPath(new URL('../data/providers.json', import.meta.url));
const [{ items }, { providers }] = await Promise.all([
  readFile(dataPath, 'utf8').then(JSON.parse),
  readFile(providersPath, 'utf8').then(JSON.parse)
]);

// A catalogue item is visible only after its provider has been approved and
// a permitted full-length playback route has been verified.
const visibleItems = approvedItems(items, providers);

export function getItem(id) {
  return visibleItems.find((item) => item.id === id) ?? null;
}

export function catalogItems(type, catalogId, search = '') {
  const category = catalogId.replace(/-movies$|-series$/, '');
  const query = search.trim().toLocaleLowerCase();
  return visibleItems.filter((item) => {
    if (item.type !== type) return false;
    if (category !== 'nollywood' && !(item.languages ?? []).some((lang) => lang.toLowerCase() === category)) return false;
    if (!query) return true;
    const searchable = [item.name, item.description, ...(item.genres ?? []), ...(item.languages ?? []), ...(item.aliases ?? [])].join(' ').toLocaleLowerCase();
    return searchable.includes(query);
  });
}

export function getVideo(id) {
  for (const item of visibleItems) {
    const video = (item.videos ?? []).find((candidate) => candidate.id === id);
    if (video) return { item, video };
  }
  return null;
}
