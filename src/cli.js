import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { convertAudio } from './converter.js';
import { parseOptions, validateOptions } from './options.js';
import { renderStrudel } from './renderer.js';

const packageData = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

export async function run(argv) {
  let options;
  try {
    options = parseOptions(argv);
  } catch (error) {
    if (error.code?.startsWith('ERR_PARSE_ARGS')) {
      error.message = `${error.message}\nTry 'wirbel --help' for usage information.`;
      error.exitCode = 2;
    }
    throw error;
  }

  if (options.action === 'help') {
    console.log(helpText());
    return;
  }
  if (options.action === 'version') {
    console.log(packageData.version);
    return;
  }
  if (options.action === 'about') {
    console.log(aboutText());
    return;
  }

  await validateOptions(options);
  const source = await readFile(options.input, 'utf8');
  const temporary = await mkdtemp(join(tmpdir(), 'wirbel-'));
  const wavPath = join(temporary, 'render.wav');

  if (!options.json) {
    console.log(`Rendering ${options.input} ...`);
  }
  let renderInfo;
  try {
    renderInfo = await renderStrudel({
      cycles: options.cycles,
      duration: options.duration,
      profilePath: join(temporary, 'chrome'),
      source,
      wavPath,
    });
    await convertAudio({
      force: options.force,
      format: options.format,
      output: options.output,
      wavPath,
    });
  } finally {
    await rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
  const result = {
    ok: true,
    input: options.input,
    output: options.output,
    format: options.format,
    cycles: options.cycles ?? options.duration * renderInfo.cps,
    duration: renderInfo.duration,
    cps: renderInfo.cps,
  };
  if (options.json) {
    console.log(JSON.stringify(result));
  } else {
    console.log(`Created ${options.output}`);
  }
  return result;
}

function helpText() {
  return `Wirbel ${packageData.version} — render Strudel patterns to audio

Usage:
  wirbel <file.strudel> --format <format> [options]
  wirbel --help | --version | --about

Options:
  -f, --format <format>     Output format: mp3, ogg, or wav
  -t, --target <directory> Output directory (default: current directory)
  -c, --cycles <number>    Number of cycles to render (default: 16)
  -d, --duration <seconds> Exact duration instead of a cycle count
      --force              Overwrite an existing output file
      --json               Print a machine-readable result
  -h, --help               Show this help
  -v, --version            Show the version
      --about              Show project and license information

Examples:
  wirbel song.strudel --format mp3
  wirbel song.strudel --format ogg --target ./audio --cycles 32
  wirbel song.strudel --format wav --duration 45 --force`;
}

function aboutText() {
  return `Wirbel ${packageData.version}
Render Strudel patterns to WAV, MP3, or OGG on Linux and macOS.

License: GNU Affero General Public License v3.0 only
Strudel is used through the @strudel/web npm package.
Source: https://github.com/dehenne/wirbel`;
}
