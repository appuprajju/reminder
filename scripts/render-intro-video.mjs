import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const playwright = require('/usr/local/share/bun-global/node_modules/playwright');

const DURATION_SEC = 36;
const FPS = 30;
const TOTAL_FRAMES = DURATION_SEC * FPS;
const SAMPLE_RATE = 44100;
const OUT_MP4 = path.resolve('public/reminderme-intro.mp4');
const TMP_WAV = path.resolve('/tmp/reminderme-intro-audio.wav');
const TARGET_URL = process.env.INTRO_URL || 'http://127.0.0.1:3000/?renderIntro=1';

/**
 * Generate a warm, gentle ambient synth pad + glassy chapter chime soundtrack (16-bit stereo WAV).
 */
function generateSoundtrackWav(outPath) {
  const numSamples = DURATION_SEC * SAMPLE_RATE;
  const headerSize = 44;
  const dataSize = numSamples * 4; // 2 channels * 2 bytes
  const buf = Buffer.alloc(headerSize + dataSize);

  // RIFF/WAVE header
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // PCM chunk size
  buf.writeUInt16LE(1, 20); // PCM format
  buf.writeUInt16LE(2, 22); // stereo
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  // 6 gentle modern ambient chords aligned to the 6 chapters
  const chords = [
    { start: 0, end: 5.5, notes: [130.81, 196.0, 246.94, 293.66, 329.63] }, // Cmaj9
    { start: 5.5, end: 12.0, notes: [110.0, 164.81, 196.0, 246.94, 261.63] }, // Am9
    { start: 12.0, end: 18.0, notes: [174.61, 220.0, 261.63, 329.63, 392.0] }, // Fmaj9
    { start: 18.0, end: 24.0, notes: [146.83, 220.0, 261.63, 329.63, 349.23] }, // Dm9
    { start: 24.0, end: 30.0, notes: [196.0, 246.94, 293.66, 329.63, 392.0] }, // G6
    { start: 30.0, end: 36.0, notes: [130.81, 196.0, 261.63, 329.63, 392.0] }, // Cmaj7 resolve
  ];

  // Subtle glassy arpeggio chimes at chapter entrances
  const chimes = [
    { t: 0.25, f: 523.25 },
    { t: 0.55, f: 659.25 },
    { t: 0.85, f: 783.99 },
    { t: 5.65, f: 587.33 },
    { t: 5.9, f: 659.25 },
    { t: 12.15, f: 698.46 },
    { t: 12.4, f: 880.0 },
    { t: 18.15, f: 587.33 },
    { t: 18.4, f: 783.99 },
    { t: 24.15, f: 659.25 },
    { t: 24.4, f: 783.99 },
    { t: 30.2, f: 523.25 },
    { t: 30.5, f: 659.25 },
    { t: 30.8, f: 783.99 },
    { t: 31.1, f: 1046.5 },
  ];

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;

    // Master fade-in & fade-out
    const fadeIn = Math.min(1, t / 1.2);
    const fadeOut = Math.min(1, (DURATION_SEC - t) / 1.8);
    const masterEnv = fadeIn * fadeOut;

    let left = 0;
    let right = 0;

    // Warm pad blend with smooth crossfades between chapters
    for (const c of chords) {
      if (t < c.start - 0.8 || t > c.end + 0.8) continue;
      const inEnv = Math.max(0, Math.min(1, (t - (c.start - 0.4)) / 0.9));
      const outEnv = Math.max(0, Math.min(1, (c.end + 0.4 - t) / 0.9));
      const cEnv = Math.min(inEnv, outEnv);
      if (cEnv <= 0) continue;

      const breath = 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.25 * t);
      for (let nIdx = 0; nIdx < c.notes.length; nIdx++) {
        const freq = c.notes[nIdx];
        const detuneL = Math.sin(2 * Math.PI * (freq * 0.9985) * t);
        const detuneR = Math.sin(2 * Math.PI * (freq * 1.0015) * t);
        const harmonic = 0.22 * Math.sin(2 * Math.PI * freq * 2 * t);
        const gain = (nIdx === 0 ? 0.12 : 0.065) * cEnv * breath;
        left += (detuneL + harmonic) * gain;
        right += (detuneR + harmonic) * gain;
      }
    }

    // Soft rhythmic warm pulse (100 BPM subtle heartbeat)
    const beatPhase = (t * (100 / 60)) % 1;
    const pulseEnv = Math.exp(-beatPhase * 9.5) * 0.055;
    const subPulse = Math.sin(2 * Math.PI * 65.41 * t) * pulseEnv;
    left += subPulse;
    right += subPulse;

    // Glassy chimes
    for (const ch of chimes) {
      const dt = t - ch.t;
      if (dt < 0 || dt > 1.8) continue;
      const env = Math.min(1, dt / 0.015) * Math.exp(-dt * 3.1);
      const tone =
        (Math.sin(2 * Math.PI * ch.f * dt) * 0.75 +
          Math.sin(2 * Math.PI * ch.f * 2.0 * dt) * 0.25) *
        env *
        0.11;
      left += tone * 0.95;
      right += tone * 1.05;
    }

    const sampleL = Math.max(-1, Math.min(1, left * masterEnv));
    const sampleR = Math.max(-1, Math.min(1, right * masterEnv));
    const offset = headerSize + i * 4;
    buf.writeInt16LE(Math.round(sampleL * 32767), offset);
    buf.writeInt16LE(Math.round(sampleR * 32767), offset + 2);
  }

  fs.writeFileSync(outPath, buf);
}

