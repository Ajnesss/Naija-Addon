import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { isApprovedPlayableItem } from '../src/validation.js';

const root = new URL('../', import.meta.url);
const [{ items }, { providers }] = await Promise.all([
  readFile(fileURLToPath(new URL('data/catalog.json', root)), 'utf8').then(JSON.parse),
  readFile(fileURLToPath(new URL('data/providers.json', root)), 'utf8').then(JSON.parse)
]);

if (!Array.isArray(items) || !Array.isArray(providers)) {
  console.error('Catalogue and provider files must each contain an array.');
  process.exitCode = 1;
} else {
  const ids = new Set();
  const invalid = [];
  for (const item of items) {
    if (ids.has(item?.id)) invalid.push(`Duplicate title ID: ${item?.id ?? '(missing)'}`);
    ids.add(item?.id);
    if (!isApprovedPlayableItem(item, providers)) {
      invalid.push(`Not approved or not playback-verified: ${item?.id ?? '(missing ID)'}`);
    }
  }
  if (invalid.length) {
    console.error('Catalogue validation failed:');
    for (const issue of invalid) console.error(`- ${issue}`);
    process.exitCode = 1;
  } else {
    console.log(`Catalogue validation passed: ${items.length} approved playable title(s).`);
  }
}
