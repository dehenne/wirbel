# Wirbel

[![CI](https://github.com/dehenne/wirbel/actions/workflows/ci.yml/badge.svg)](https://github.com/dehenne/wirbel/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/wirbel)](https://www.npmjs.com/package/wirbel)
[![license](https://img.shields.io/github/license/dehenne/wirbel)](LICENSE)

Render [Strudel](https://strudel.cc/) patterns to audio from your terminal.

Wirbel is a command-line audio renderer for Strudel, the browser-based music
live coding environment. Give Wirbel a `.strudel` file, choose a duration or
number of cycles, and render the pattern to WAV, MP3, or OGG:

```shell
wirbel soundtrack.strudel --format mp3
```

Wirbel is currently designed for Linux.

## Why Wirbel?

Strudel is designed primarily for interactive live coding in the browser.
Turning a pattern into a standalone audio file from an automated workflow
usually requires browser automation, recording or offline-rendering logic, and
FFmpeg commands.

Wirbel provides one stable command for that complete process.

This is especially useful for AI-assisted workflows. An AI agent can generate
a `.strudel` file and hand it to Wirbel instead of creating a new throwaway
rendering script every time. Predictable arguments, output paths, exit codes,
and audio formats make Strudel rendering easier to automate, test, and
reproduce.

The CLI is also intended to become the foundation for integrations such as an
MCP server. Those integrations can use the same renderer instead of
reimplementing Strudel export themselves.

## Features

- Render `.strudel` files without opening the Strudel editor
- Use the official `@strudel/web` npm package without vendoring Strudel
- Support Strudel synths and ZZFX sounds, including `z_sine`, `z_sawtooth`,
  `z_square`, `z_tan`, `z_triangle`, `z_noise`, and `zzfx`
- Export WAV, MP3, and OGG
- Render a fixed duration or a fixed number of Strudel cycles
- Select an output directory with `--target`
- Refuse to overwrite files unless `--force` is supplied
- Return structured render results and errors with `--json`
- Provide standard `--help`, `--version`, and `--about` commands

## Requirements

- Linux
- Node.js 20 or newer
- Google Chrome or Chromium
- FFmpeg for MP3 and OGG output

Wirbel searches the common Linux locations for Chrome and Chromium. If your
browser is installed elsewhere, set `WIRBEL_BROWSER` to its executable:

```shell
export WIRBEL_BROWSER=/path/to/chromium
```

## Installation

Install Wirbel globally from npm:

```shell
npm install --global wirbel
```

Alternatively, install the latest development version directly from GitHub:

```shell
npm install --global github:dehenne/wirbel
```

For local development:

```shell
git clone https://github.com/dehenne/wirbel.git
cd wirbel
npm install
npm link
```

After installation, the `wirbel` command is available globally.

## Usage

```text
wirbel <file.strudel> --format <format> [options]
```

The simplest MP3 export is:

```shell
wirbel soundtrack.strudel --format mp3
```

Without `--target`, Wirbel writes the result to the current working directory.
The output uses the input filename with the selected audio extension:

```text
soundtrack.strudel -> soundtrack.mp3
```

### Options

```text
-f, --format <format>      Output format: mp3, ogg, or wav
-t, --target <directory>  Output directory (default: current directory)
-c, --cycles <number>     Number of cycles to render (default: 16)
-d, --duration <seconds>  Exact duration instead of a cycle count
    --force               Overwrite an existing output file
    --json                Print a machine-readable result
-h, --help                Show command help
-v, --version             Show the installed version
    --about               Show project and license information
```

`--cycles` and `--duration` cannot be used together. The duration represented
by a cycle depends on the cycle rate used by the Strudel pattern.

### Examples

Render 32 cycles as OGG into an `audio` directory:

```shell
wirbel soundtrack.strudel \
  --format ogg \
  --cycles 32 \
  --target ./audio
```

Render exactly 45 seconds as WAV:

```shell
wirbel soundtrack.strudel --format wav --duration 45
```

Replace an existing MP3:

```shell
wirbel soundtrack.strudel --format mp3 --force
```

Display the complete command reference:

```shell
wirbel --help
```

### Machine-readable output

Use `--json` when calling Wirbel from an AI agent, script, or another program:

```shell
wirbel soundtrack.strudel --format mp3 --duration 30 --json
```

Successful renders write one JSON object to standard output:

```json
{
  "ok": true,
  "input": "/music/soundtrack.strudel",
  "output": "/music/soundtrack.mp3",
  "format": "mp3",
  "cycles": 15,
  "duration": 30,
  "cps": 0.5
}
```

Errors use the same mode and include a non-zero process exit code:

```json
{
  "ok": false,
  "error": {
    "message": "input file does not exist: /music/soundtrack.strudel",
    "exitCode": 2
  }
}
```

## How it works

Wirbel starts a temporary local renderer and loads the official `@strudel/web`
npm package in headless Chrome or Chromium. Strudel evaluates the source and
renders the requested pattern range using an offline audio context.

The resulting WAV data is returned to the CLI. WAV output can be written
directly; FFmpeg encodes MP3 and OGG output. Temporary browser data and
intermediate audio are removed when rendering finishes.

Strudel remains an npm dependency. Its source tree and editor are not copied
into the Wirbel repository.

## Security

A `.strudel` file contains executable JavaScript-based live-coding source.
Only render files you trust. Although Wirbel runs the source in a temporary
browser profile, this is not intended to be a security boundary for hostile
code.

## Development

Install the dependencies and run the checks:

```shell
npm install
npm run check
npm test
```

Run the browser and FFmpeg integration test with:

```shell
WIRBEL_INTEGRATION=1 npm test
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the development workflow, tests,
pull-request process, and commit-message rules.

## License and attribution

Wirbel is licensed under the
[GNU Affero General Public License v3.0](LICENSE).

[Strudel](https://strudel.cc/) is a music live coding environment whose
official source code is hosted on
[Codeberg](https://codeberg.org/uzu/strudel). Wirbel uses Strudel through the
official `@strudel/web` npm package.

Wirbel is an independent project. It is not affiliated with or endorsed by the
Strudel project.
