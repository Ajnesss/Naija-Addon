import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogItems, getItem } from '../src/catalog.js';

test('empty catalogue does not invent titles', () => {
  assert.deepEqual(catalogItems('movie', 'nollywood-movies'), []);
});
test('unknown IDs do not resolve', () => {
  assert.equal(getItem('nollywood:not-a-title'), null);
});
test('language catalogue is safely empty until verified titles are added', () => {
  assert.deepEqual(catalogItems('movie', 'yoruba-movies'), []);
});