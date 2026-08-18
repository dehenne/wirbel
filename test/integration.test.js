import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { convertAudio } from '../src/converter.js';
import { renderStrudel } from '../src/renderer.js';

const integrationTest = process.env.WIRBEL_INTEGRATION === '1' ? test : test.skip;

integrationTest('renders a Strudel synth and converts it to MP3', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'wirbel-integration-'));
  const wavPath = join(directory, 'render.wav');
  const mp3Path = join(directory, 'render.mp3');

  try {
    await renderStrudel({
      cycles: undefined,
      duration: 0.25,
      profilePath: join(directory, 'chrome'),
      source: 'note("c3 e3 g3 c4").s("sine").gain(0.8)',
      wavPath,
    });
    const wav = await readFile(wavPath);
    assert.equal(wav.subarray(0, 4).toString(), 'RIFF');
    assert.ok(wav.length > 44);

    await convertAudio({ wavPath, output: mp3Path, format: 'mp3', force: false });
    const mp3 = await readFile(mp3Path);
    assert.ok(mp3.length > 100);
  } finally {
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