async function main() {
  console.log('Generating synthesized soundtrack…');
  generateSoundtrackWav(TMP_WAV);

  console.log('Launching headless Chromium for 1280x720 canvas rendering…');
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__renderIntroReady), { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);

  console.log(`Rendering ${TOTAL_FRAMES} frames (${DURATION_SEC}s @ ${FPS}fps) into ${OUT_MP4}…`);

  const ffmpeg = spawn(
    'ffmpeg',
    [
      '-y',
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      '-framerate', String(FPS),
      '-i', 'pipe:0',
      '-i', TMP_WAV,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-crf', '19',
      '-preset', 'fast',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-shortest',
      '-movflags', '+faststart',
      OUT_MP4,
    ],
    { stdio: ['pipe', 'ignore', 'pipe'] }
  );

  let ffmpegErr = '';
  ffmpeg.stderr.on('data', (chunk) => {
    ffmpegErr += chunk.toString();
  });

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const t = frame / FPS;
    const base64 = await page.evaluate((timeSec) => {
      window.__renderIntroFrame(timeSec);
      const canvas = document.getElementById('intro-render-canvas');
      return canvas.toDataURL('image/jpeg', 0.93).split(',')[1];
    }, t);

    const jpgBuf = Buffer.from(base64, 'base64');
    if (!ffmpeg.stdin.write(jpgBuf)) {
      await new Promise((resolve) => ffmpeg.stdin.once('drain', resolve));
    }
    if (frame > 0 && frame % 180 === 0) {
      console.log(`  rendered ${frame}/${TOTAL_FRAMES} frames (${Math.round((frame / TOTAL_FRAMES) * 100)}%)`);
    }
  }

  ffmpeg.stdin.end();
  const exitCode = await new Promise((resolve) => ffmpeg.on('close', resolve));
  await browser.close();

  try {
    fs.unlinkSync(TMP_WAV);
  } catch {
    // ignore
  }

  if (exitCode !== 0) {
    console.error('ffmpeg failed:\n', ffmpegErr);
    process.exit(1);
  }

  const stat = fs.statSync(OUT_MP4);
  console.log(`Done! Exported ${OUT_MP4} (${(stat.size / (1024 * 1024)).toFixed(2)} MB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
