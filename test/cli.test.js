import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const executable = fileURLToPath(new URL('../bin/wirbel.js', import.meta.url));

test('prints structured errors in JSON mode', () => {
  const result = spawnSync(
    process.execPath,
    [executable, 'missing.strudel', '--format', 'wav', '--json'],
    { encoding: 'utf8' },
  );

  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
  assert.deepEqual(JSON.parse(result.stderr), {
    ok: false,
    error: {
      message: `${process.cwd()}/missing.strudel`.replace(
        /^/,
        'input file does not exist: ',
      ) + "\nTry 'wirbel --help' for usage information.",
      exitCode: 2,
    },
  });
});
