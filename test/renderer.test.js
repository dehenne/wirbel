import assert from 'node:assert/strict';
import test from 'node:test';

import { browserCandidatesFor } from '../src/renderer.js';

test('offers macOS application bundles on darwin', () => {
  const candidates = browserCandidatesFor('darwin');

  assert.ok(
    candidates.every((candidate) => candidate.startsWith('/Applications/')),
    'darwin candidates should all be application bundles',
  );
  assert.ok(
    candidates.includes('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
    'Google Chrome is the default macOS install location',
  );
});

test('offers Linux executable paths on linux', () => {
  const candidates = browserCandidatesFor('linux');

  assert.ok(candidates.includes('/usr/bin/google-chrome'));
  assert.ok(candidates.includes('/snap/bin/chromium'));
  assert.ok(
    candidates.every((candidate) => !candidate.startsWith('/Applications/')),
    'linux candidates should not include macOS bundles',
  );
});

test('falls back to the Linux list on other platforms', () => {
  assert.deepEqual(browserCandidatesFor('freebsd'), browserCandidatesFor('linux'));
});

test('keeps the platform lists disjoint', () => {
  const darwin = new Set(browserCandidatesFor('darwin'));
  const overlap = browserCandidatesFor('linux').filter((candidate) => darwin.has(candidate));

  assert.deepEqual(overlap, [], 'a candidate should belong to exactly one platform');
});
