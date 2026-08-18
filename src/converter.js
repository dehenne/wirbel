import { spawn } from 'node:child_process';
import { constants } from 'node:fs';
import { copyFile, unlink } from 'node:fs/promises';

export async function convertAudio({ wavPath, output, format, force }) {
  if (format === 'wav') {
    await copyFile(wavPath, output, force ? 0 : constants.COPYFILE_EXCL);
    return;
  }

  const codec =
    format === 'mp3'
      ? ['-codec:a', 'libmp3lame', '-q:a', '2']
      : ['-codec:a', 'libvorbis', '-q:a', '5'];
  const args = [
    '-hide_banner',
    '-loglevel',
    'error',
    force ? '-y' : '-n',
    '-i',
    wavPath,
    ...codec,
    output,
  ];

  try {
    await runFfmpeg(args);
  } catch (error) {
    await unlink(output).catch(() => {});
    throw error;
  }
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    ffmpeg.stderr.setEncoding('utf8');
    ffmpeg.stderr.on('data', (chunk) => {
      stderr = `${stderr}${chunk}`.slice(-8_000);
    });
    ffmpeg.once('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(new Error('FFmpeg was not found. Install ffmpeg and try again.'));
        return;
      }
      reject(error);
    });
    ffmpeg.once('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`FFmpeg failed with code ${code}${stderr ? `:\n${stderr.trim()}` : ''}`));
    });
  });
}
