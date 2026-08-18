import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { parseOptions, validateOptions } from '../src/options.js';

test('uses the current directory as the default target', () => {
  const options = parseOptions(['song.strudel', '--format', 'mp3'], '/music');

  assert.equal(options.input, '/music/song.strudel');
  assert.equal(options.output, '/music/song.mp3');
  assert.equal(options.target, '/music');
  assert.equal(options.cycles, 16);
  assert.equal(options.force, false);
});

test('resolves a target directory and duration', () => {
  const options = parseOptions(
    ['song.strudel', '-f', 'ogg', '--target', './exports', '--duration', '12.5'],
    '/music',
  );

  assert.equal(options.output, '/music/exports/song.ogg');
  assert.equal(options.target, '/music/exports');
  assert.equal(options.duration, 12.5);
  assert.equal(options.cycles, undefined);
});

test('enables machine-readable output', () => {
  const options = parseOptions(['song.strudel', '--format', 'wav', '--json'], '/music');

  assert.equal(options.json, true);
});

test('rejects unsupported formats', () => {
  assert.throws(
    () => parseOptions(['song.strudel', '--format', 'flac']),
    /unsupported format "flac"/,
  );
});

test('rejects cycles and duration together', () => {
  assert.throws(
    () => parseOptions(['song.strudel', '-f', 'wav', '--cycles', '4', '--duration', '10']),
    /cannot be used together/,
  );
});

test('rejects an existing output unless force is enabled', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'wirbel-options-'));
  const input = join(directory, 'song.strudel');
  const output = join(directory, 'song.wav');
  await writeFile(input, 'note("c3").s("sine")');
  await writeFile(output, 'existing');

  try {
    const options = parseOptions([input, '--format', 'wav'], directory);
    await assert.rejects(validateOptions(options), /output already exists/);

    options.force = true;
    await validateOptions(options);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
