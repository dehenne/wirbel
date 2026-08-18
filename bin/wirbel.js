#!/usr/bin/env node

import { run } from '../src/cli.js';

run(process.argv.slice(2)).catch((error) => {
  console.error(`wirbel: ${error.message}`);
  process.exitCode = error.exitCode ?? 1;
});
