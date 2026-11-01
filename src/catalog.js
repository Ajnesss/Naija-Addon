import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const dataPath = fileURLToPath(new URL('../data/catalog.json', import.meta.url));
const { items } = JSON.parse(await readFile(dataPath, 'utf8'));

export function getItem(id) {
  return items.find((item) => item.id === id) ?? null;
}

export function catalogItems(type, catalogId, search = '') {
  const category = catalogId.replace(/-movies$|-series$/, '');
  const query = search.trim().toLocaleLowerCase();
  return items.filter((item) => {
    if (item.type !== type) return false;
    if (category !== 'nollywood' && !(item.languages ?? []).some((lang) => lang.toLowerCase() === category)) return false;
    if (!query) return true;
    const searchable = [item.name, item.description, ...(item.genres ?? []), ...(item.languages ?? []), ...(item.aliases ?? [])].join(' ').toLocaleLowerCase();
    return searchable.includes(query);
  });
}