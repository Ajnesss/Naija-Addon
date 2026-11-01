import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogItems, getItem } from '../src/catalog.js';
import { isApprovedPlayableItem } from '../src/validation.js';

test('empty catalogue does not invent titles', () => {
  assert.deepEqual(catalogItems('movie', 'nollywood-movies'), []);
});
test('unknown IDs do not resolve', () => {
  assert.equal(getItem('nollywood:not-a-title'), null);
});
test('language catalogue is safely empty until verified titles are added', () => {
  assert.deepEqual(catalogItems('movie', 'yoruba-movies'), []);
});
test('unapproved provider cannot publish a stream', () => {
  const item = {
    id: 'nollywood:test-title', type: 'movie', name: 'Test title',
    languages: ['yoruba'], providerId: 'sample',
    streams: [{ externalUrl: 'https://provider.example/watch/test-title' }]
  };
  const providers = [{ id: 'sample', status: 'permission_required', playbackVerified: false }];
  assert.equal(isApprovedPlayableItem(item, providers), false);
});
test('approved provider needs verified playback and HTTPS destination', () => {
  const item = {
    id: 'nollywood:test-title', type: 'movie', name: 'Test title',
    languages: ['yoruba'], providerId: 'sample',
    streams: [{ externalUrl: 'https://provider.example/watch/test-title' }]
  };
  const providers = [{ id: 'sample', status: 'approved', playbackVerified: true }];
  assert.equal(isApprovedPlayableItem(item, providers), true);
  assert.equal(isApprovedPlayableItem({ ...item, streams: [{ url: 'http://unsafe.example/video.m3u8' }] }, providers), false);
});
