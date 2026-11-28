import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const FPS = 30;
const OUT_MP4 = path.resolve('.aistudio/artifacts/computer_use/reminderme-intro.mp4');
const WAV_PATH = path.resolve('.playwright-cli/intro-audio.wav');
const HTML_PATH = path.resolve('.playwright-cli/intro-canvas.html');

fs.mkdirSync(path.dirname(OUT_MP4), { recursive: true });
const htmlContent = fs.readFileSync(HTML_PATH);

const ffmpeg = spawn(
  'ffmpeg',
  [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-framerate', String(FPS),
    '-i', 'pipe:0',
    '-i', WAV_PATH,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-r', String(FPS),
    '-crf', '19',
    '-preset', 'superfast',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-shortest',
    '-movflags', '+faststart',
    OUT_MP4,
  ],
  { stdio: ['pipe', 'ignore', 'pipe'] }
);

let ffmpegStderr = '';
ffmpeg.stderr.on('data', (d) => {
  ffmpegStderr += d.toString();
});

const ffmpegDone = new Promise((resolve) => {
  ffmpeg.on('close', (code) => resolve(code));
});

let frameCount = 0;

function writeToFfmpeg(buf) {
  return new Promise((resolve) => {
    if (ffmpeg.stdin.write(buf)) resolve();
    else ffmpeg.stdin.once('drain', resolve);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url?.startsWith('/?'))) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlContent);
    return;
  }

  if (req.method === 'POST' && (req.url === '/frame' || req.url?.startsWith('/frames'))) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const jpeg = Buffer.concat(chunks);
    const countParam = Number(new URL(req.url, 'http://127.0.0.1').searchParams.get('count') || '1');
    await writeToFfmpeg(jpeg);
    frameCount += countParam;
    if (frameCount % 150 === 0 || frameCount >= 1890) {
      console.log(`  piped ${frameCount}/1890 exact 30fps frames…`);
    }
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  if (req.method === 'POST' && req.url === '/error') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    console.error('BROWSER RENDER ERROR:', Buffer.concat(chunks).toString('utf8'));
    ffmpeg.stdin.end();
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('logged');
    server.close(() => process.exit(1));
    return;
  }

  if (req.method === 'POST' && req.url === '/done') {
    ffmpeg.stdin.end();
    const code = await ffmpegDone;
    if (code !== 0) {
      console.error('ffmpeg error:\n', ffmpegStderr);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('ffmpeg_failed');
      server.close(() => process.exit(1));
      return;
    }
    const stat = fs.statSync(OUT_MP4);
    console.log(`DONE: ${frameCount} unique frames -> ${OUT_MP4} (${(stat.size / 1048576).toFixed(2)} MB)`);
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('done');
    server.close(() => process.exit(0));
    return;
  }

  res.writeHead(404);
  res.end('not found');
});

server.listen(4199, '127.0.0.1', () => {
  console.log('Frame pipe server listening on http://127.0.0.1:4199');
});
