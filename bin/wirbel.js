#!/usr/bin/env node

import { run } from '../src/cli.js';

const argv = process.argv.slice(2);

run(argv).catch((error) => {
  if (argv.includes('--json')) {
    console.error(
      JSON.stringify({
        ok: false,
        error: {
          message: error.message,
          exitCode: error.exitCode ?? 1,
        },
      }),
    );
  } else {
    console.error(`wirbel: ${error.message}`);
  }
  process.exitCode = error.exitCode ?? 1;
});
