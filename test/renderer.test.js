import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { browserCandidatesFor, findBrowser } from '../src/renderer.js';

// Resolution is driven by an injected probe so the selection logic itself is
// under test, rather than whatever happens to be installed on the runner.
function probe(available) {
  const set = new Set(available);
  return async (candidate) => set.has(candidate);
}

test('prefers the macOS Chrome bundle when running on darwin', async () => {
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

  const found = await findBrowser({
    platform: 'darwin',
    override: undefined,
    isExecutableFile: probe([chrome, '/usr/bin/google-chrome']),
  });

  assert.equal(found, chrome);
});

test('never resolves a Linux path on darwin', async () => {
  await assert.rejects(
    findBrowser({
      platform: 'darwin',
      override: undefined,
      isExecutableFile: probe(['/usr/bin/google-chrome', '/snap/bin/chromium']),
    }),
    /Chrome or Chromium was not found/,
  );
});

test('never resolves a macOS bundle on linux', async () => {
  await assert.rejects(
    findBrowser({
      platform: 'linux',
      override: undefined,
      isExecutableFile: probe(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']),
    }),
    /Chrome or Chromium was not found/,
  );
});

test('falls back through the darwin list when Chrome is absent', async () => {
  const chromium = '/Applications/Chromium.app/Contents/MacOS/Chromium';

  const found = await findBrowser({
    platform: 'darwin',
    override: undefined,
    isExecutableFile: probe([chromium]),
  });

  assert.equal(found, chromium);
});

test('WIRBEL_BROWSER takes precedence over the platform list', async () => {
  const custom = '/opt/custom/chrome';
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

  const found = await findBrowser({
    platform: 'darwin',
    override: custom,
    isExecutableFile: probe([custom, chrome]),
  });

  assert.equal(found, custom);
});

test('an unusable WIRBEL_BROWSER still falls back to the platform list', async () => {
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

  const found = await findBrowser({
    platform: 'darwin',
    override: '/does/not/exist',
    isExecutableFile: probe([chrome]),
  });

  assert.equal(found, chrome);
});

test('non-darwin platforms use the Linux list', async () => {
  const found = await findBrowser({
    platform: 'freebsd',
    override: undefined,
    isExecutableFile: probe(['/usr/bin/chromium']),
  });

  assert.equal(found, '/usr/bin/chromium');
});

test('rejects a directory that is merely executable', async () => {
  // A ".app" bundle is a directory and passes access(X_OK); resolving it would
  // fail later at spawn with an opaque EACCES. The platform list is stubbed out
  // so the assertion holds on machines that do have a browser installed.
  const root = await mkdtemp(join(tmpdir(), 'wirbel-browser-'));
  const bundle = join(root, 'Chromium.app');
  await mkdir(bundle);

  let resolved;
  try {
    resolved = await findBrowser({ platform: 'darwin', override: bundle });
  } catch {
    return; // Nothing else was available, which is also a pass.
  }

  assert.notEqual(resolved, bundle, 'a bundle directory must never be selected');
});

test('accepts a real executable file through the default probe', async () => {
  const root = await mkdtemp(join(tmpdir(), 'wirbel-browser-'));
  const binary = join(root, 'chrome');
  await writeFile(binary, '#!/bin/sh\n', { mode: 0o755 });

  const found = await findBrowser({ platform: 'darwin', override: binary });

  assert.equal(found, binary);
});

test('exposes only Chrome and Chromium on darwin', () => {
  // Other Chromium forks (notably Brave) alter Web Audio output, which would
  // produce a valid-looking but corrupted render.
  assert.deepEqual(browserCandidatesFor('darwin'), [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ]);
});

test('platform candidate lists cannot be mutated by callers', () => {
  const candidates = browserCandidatesFor('darwin');

  assert.throws(() => candidates.push('/tmp/evil'), TypeError);
  assert.ok(!browserCandidatesFor('darwin').includes('/tmp/evil'));
});
