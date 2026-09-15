import { spawn } from 'node:child_process';
import { constants, createWriteStream } from 'node:fs';
import { access, readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const linuxBrowserCandidates = Object.freeze([
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
]);

// Chrome and Chromium only. Other Chromium forks are deliberately excluded:
// Brave, for example, randomises Web Audio output per session, which yields a
// structurally valid but silently corrupted render.
//
// "~/Applications" is searched after "/Applications" because that is where
// Chrome installs for users without administrator rights.
const darwinBrowserCandidates = Object.freeze([
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  join(homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
  join(homedir(), 'Applications/Chromium.app/Contents/MacOS/Chromium'),
]);

export function browserCandidatesFor(platform) {
  return platform === 'darwin' ? darwinBrowserCandidates : linuxBrowserCandidates;
}

export async function renderStrudel({ source, wavPath, profilePath, cycles, duration }) {
  const browser = await findBrowser();
  const strudelEntry = fileURLToPath(import.meta.resolve('@strudel/web'));
  const strudelDirectory = dirname(strudelEntry);
  const bundlePath = join(strudelDirectory, 'index.js');
  const config = { cycles, duration, sampleRate: 44_100, source };
  let settle;
  let fail;
  let completed = false;

  const result = new Promise((resolve, reject) => {
    settle = resolve;
    fail = reject;
  });

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      if (request.method === 'GET' && url.pathname === '/') {
        return send(response, 200, 'text/html; charset=utf-8', renderPage());
      }
      if (request.method === 'GET' && url.pathname === '/config') {
        return send(response, 200, 'application/json', JSON.stringify(config));
      }
      if (request.method === 'GET' && url.pathname === '/strudel.js') {
        return send(response, 200, 'text/javascript; charset=utf-8', await readFile(bundlePath));
      }
      if (request.method === 'GET' && url.pathname.startsWith('/assets/')) {
        const asset = url.pathname.slice('/assets/'.length);
        if (!/^[a-zA-Z0-9._-]+$/.test(asset)) {
          return send(response, 400, 'text/plain', 'invalid asset');
        }
        return send(
          response,
          200,
          'text/javascript; charset=utf-8',
          await readFile(join(strudelDirectory, 'assets', asset)),
        );
      }
      if (request.method === 'POST' && url.pathname === '/result') {
        await pipeline(request, createWriteStream(wavPath, { flags: 'wx' }));
        const cps = Number(request.headers['x-wirbel-cps']);
        const renderedDuration = Number(request.headers['x-wirbel-duration']);
        completed = true;
        send(response, 204, 'text/plain', '');
        settle({ cps, duration: renderedDuration });
        return;
      }
      if (request.method === 'POST' && url.pathname === '/error') {
        const message = await readRequest(request);
        completed = true;
        send(response, 204, 'text/plain', '');
        fail(new Error(`Strudel rendering failed: ${message}`));
        return;
      }
      send(response, 404, 'text/plain', 'not found');
    } catch (error) {
      send(response, 500, 'text/plain', error.message);
      if (!completed) {
        completed = true;
        fail(error);
      }
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const { port } = server.address();
  const flags = [
    '--headless=new',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    '--autoplay-policy=no-user-gesture-required',
    `--user-data-dir=${profilePath}`,
    `http://127.0.0.1:${port}/`,
  ];
  if (typeof process.getuid === 'function' && process.getuid() === 0) {
    flags.unshift('--no-sandbox');
  }

  const chrome = spawn(browser, flags, { stdio: ['ignore', 'ignore', 'pipe'] });
  let browserError = '';
  chrome.stderr.setEncoding('utf8');
  chrome.stderr.on('data', (chunk) => {
    browserError = `${browserError}${chunk}`.slice(-8_000);
  });
  chrome.once('error', (error) => {
    if (!completed) {
      completed = true;
      fail(error);
    }
  });
  chrome.once('exit', (code) => {
    if (!completed) {
      completed = true;
      fail(
        new Error(
          `browser exited before rendering completed (code ${code})${
            browserError ? `\n${browserError.trim()}` : ''
          }`,
        ),
      );
    }
  });

  const timeout = setTimeout(() => {
    if (!completed) {
      completed = true;
      fail(new Error('rendering timed out after 10 minutes'));
    }
  }, 10 * 60 * 1_000);
  timeout.unref();

  try {
    return await result;
  } finally {
    clearTimeout(timeout);
    if (chrome.exitCode === null) {
      const exited = new Promise((resolve) => chrome.once('exit', resolve));
      chrome.kill('SIGTERM');
      await exited;
    }
    await new Promise((resolve) => server.close(resolve));
  }
}

export async function findBrowser({
  platform = process.platform,
  override = process.env.WIRBEL_BROWSER,
  candidates = browserCandidatesFor(platform),
  isExecutableFile = defaultIsExecutableFile,
} = {}) {
  const searched = override ? [override, ...candidates] : candidates;
  for (const candidate of searched) {
    if (await isExecutableFile(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    'Chrome or Chromium was not found. Install it or set WIRBEL_BROWSER to its executable.',
  );
}

// access(X_OK) alone is not enough: directories are executable, so a macOS
// ".app" bundle path would resolve here and then fail at spawn with a bare
// EACCES. Require a real file.
async function defaultIsExecutableFile(candidate) {
  try {
    const stats = await stat(candidate);
    if (!stats.isFile()) {
      return false;
    }
    await access(candidate, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function send(response, status, contentType, body) {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': contentType,
  });
  response.end(body);
}

async function readRequest(request) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > 64 * 1_024) {
      throw new Error('browser error message is too large');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function renderPage() {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Wirbel renderer</title></head>
  <body>
    <script src="/strudel.js"></script>
    <script>
      (async () => {
        try {
          const config = await fetch('/config').then((response) => response.json());
          const repl = await strudel.initStrudel();
          await strudel.registerZZFXSounds();
          const pattern = await strudel.evaluate(config.source, false);
          if (!pattern) {
            throw repl.state.evalError || new Error('Strudel did not return a pattern');
          }

          const cps = Number(repl.scheduler.cps);
          if (!Number.isFinite(cps) || cps <= 0) {
            throw new Error('Strudel returned an invalid cycle rate');
          }
          const end = config.duration === undefined ? config.cycles : config.duration * cps;

          let rendered;
          const createObjectURL = URL.createObjectURL.bind(URL);
          URL.createObjectURL = (blob) => {
            rendered = blob;
            return createObjectURL(new Blob([]));
          };
          HTMLAnchorElement.prototype.click = () => {};

          await strudel.renderPatternAudio(pattern, cps, 0, end, config.sampleRate, 64, false);
          if (!rendered) {
            throw new Error('Strudel produced no audio data');
          }
          const response = await fetch('/result', {
            method: 'POST',
            headers: {
              'X-Wirbel-Cps': String(cps),
              'X-Wirbel-Duration': String(end / cps),
            },
            body: rendered,
          });
          if (!response.ok) {
            throw new Error(await response.text());
          }
        } catch (error) {
          await fetch('/error', {
            method: 'POST',
            body: error && (error.stack || error.message) ? error.stack || error.message : String(error),
          });
        }
      })();
    </script>
  </body>
</html>`;
}
