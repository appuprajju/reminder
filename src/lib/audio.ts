import type { AlarmSoundId, NotifSoundId } from '../types';

export const ALARM_SOUNDS: { id: AlarmSoundId; label: string; subtitle: string }[] = [
  { id: 'radar', label: 'Radar Sonar', subtitle: 'Crisp ascending alarm pulse' },
  { id: 'marimba', label: 'Marimba Chimes', subtitle: 'Warm melodic wake pattern' },
  { id: 'apex', label: 'Apex Alert', subtitle: 'High-clarity dual-tone beacon' },
  { id: 'digital-alarm', label: 'Classic Digital', subtitle: 'Traditional quadruple beep' },
  { id: 'morning', label: 'Morning Breeze', subtitle: 'Gentle rising major chord' },
  { id: 'synth', label: 'Arcade Pulse', subtitle: 'Bright rhythmic arpeggio' },
  { id: 'gong', label: 'Zen Gong', subtitle: 'Deep resonant harmonic bell' },
];

export const NOTIF_SOUNDS: { id: NotifSoundId; label: string }[] = [
  { id: 'glass', label: 'Glass Chime' },
  { id: 'digital', label: 'Digital Ping' },
  { id: 'bell', label: 'Soft Vibraphone' },
  { id: 'zen', label: 'Singing Bowl' },
  { id: 'droplet', label: 'Water Droplet' },
];

let sharedCtx: AudioContext | null = null;
let alarmLoopTimer: number | null = null;
let alarmStopTimeout: number | null = null;
let customAudioEl: HTMLAudioElement | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedCtx) sharedCtx = new Ctx();
  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainPeak = 0.22
) {
  const now = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export function playNotificationChime(sound: NotifSoundId = 'glass') {
  const ctx = getAudioContext();
  if (!ctx) return;
  switch (sound) {
    case 'digital':
      playTone(ctx, 880, 0, 0.1, 'triangle', 0.2);
      playTone(ctx, 1174, 0.11, 0.14, 'triangle', 0.22);
      break;
    case 'bell':
      playTone(ctx, 523.25, 0, 0.45, 'sine', 0.22);
      playTone(ctx, 1046.5, 0.02, 0.35, 'sine', 0.1);
      break;
    case 'zen':
      playTone(ctx, 432, 0, 0.9, 'sine', 0.22);
      playTone(ctx, 648, 0.04, 0.7, 'sine', 0.08);
      break;
    case 'droplet':
      playTone(ctx, 600, 0, 0.08, 'sine', 0.18);
      playTone(ctx, 980, 0.07, 0.12, 'sine', 0.22);
      break;
    case 'glass':
    default:
      playTone(ctx, 1046.5, 0, 0.25, 'sine', 0.18);
      playTone(ctx, 1568, 0.12, 0.35, 'sine', 0.16);
      break;
  }
}

export function playAlarmCycle(sound: AlarmSoundId = 'radar') {
  const ctx = getAudioContext();
  if (!ctx) return;
  switch (sound) {
    case 'marimba':
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => playTone(ctx, f, i * 0.14, 0.22, 'triangle', 0.26));
      break;
    case 'apex':
      [987.77, 1318.5, 987.77, 1318.5].forEach((f, i) => playTone(ctx, f, i * 0.16, 0.14, 'sawtooth', 0.16));
      break;
    case 'digital-alarm':
      [0, 0.14, 0.28, 0.42].forEach((t) => playTone(ctx, 1760, t, 0.09, 'square', 0.14));
      break;
    case 'morning':
      [440, 554.37, 659.25, 880].forEach((f, i) => playTone(ctx, f, i * 0.18, 0.42, 'sine', 0.22));
      break;
    case 'synth':
      [440, 587.33, 659.25, 880, 659.25].forEach((f, i) => playTone(ctx, f, i * 0.11, 0.14, 'square', 0.12));
      break;
    case 'gong':
      playTone(ctx, 196, 0, 1.3, 'sine', 0.28);
      playTone(ctx, 294, 0.03, 1.0, 'triangle', 0.14);
      break;
    case 'radar':
    default:
      [0, 0.22, 0.44].forEach((t) => {
        playTone(ctx, 880, t, 0.14, 'sine', 0.26);
        playTone(ctx, 1320, t + 0.05, 0.12, 'triangle', 0.18);
      });
      break;
  }
}

/* IndexedDB persistence for user-selected custom device audio ringtones */
const IDB_NAME = 'reminderme-audio-v1';
const IDB_STORE = 'ringtones';

function openAudioDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveCustomRingtone(file: File): Promise<string> {
  const db = await openAudioDb();
  const buf = await file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put({ name: file.name, type: file.type, data: buf }, 'primary');
    tx.oncomplete = () => resolve(file.name);
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadCustomRingtoneUrl(): Promise<{ name: string; url: string } | null> {
  try {
    const db = await openAudioDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get('primary');
      req.onsuccess = () => {
        const val = req.result as { name: string; type: string; data: ArrayBuffer } | undefined;
        if (!val?.data) return resolve(null);
        const blob = new Blob([val.data], { type: val.type || 'audio/mpeg' });
        resolve({ name: val.name, url: URL.createObjectURL(blob) });
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function deleteCustomRingtone(): Promise<void> {
  try {
    const db = await openAudioDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete('primary');
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

export function stopAlarmSound() {
  if (alarmLoopTimer !== null) {
    window.clearInterval(alarmLoopTimer);
    alarmLoopTimer = null;
  }
  if (alarmStopTimeout !== null) {
    window.clearTimeout(alarmStopTimeout);
    alarmStopTimeout = null;
  }
  if (customAudioEl) {
    customAudioEl.pause();
    customAudioEl.currentTime = 0;
    customAudioEl = null;
  }
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(0);
  }
}

export async function startAlarmSound(
  sound: AlarmSoundId = 'radar',
  durationSec = 30,
  vibrate = true
) {
  stopAlarmSound();

  if (sound === 'custom') {
    const loaded = await loadCustomRingtoneUrl();
    if (loaded) {
      const el = new Audio(loaded.url);
      el.loop = true;
      customAudioEl = el;
      el.play().catch(() => playAlarmCycle('radar'));
    } else {
      playAlarmCycle('radar');
      alarmLoopTimer = window.setInterval(() => playAlarmCycle('radar'), 1500);
    }
  } else {
    playAlarmCycle(sound);
    alarmLoopTimer = window.setInterval(() => {
      playAlarmCycle(sound);
      if (vibrate && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([320, 160, 320]);
      }
    }, 1500);
  }

  if (vibrate && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([380, 160, 380, 160, 500]);
  }

  if (durationSec > 0) {
    alarmStopTimeout = window.setTimeout(() => stopAlarmSound(), durationSec * 1000);
  }
}
