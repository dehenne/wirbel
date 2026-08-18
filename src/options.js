import { access, mkdir, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { basename, extname, parse, resolve } from 'node:path';
import { parseArgs } from 'node:util';

export const formats = ['mp3', 'ogg', 'wav'];

export function parseOptions(argv, cwd = process.cwd()) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    strict: true,
    options: {
      about: { type: 'boolean' },
      cycles: { type: 'string', short: 'c' },
      duration: { type: 'string', short: 'd' },
      force: { type: 'boolean' },
      format: { type: 'string', short: 'f' },
      help: { type: 'boolean', short: 'h' },
      json: { type: 'boolean' },
      target: { type: 'string', short: 't' },
      version: { type: 'boolean', short: 'v' },
    },
  });

  if (values.help || values.version || values.about) {
    return {
      action: values.help ? 'help' : values.version ? 'version' : 'about',
      json: values.json ?? false,
    };
  }

  if (positionals.length !== 1) {
    throw usageError('expected exactly one .strudel file');
  }

  const input = resolve(cwd, positionals[0]);
  if (extname(input).toLowerCase() !== '.strudel') {
    throw usageError(`input must be a .strudel file: ${basename(input)}`);
  }

  const format = values.format?.toLowerCase();
  if (!format) {
    throw usageError('missing required option --format <format>');
  }
  if (!formats.includes(format)) {
    throw usageError(`unsupported format "${format}" (use: ${formats.join(', ')})`);
  }

  if (values.cycles && values.duration) {
    throw usageError('--cycles and --duration cannot be used together');
  }

  const cycles = values.cycles === undefined ? undefined : positiveNumber(values.cycles, '--cycles');
  const duration =
    values.duration === undefined ? undefined : positiveNumber(values.duration, '--duration');
  const target = resolve(cwd, values.target ?? '.');
  const output = resolve(target, `${parse(input).name}.${format}`);

  return {
    action: 'render',
    cycles: cycles ?? (duration === undefined ? 16 : undefined),
    duration,
    force: values.force ?? false,
    format,
    input,
    json: values.json ?? false,
    output,
    target,
  };
}

export async function validateOptions(options) {
  const input = await stat(options.input).catch((error) => {
    if (error.code === 'ENOENT') {
      throw usageError(`input file does not exist: ${options.input}`);
    }
    throw error;
  });
  if (!input.isFile()) {
    throw usageError(`input is not a file: ${options.input}`);
  }

  await mkdir(options.target, { recursive: true });
  if (!options.force) {
    await access(options.output, constants.F_OK)
      .then(() => {
        throw usageError(`output already exists: ${options.output} (use --force to overwrite)`);
      })
      .catch((error) => {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      });
  }
}

function positiveNumber(value, option) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw usageError(`${option} must be a positive number`);
  }
  return number;
}

export function usageError(message) {
  const error = new Error(`${message}\nTry 'wirbel --help' for usage information.`);
  error.exitCode = 2;
  return error;
}
