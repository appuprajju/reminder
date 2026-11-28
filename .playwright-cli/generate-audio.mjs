import fs from 'node:fs';
import path from 'node:path';

const DURATION_SEC = 63;
const SAMPLE_RATE = 44100;
const OUT_WAV = path.resolve('.playwright-cli/intro-audio.wav');

const numSamples = DURATION_SEC * SAMPLE_RATE;
const headerSize = 44;
const dataSize = numSamples * 4;
const buf = Buffer.alloc(headerSize + dataSize);

buf.write('RIFF', 0);
buf.writeUInt32LE(36 + dataSize, 4);
buf.write('WAVE', 8);
buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SAMPLE_RATE, 24);
buf.writeUInt32LE(SAMPLE_RATE * 4, 28);
buf.writeUInt16LE(4, 32);
buf.writeUInt16LE(16, 34);
buf.write('data', 36);
buf.writeUInt32LE(dataSize, 40);

const chords = [
  { start: 0.0, end: 6.5, notes: [130.81, 196.0, 246.94, 293.66, 329.63] },
  { start: 6.5, end: 14.5, notes: [146.83, 220.0, 261.63, 329.63, 392.0] },
  { start: 14.5, end: 21.5, notes: [110.0, 164.81, 196.0, 246.94, 261.63] },
  { start: 21.5, end: 29.0, notes: [174.61, 220.0, 261.63, 329.63, 392.0] },
  { start: 29.0, end: 36.0, notes: [196.0, 246.94, 293.66, 329.63, 392.0] },
  { start: 36.0, end: 43.5, notes: [110.0, 164.81, 220.0, 261.63, 329.63] },
  { start: 43.5, end: 50.5, notes: [174.61, 220.0, 261.63, 329.63, 392.0] },
  { start: 50.5, end: 57.0, notes: [196.0, 246.94, 293.66, 349.23, 392.0] },
  { start: 57.0, end: 63.0, notes: [130.81, 196.0, 261.63, 329.63, 392.0] },
];

const chimes = [
  { t: 0.25, f: 523.25 }, { t: 0.55, f: 659.25 }, { t: 0.85, f: 783.99 },
  { t: 6.65, f: 587.33 }, { t: 6.90, f: 739.99 }, { t: 7.15, f: 880.0 },
  { t: 14.65, f: 523.25 }, { t: 14.90, f: 659.25 },
  { t: 21.65, f: 698.46 }, { t: 21.90, f: 880.0 },
  { t: 29.15, f: 587.33 }, { t: 29.40, f: 783.99 },
  { t: 36.15, f: 659.25 }, { t: 36.40, f: 880.0 },
  { t: 43.65, f: 698.46 }, { t: 43.90, f: 987.77 },
  { t: 50.65, f: 587.33 }, { t: 50.90, f: 783.99 },
  { t: 57.15, f: 523.25 }, { t: 57.45, f: 659.25 }, { t: 57.75, f: 783.99 }, { t: 60.4, f: 1046.5 },
];

for (let i = 0; i < numSamples; i++) {
  const t = i / SAMPLE_RATE;
  const fadeIn = Math.min(1, t / 1.2);
  const fadeOut = Math.min(1, (DURATION_SEC - t) / 1.8);
  const masterEnv = fadeIn * fadeOut;

  let left = 0;
  let right = 0;

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

  const beatPhase = (t * (100 / 60)) % 1;
  const pulseEnv = Math.exp(-beatPhase * 9.5) * 0.055;
  const subPulse = Math.sin(2 * Math.PI * 65.41 * t) * pulseEnv;
  left += subPulse;
  right += subPulse;

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

fs.writeFileSync(OUT_WAV, buf);
console.log(`Generated ${OUT_WAV}`);
