import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeServerBaseUrl } from './api';

test('normalizeServerBaseUrl accepts valid http/https URLs and strips trailing slashes', () => {
  assert.equal(normalizeServerBaseUrl('https://api.makeuperfect.in///'), 'https://api.makeuperfect.in');
  assert.equal(normalizeServerBaseUrl('  http://localhost:3000/ '), 'http://localhost:3000');
  assert.equal(normalizeServerBaseUrl(''), '');
});

test('normalizeServerBaseUrl blocks unsafe or malformed schemes', () => {
  assert.equal(normalizeServerBaseUrl('javascript:alert(1)'), '');
  assert.equal(normalizeServerBaseUrl('data:text/html,hi'), '');
  assert.equal(normalizeServerBaseUrl('not-a-valid-url'), '');
});
