export interface IntroChapter {
  id: string;
  indexLabel: string;
  shortTitle: string;
  title: string;
  startSec: number;
  endSec: number;
  narration: string;
}

export const INTRO_VIDEO_DURATION = 36;
export const INTRO_VIDEO_FPS = 30;
export const INTRO_VIDEO_WIDTH = 1280;
export const INTRO_VIDEO_HEIGHT = 720;

export const INTRO_CHAPTERS: IntroChapter[] = [
  {
    id: 'overview',
    indexLabel: '01',
    shortTitle: 'Overview',
    title: 'Meet reminderme',
    startSec: 0,
    endSec: 5.5,
    narration:
      'Meet reminderme, your smart daily planner built for exact alarms, hands-free voice capture, and effortless focus.',
  },
  {
    id: 'voice',
    indexLabel: '02',
    shortTitle: 'Voice Capture',
    title: 'Hands-Free Voice Alarms',
    startSec: 5.5,
    endSec: 12.0,
    narration:
      'Tap Voice right on the home screen and speak naturally in English or Hindi. Say wake me up tomorrow at 6 30 a m, and reminderme automatically sets the time, repeat schedule, and alarm mode.',
  },
  {
    id: 'island',
    indexLabel: '03',
    shortTitle: 'EMO Island',
    title: 'Dynamic Island & EMO Eyes',
    startSec: 12.0,
    endSec: 18.0,
    narration:
      'Every action comes alive at the top of your screen with expressive EMO robot eyes inside the Dynamic Island, reacting when alarms are created, tasks are completed, or alerts ring.',
  },
  {
    id: 'focus',
    indexLabel: '04',
    shortTitle: 'Focus & Alarms',
    title: 'Focus Timer, Subtasks & Alarms',
    startSec: 18.0,
    endSec: 24.0,
    narration:
      'Stay locked in with a circular Focus Timer, interactive subtasks, custom alarm tones, and full-screen wake-up alarms with one-tap snooze.',
  },
  {
    id: 'sync',
    indexLabel: '05',
    shortTitle: 'Google Sync',
    title: 'Home Sign-In & Cloud Sync',
    startSec: 24.0,
    endSec: 30.0,
    narration:
      'Sign in directly from Home with Google or Email to sync across devices, connect Google Calendar and Gmail digests, and keep alarms reliable even offline.',
  },
  {
    id: 'start',
    indexLabel: '06',
    shortTitle: 'How to Use',
    title: 'Start in 3 Simple Steps',
    startSec: 30.0,
    endSec: 36.0,
    narration:
      'Start in three steps: sign in on Home, tap Voice or New to add your schedule, and let reminderme keep your day right on time.',
  },
];

export function getActiveChapter(timeSec: number): IntroChapter {
  const clamped = Math.max(0, Math.min(INTRO_VIDEO_DURATION - 0.001, timeSec));
  for (const ch of INTRO_CHAPTERS) {
    if (clamped >= ch.startSec && clamped < ch.endSec) return ch;
  }
  return INTRO_CHAPTERS[INTRO_CHAPTERS.length - 1];
}

/* ---------- Easing & Math Helpers ---------- */
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
}

function easeOutBack(t: number): number {
  const x = clamp01(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function easeInOutQuad(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

function sceneEnvelope(localT: number, duration: number, fadeIn = 0.5, fadeOut = 0.45): number {
  const enter = easeOutCubic(localT / fadeIn);
  const exit = localT > duration - fadeOut ? easeOutCubic((duration - localT) / fadeOut) : 1;
  return clamp01(Math.min(enter, exit));
}

/* ---------- Drawing Primitives ---------- */
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fillGlassCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  opts?: {
    bgTop?: string;
    bgBottom?: string;
    border?: string;
    highlight?: string;
    shadow?: boolean;
  }
) {
  ctx.save();
  if (opts?.shadow !== false) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.44)';
    ctx.shadowBlur = 32;
    ctx.shadowOffsetY = 14;
  }
  const grad = ctx.createLinearGradient(x, y, x + w * 0.4, y + h);
  grad.addColorStop(0, opts?.bgTop ?? 'rgba(26, 35, 66, 0.84)');
  grad.addColorStop(1, opts?.bgBottom ?? 'rgba(12, 17, 36, 0.90)');
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1.25;
  ctx.strokeStyle = opts?.border ?? 'rgba(255, 255, 255, 0.18)';
  ctx.stroke();

  // Subtle specular top edge
  ctx.beginPath();
  ctx.moveTo(x + r, y + 1);
  ctx.lineTo(x + w - r, y + 1);
  ctx.strokeStyle = opts?.highlight ?? 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(' ');
  let line = '';
  let curY = y;
  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, curY);
      line = words[i];
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, curY);
    curY += lineHeight;
  }
  return curY;
}

function drawTouchRipple(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number,
  color = '#38BDF8'
) {
  if (progress <= 0 || progress >= 1) return;
  const p = easeOutCubic(progress);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 8 + p * 34, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.globalAlpha = (1 - p) * 0.85;
  ctx.lineWidth = 3 * (1 - p) + 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, 6 + p * 12, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.globalAlpha = (1 - p) * 0.28;
  ctx.fill();
  ctx.restore();
}

function drawAppLogo(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  logoImg?: HTMLImageElement | null
) {
  const x = cx - size / 2;
  const y = cy - size / 2;
  const radius = size * 0.24;

  ctx.save();
  roundRectPath(ctx, x, y, size, size, radius);
  ctx.clip();

  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    ctx.drawImage(logoImg, x, y, size, size);
  } else {
    const g = ctx.createLinearGradient(x, y, x + size, y + size);
    g.addColorStop(0, '#38BDF8');
    g.addColorStop(0.55, '#0A84FF');
    g.addColorStop(1, '#1D4ED8');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, size, size);

    // Minimal geometric alarm bell mark
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = size * 0.08;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy + size * 0.03, size * 0.26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.11);
    ctx.lineTo(cx, cy + size * 0.04);
    ctx.lineTo(cx + size * 0.12, cy + size * 0.1);
    ctx.stroke();
  }
  ctx.restore();
}

function drawEmoEyes(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  mode: 'excited' | 'happy' | 'alert',
  t: number
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  const color =
    mode === 'excited' ? '#38BDF8' : mode === 'happy' ? '#34D399' : '#FB7185';
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  if (mode === 'excited') {
    const bounceY = Math.sin(t * 7) * 1.8;
    const blinkCycle = (t * 0.7) % 1;
    const scaleY = blinkCycle > 0.88 ? 0.16 : 1;

    [-16, 16].forEach((ox) => {
      ctx.save();
      ctx.translate(ox, bounceY);
      ctx.scale(1, scaleY);
      roundRectPath(ctx, -9, -11, 18, 22, 7);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.arc(3.5, -4, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  } else if (mode === 'happy') {
    const bounceY = Math.sin(t * 6) * 1.4;
    ctx.lineWidth = 4.6;
    ctx.lineCap = 'round';
    [-16, 16].forEach((ox) => {
      ctx.beginPath();
      ctx.arc(ox, bounceY + 3, 9.5, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
    });
    // Sparkle star
    const sp = 0.65 + 0.35 * Math.sin(t * 8);
    ctx.globalAlpha = sp;
    ctx.fillStyle = '#FDE68A';
    ctx.beginPath();
    ctx.arc(32, -9, 2.4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const shakeX = Math.sin(t * 24) * 2.2;
    [-16, 16].forEach((ox) => {
      ctx.save();
      ctx.translate(ox + shakeX, 0);
      roundRectPath(ctx, -9, -9, 18, 18, 5);
      ctx.fill();
      // Alert inner pupil
      ctx.fillStyle = '#050712';
      ctx.beginPath();
      ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  ctx.restore();
}

/* ---------- Persistent Background & Chrome ---------- */
function drawBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = '#050712';
  ctx.fillRect(0, 0, w, h);

  // Volumetric ambient orbs matching index.css .liquid-3d-scene
  const orbs = [
    {
      x: w * 0.16 + Math.sin(t * 0.35) * 44,
      y: h * 0.14 + Math.cos(t * 0.28) * 32,
      r: 480,
      c: 'rgba(56, 40, 148, 0.56)',
    },
    {
      x: w * 0.86 + Math.cos(t * 0.3) * 48,
      y: h * 0.22 + Math.sin(t * 0.36) * 36,
      r: 440,
      c: 'rgba(10, 132, 255, 0.36)',
    },
    {
      x: w * 0.52 + Math.sin(t * 0.25 + 1.2) * 56,
      y: h * 0.96 + Math.cos(t * 0.32) * 26,
      r: 460,
      c: 'rgba(134, 34, 114, 0.34)',
    },
  ];

  for (const orb of orbs) {
    const g = ctx.createRadialGradient(orb.x, orb.y, 12, orb.x, orb.y, orb.r);
    g.addColorStop(0, orb.c);
    g.addColorStop(1, 'rgba(5, 7, 18, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // Subtle architectural grid lines
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.028)';
  ctx.lineWidth = 1;
  const step = 64;
  for (let gx = 0; gx < w; gx += step) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.stroke();
  }
  for (let gy = 0; gy < h; gy += step) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTopHud(ctx: CanvasRenderingContext2D, w: number, t: number, logoImg?: HTMLImageElement | null) {
  const ch = getActiveChapter(t);
  const progress = clamp01(t / INTRO_VIDEO_DURATION);

  ctx.save();
  // Slim top progress bar
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(0, 0, w, 4);
  const pg = ctx.createLinearGradient(0, 0, w * progress, 0);
  pg.addColorStop(0, '#38BDF8');
  pg.addColorStop(0.55, '#0A84FF');
  pg.addColorStop(1, '#30D158');
  ctx.fillStyle = pg;
  ctx.fillRect(0, 0, w * progress, 4);

  // Subtle top brand + chapter text (unboxed, clean typography)
  if (t > 4.8 && t < 31.5) {
    const alpha =
      t < 5.5
        ? easeOutCubic((t - 4.8) / 0.7)
        : t > 30.8
          ? easeOutCubic((31.5 - t) / 0.7)
          : 1;
    ctx.globalAlpha = alpha;
    drawAppLogo(ctx, 74, 44, 26, logoImg);
    ctx.font = '700 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#F8FAFC';
    ctx.textBaseline = 'middle';
    ctx.fillText('reminderme', 96, 44);

    ctx.font = '500 13px "DM Sans", sans-serif';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
    ctx.textAlign = 'right';
    ctx.fillText(`${ch.indexLabel} / 06  ·  ${ch.title}`, w - 60, 44);
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

/* ---------- Reusable Left Copy Column ---------- */
function drawFeatureCopy(
  ctx: CanvasRenderingContext2D,
  localT: number,
  kicker: string,
  headlineLine1: string,
  headlineLine2: string,
  body: string,
  steps: { label: string; accent?: string }[]
) {
  const x = 76;
  const baseY = 176;

  // Kicker
  const kIn = easeOutCubic(localT / 0.45);
  ctx.save();
  ctx.globalAlpha = kIn;
  ctx.font = '700 15px "JetBrains Mono", monospace';
  ctx.fillStyle = '#38BDF8';
  ctx.fillText(kicker, x, baseY + (1 - kIn) * 16);

  // Display Headline
  const hIn = easeOutCubic((localT - 0.1) / 0.55);
  ctx.globalAlpha = hIn;
  ctx.font = '800 46px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(headlineLine1, x, baseY + 56 + (1 - hIn) * 22);
  ctx.fillStyle = '#BAE6FD';
  ctx.fillText(headlineLine2, x, baseY + 110 + (1 - hIn) * 22);

  // Body description
  const bIn = easeOutCubic((localT - 0.25) / 0.55);
  ctx.globalAlpha = bIn;
  ctx.font = '400 19px "DM Sans", sans-serif';
  ctx.fillStyle = 'rgba(203, 213, 225, 0.92)';
  const afterBodyY = drawWrappedText(ctx, body, x, baseY + 162 + (1 - bIn) * 14, 520, 30);

  // Numbered / checked usage highlights
  steps.forEach((step, idx) => {
    const sIn = easeOutCubic((localT - (0.55 + idx * 0.24)) / 0.5);
    if (sIn <= 0.01) return;
    const sy = afterBodyY + 26 + idx * 54 + (1 - sIn) * 16;
    ctx.save();
    ctx.globalAlpha = sIn;

    // Accent dot/check circle
    ctx.beginPath();
    ctx.arc(x + 12, sy - 5, 11, 0, Math.PI * 2);
    ctx.fillStyle = step.accent ?? 'rgba(10, 132, 255, 0.22)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 7.5, sy - 5);
    ctx.lineTo(x + 11, sy - 1.5);
    ctx.lineTo(x + 17, sy - 8.5);
    ctx.stroke();

    ctx.font = '600 17px "DM Sans", sans-serif';
    ctx.fillStyle = '#F1F5F9';
    ctx.fillText(step.label, x + 36, sy);
    ctx.restore();
  });

  ctx.restore();
}

/* ---------- Reusable Liquid-Glass Smartphone Frame ---------- */
interface PhoneBounds {
  x: number;
  y: number;
  w: number;
  h: number;
  innerX: number;
  innerY: number;
  innerW: number;
  innerH: number;
}

function drawPhoneFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  drawScreen: (b: PhoneBounds) => void,
  opts?: { hideDefaultNotch?: boolean }
) {
  const pad = 10;
  const bounds: PhoneBounds = {
    x,
    y,
    w,
    h,
    innerX: x + pad,
    innerY: y + pad,
    innerW: w - pad * 2,
    innerH: h - pad * 2,
  };

  ctx.save();
  // Outer titanium body
  ctx.shadowColor = 'rgba(0, 0, 0, 0.58)';
  ctx.shadowBlur = 46;
  ctx.shadowOffsetY = 22;
  roundRectPath(ctx, x, y, w, h, 46);
  const frameGrad = ctx.createLinearGradient(x, y, x + w, y + h);
  frameGrad.addColorStop(0, '#2B3654');
  frameGrad.addColorStop(0.5, '#11162A');
  frameGrad.addColorStop(1, '#1E2744');
  ctx.fillStyle = frameGrad;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
  ctx.stroke();

  // Inner clipped screen
  ctx.save();
  roundRectPath(ctx, bounds.innerX, bounds.innerY, bounds.innerW, bounds.innerH, 38);
  ctx.clip();

  const screenGrad = ctx.createLinearGradient(
    bounds.innerX,
    bounds.innerY,
    bounds.innerX + bounds.innerW,
    bounds.innerY + bounds.innerH
  );
  screenGrad.addColorStop(0, '#0D132B');
  screenGrad.addColorStop(0.55, '#070A18');
  screenGrad.addColorStop(1, '#0F1530');
  ctx.fillStyle = screenGrad;
  ctx.fillRect(bounds.innerX, bounds.innerY, bounds.innerW, bounds.innerH);

  // Subtle status bar
  ctx.font = '600 12px "JetBrains Mono", monospace';
  ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
  ctx.fillText('9:41', bounds.innerX + 24, bounds.innerY + 26);

  // Signal / Battery indicators
  ctx.fillStyle = 'rgba(248, 250, 252, 0.78)';
  roundRectPath(ctx, bounds.innerX + bounds.innerW - 44, bounds.innerY + 16, 22, 11, 3);
  ctx.strokeStyle = 'rgba(248, 250, 252, 0.65)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  roundRectPath(ctx, bounds.innerX + bounds.innerW - 42, bounds.innerY + 18, 16, 7, 1.5);
  ctx.fill();

  drawScreen(bounds);

  // Default slim Dynamic Island pill (unless scene animates its own expanded Island)
  if (!opts?.hideDefaultNotch) {
    roundRectPath(ctx, bounds.innerX + bounds.innerW / 2 - 44, bounds.innerY + 11, 88, 22, 11);
    ctx.fillStyle = '#03050C';
    ctx.fill();
  }

  // Home indicator bar
  roundRectPath(
    ctx,
    bounds.innerX + bounds.innerW / 2 - 52,
    bounds.innerY + bounds.innerH - 14,
    104,
    4.5,
    2.25
  );
  ctx.fillStyle = 'rgba(255, 255, 255, 0.34)';
  ctx.fill();

  ctx.restore();
  ctx.restore();
}

/* ---------- SCENE 1: Hero Title Reveal (0 - 5.5s) ---------- */
function renderScene1Overview(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  localT: number,
  logoImg?: HTMLImageElement | null
) {
  const env = sceneEnvelope(localT, 5.5, 0.6, 0.55);
  ctx.save();
  ctx.globalAlpha = env;

  const cx = w / 2;
  const cy = h * 0.41;

  // Rotating iridescent conic halo behind app logo
  const haloScale = easeOutBack(localT / 0.8);
  ctx.save();
  ctx.translate(cx, cy - 58);
  ctx.scale(haloScale, haloScale);
  ctx.rotate(localT * 0.75);
  const halo = ctx.createRadialGradient(0, 0, 18, 0, 0, 118);
  halo.addColorStop(0, 'rgba(56, 189, 248, 0.58)');
  halo.addColorStop(0.5, 'rgba(139, 92, 246, 0.28)');
  halo.addColorStop(1, 'rgba(10, 132, 255, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, 118, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Glass Emblem Box + Real App Icon
  const logoScale = easeOutBack((localT - 0.12) / 0.75);
  ctx.save();
  ctx.translate(cx, cy - 58);
  ctx.scale(logoScale, logoScale);
  fillGlassCard(ctx, -64, -64, 128, 128, 32, {
    bgTop: 'rgba(255, 255, 255, 0.22)',
    bgBottom: 'rgba(14, 24, 54, 0.85)',
    border: 'rgba(255, 255, 255, 0.38)',
  });
  drawAppLogo(ctx, 0, 0, 88, logoImg);
  ctx.restore();

  // Brand Title
  const titleIn = easeOutCubic((localT - 0.4) / 0.65);
  ctx.save();
  ctx.globalAlpha = env * titleIn;
  ctx.textAlign = 'center';
  ctx.font = '800 68px "Plus Jakarta Sans", sans-serif';
  const titleGrad = ctx.createLinearGradient(cx - 180, cy + 40, cx + 180, cy + 110);
  titleGrad.addColorStop(0, '#FFFFFF');
  titleGrad.addColorStop(0.6, '#E0F2FE');
  titleGrad.addColorStop(1, '#7DD3FC');
  ctx.fillStyle = titleGrad;
  ctx.fillText('reminderme', cx, cy + 78 + (1 - titleIn) * 24);

  // Clean unboxed subtitle
  const subIn = easeOutCubic((localT - 0.75) / 0.65);
  ctx.globalAlpha = env * subIn;
  ctx.font = '500 22px "DM Sans", sans-serif';
  ctx.fillStyle = '#CBD5E1';
  ctx.fillText(
    'Smart Daily Planner  ·  Exact Alarms  ·  Hands-Free Voice',
    cx,
    cy + 124 + (1 - subIn) * 16
  );

  // 3 Glass Feature Cards fanning in below
  const cards = [
    { label: 'Voice Alarms', desc: 'English & Hindi speech parsing', accent: '#38BDF8' },
    { label: 'EMO Dynamic Island', desc: 'Live animated robot eyes', accent: '#30D158' },
    { label: 'Google & Offline Sync', desc: 'Calendar, Gmail & Firebase', accent: '#A78BFA' },
  ];
  const cardW = 290;
  const gap = 24;
  const startX = cx - (cardW * 3 + gap * 2) / 2;
  cards.forEach((c, idx) => {
    const cIn = easeOutBack((localT - (1.25 + idx * 0.22)) / 0.7);
    if (cIn <= 0.01) return;
    const x = startX + idx * (cardW + gap);
    const y = cy + 178 + (1 - cIn) * 34;
    ctx.save();
    ctx.globalAlpha = env * clamp01(cIn);
    fillGlassCard(ctx, x, y, cardW, 92, 22);
    ctx.textAlign = 'left';
    ctx.fillStyle = c.accent;
    ctx.beginPath();
    ctx.arc(x + 24, y + 32, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(c.label, x + 38, y + 38);
    ctx.font = '400 14px "DM Sans", sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(c.desc, x + 22, y + 66);
    ctx.restore();
  });

  // Developer signature
  const devIn = easeOutCubic((localT - 2.0) / 0.65);
  ctx.globalAlpha = env * devIn * 0.88;
  ctx.textAlign = 'center';
  ctx.font = '500 14px "JetBrains Mono", monospace';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('developed by Prajwal M </yourstudio>', cx, h - 38);
  ctx.restore();

  ctx.restore();
}

/* ---------- SCENE 2: Hands-Free Voice Capture (5.5 - 12.0s) ---------- */
function renderScene2Voice(ctx: CanvasRenderingContext2D, localT: number) {
  const env = sceneEnvelope(localT, 6.5);
  ctx.save();
  ctx.globalAlpha = env;

  drawFeatureCopy(
    ctx,
    localT,
    '01 · HANDS-FREE VOICE',
    'Speak Naturally.',
    'Alarm Set in Seconds.',
    'Tap the Voice button on Home and speak in English or Hindi. reminderme extracts the title, exact time, repeat schedule, and alarm volume automatically.',
    [
      { label: 'Single tap for hands-free listening — no holding needed', accent: 'rgba(10,132,255,0.28)' },
      { label: 'Understands "half past 7", "in 30 mins" & "tomorrow 6:30am"', accent: 'rgba(56,189,248,0.26)' },
      { label: 'Instant toggles for Loud Alarm, +15m nudge & Daily repeat', accent: 'rgba(48,209,88,0.26)' },
    ]
  );

  const phoneSlide = easeOutCubic(localT / 0.65);
  const px = 772;
  const py = 74 + (1 - phoneSlide) * 44;

  drawPhoneFrame(ctx, px, py, 336, 588, (b) => {
    // Mini Today header inside phone
    ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Good Morning', b.innerX + 20, b.innerY + 62);

    // Quick-add input + Voice button
    fillGlassCard(ctx, b.innerX + 16, b.innerY + 78, b.innerW - 32, 54, 16, { shadow: false });
    ctx.font = '400 12px "DM Sans", sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('Gym 6pm, Meds 9am…', b.innerX + 30, b.innerY + 109);

    // Highlighted Voice button
    const voiceBtnX = b.innerX + b.innerW - 104;
    const voiceBtnY = b.innerY + 87;
    roundRectPath(ctx, voiceBtnX, voiceBtnY, 76, 36, 12);
    ctx.fillStyle = '#0A84FF';
    ctx.fill();
    ctx.font = '700 12px "DM Sans", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Voice', voiceBtnX + 22, voiceBtnY + 22);

    // Tap ripple on Voice button around localT = 0.65..1.3
    drawTouchRipple(ctx, voiceBtnX + 38, voiceBtnY + 18, (localT - 0.65) / 0.65, '#38BDF8');

    // Voice Capture Bottom Sheet sliding up at localT = 1.0
    const sheetIn = easeOutCubic((localT - 1.0) / 0.55);
    if (sheetIn > 0.01) {
      const sh = 420;
      const sy = b.innerY + b.innerH - sh * sheetIn;

      // Backdrop dim
      ctx.fillStyle = `rgba(3, 6, 16, ${(sheetIn * 0.58).toFixed(2)})`;
      ctx.fillRect(b.innerX, b.innerY, b.innerW, b.innerH);

      fillGlassCard(ctx, b.innerX + 8, sy, b.innerW - 16, sh, 28, {
        bgTop: 'rgba(20, 28, 56, 0.96)',
        bgBottom: 'rgba(10, 14, 30, 0.98)',
        border: 'rgba(255, 255, 255, 0.22)',
      });

      // Drag handle
      roundRectPath(ctx, b.innerX + b.innerW / 2 - 20, sy + 10, 40, 4, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fill();

      // Header + Language indicator
      ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('Voice Alarm & Reminder', b.innerX + 24, sy + 42);
      ctx.font = '500 11px "DM Sans", sans-serif';
      ctx.fillStyle = '#38BDF8';
      ctx.fillText('English (IN) · Listening', b.innerX + 24, sy + 60);

      // Animated Mic Orb + 7-bar audio cadence visualizer
      const listening = localT < 3.5;
      const orbCx = b.innerX + b.innerW / 2;
      const orbCy = sy + 114;

      if (listening) {
        const pulse = (localT * 1.4) % 1;
        ctx.beginPath();
        ctx.arc(orbCx, orbCy, 28 + pulse * 24, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(56, 189, 248, ${(1 - pulse) * 0.6})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      const orbGrad = ctx.createRadialGradient(orbCx - 8, orbCy - 8, 4, orbCx, orbCy, 30);
      orbGrad.addColorStop(0, listening ? '#60A5FA' : '#34D399');
      orbGrad.addColorStop(1, listening ? '#0A84FF' : '#059669');
      ctx.beginPath();
      ctx.arc(orbCx, orbCy, 28, 0, Math.PI * 2);
      ctx.fillStyle = orbGrad;
      ctx.fill();

      // Crisp white microphone glyph inside orb
      ctx.strokeStyle = '#FFFFFF';
      ctx.fillStyle = '#FFFFFF';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      roundRectPath(ctx, orbCx - 5, orbCy - 11, 10, 14, 5);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(orbCx, orbCy - 1, 9, 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(orbCx, orbCy + 8);
      ctx.lineTo(orbCx, orbCy + 13);
      ctx.moveTo(orbCx - 5, orbCy + 13);
      ctx.lineTo(orbCx + 5, orbCy + 13);
      ctx.stroke();

      // 7-bar cadence visualizer flanking the orb
      for (let i = 0; i < 7; i++) {
        const bx = orbCx - 72 + i * 24;
        const amp = listening
          ? 8 + Math.abs(Math.sin(localT * 9 + i * 0.9)) * 18
          : 5;
        roundRectPath(ctx, bx - 2.5, orbCy + 42 - amp / 2, 5, amp, 2.5);
        ctx.fillStyle = listening ? '#38BDF8' : '#34D399';
        ctx.fill();
      }

      // Live typing spoken transcript
      const fullQuote = '“Wake me up tomorrow at 6:30am”';
      const typedChars = Math.floor(clamp01((localT - 1.45) / 1.8) * fullQuote.length);
      const quoteShown = fullQuote.slice(0, typedChars);
      ctx.font = '600 14px "DM Sans", sans-serif';
      ctx.fillStyle = '#F8FAFC';
      ctx.textAlign = 'center';
      ctx.fillText(quoteShown || 'Listening…', orbCx, sy + 184);
      ctx.textAlign = 'left';

      // Parsed Preview Card appearing at localT = 3.1
      const parsedIn = easeOutBack((localT - 3.1) / 0.55);
      if (parsedIn > 0.01) {
        ctx.save();
        ctx.globalAlpha = env * clamp01(parsedIn);
        const pyCard = sy + 202 + (1 - parsedIn) * 16;
        fillGlassCard(ctx, b.innerX + 20, pyCard, b.innerW - 40, 128, 18, {
          bgTop: 'rgba(10, 132, 255, 0.18)',
          bgBottom: 'rgba(15, 23, 42, 0.88)',
          border: 'rgba(56, 189, 248, 0.35)',
          shadow: false,
        });

        ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('Wake-up alarm', b.innerX + 34, pyCard + 28);
        ctx.font = '600 12px "JetBrains Mono", monospace';
        ctx.fillStyle = '#7DD3FC';
        ctx.fillText('06:30 AM  ·  Tomorrow', b.innerX + 34, pyCard + 48);

        // Mode segmented bar: Loud Alarm | Gentle Reminder
        roundRectPath(ctx, b.innerX + 34, pyCard + 62, 114, 24, 8);
        ctx.fillStyle = '#0A84FF';
        ctx.fill();
        ctx.font = '600 11px "DM Sans", sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('Loud Alarm', b.innerX + 58, pyCard + 78);

        roundRectPath(ctx, b.innerX + 154, pyCard + 62, 110, 24, 8);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fill();
        ctx.fillStyle = '#94A3B8';
        ctx.fillText('Gentle', b.innerX + 190, pyCard + 78);

        // Quick nudges row
        ['+15m', '+30m', 'Daily', 'Mon-Fri'].forEach((lbl, idx) => {
          const nx = b.innerX + 34 + idx * 60;
          roundRectPath(ctx, nx, pyCard + 94, 54, 22, 7);
          ctx.fillStyle = idx === 2 ? 'rgba(56,189,248,0.28)' : 'rgba(255,255,255,0.07)';
          ctx.fill();
          ctx.font = '600 10px "DM Sans", sans-serif';
          ctx.fillStyle = idx === 2 ? '#E0F2FE' : '#CBD5E1';
          ctx.textAlign = 'center';
          ctx.fillText(lbl, nx + 27, pyCard + 109);
        });
        ctx.textAlign = 'left';

        // Primary Save Alarm Button
        const saveY = sy + 346;
        roundRectPath(ctx, b.innerX + 20, saveY, b.innerW - 40, 42, 14);
        const btnGrad = ctx.createLinearGradient(b.innerX + 20, saveY, b.innerX + 20, saveY + 42);
        btnGrad.addColorStop(0, '#4BA3FF');
        btnGrad.addColorStop(1, '#0A84FF');
        ctx.fillStyle = btnGrad;
        ctx.fill();
        ctx.font = '700 14px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText('Save Alarm', orbCx, saveY + 26);
        ctx.textAlign = 'left';

        // Tap ripple on Save Alarm at localT = 5.1
        drawTouchRipple(ctx, orbCx, saveY + 21, (localT - 5.1) / 0.65, '#34D399');
        ctx.restore();
      }
    }
  });

  ctx.restore();
}

/* ---------- SCENE 3: Dynamic Island & EMO Robot Eyes (12.0 - 18.0s) ---------- */
function renderScene3DynamicIsland(ctx: CanvasRenderingContext2D, localT: number) {
  const env = sceneEnvelope(localT, 6.0);
  ctx.save();
  ctx.globalAlpha = env;

  drawFeatureCopy(
    ctx,
    localT,
    '02 · EMO DYNAMIC ISLAND',
    'Alive at the Top',
    'of Your Phone.',
    'Every alarm created, reminder checked off, and ringing alert triggers an animated Dynamic Island with expressive EMO robot eyes.',
    [
      { label: 'Excited eyes pop in when you create a new alarm', accent: 'rgba(56,189,248,0.28)' },
      { label: 'Happy squint celebrates every completed reminder', accent: 'rgba(48,209,88,0.28)' },
      { label: 'Alert eyes pulse whenever an alarm starts ringing', accent: 'rgba(255,69,58,0.28)' },
    ]
  );

  const px = 772;
  const py = 74;

  // Cycle through the 3 EMO states across the 6s scene
  const phase = localT < 2.0 ? 0 : localT < 4.0 ? 1 : 2;
  const phaseT = localT - phase * 2.0;
  const islandMeta = [
    {
      mode: 'excited' as const,
      title: 'Alarm Created',
      sub: 'Wake-up alarm · 6:30 AM',
      ring: 'rgba(56, 189, 248, 0.55)',
    },
    {
      mode: 'happy' as const,
      title: 'Task Completed',
      sub: 'Morning Hydration · Done!',
      ring: 'rgba(52, 211, 153, 0.55)',
    },
    {
      mode: 'alert' as const,
      title: 'Alarm Ringing',
      sub: 'Team Standup · Now',
      ring: 'rgba(251, 113, 133, 0.6)',
    },
  ][phase];

  drawPhoneFrame(
    ctx,
    px,
    py,
    336,
    588,
    (b) => {
      // Background Today screen content
      ctx.font = '800 34px "JetBrains Mono", monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('06:30', b.innerX + 24, b.innerY + 136);
      ctx.font = '600 13px "JetBrains Mono", monospace';
      ctx.fillStyle = '#7DD3FC';
      ctx.fillText('AM  ·  TODAY', b.innerX + 136, b.innerY + 132);

      // Reminder rows showing live completion during phase 1
      const rows = [
        { title: 'Wake-up alarm', time: '06:30 AM', done: false, alarm: true },
        { title: 'Morning Hydration', time: '07:15 AM', done: phase >= 1, alarm: false },
        { title: 'Team Standup', time: '10:00 AM', done: false, alarm: true },
        { title: 'Evening Walk', time: '06:00 PM', done: false, alarm: false },
      ];

      rows.forEach((r, idx) => {
        const ry = b.innerY + 170 + idx * 82;
        const highlight = (phase === 0 && idx === 0) || (phase === 1 && idx === 1) || (phase === 2 && idx === 2);
        fillGlassCard(ctx, b.innerX + 18, ry, b.innerW - 36, 68, 18, {
          border: highlight ? islandMeta.ring : 'rgba(255,255,255,0.12)',
          shadow: false,
        });

        // Checkbox
        ctx.beginPath();
        ctx.arc(b.innerX + 42, ry + 34, 12, 0, Math.PI * 2);
        if (r.done) {
          ctx.fillStyle = '#30D158';
          ctx.fill();
          ctx.strokeStyle = '#050712';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(b.innerX + 37, ry + 34);
          ctx.lineTo(b.innerX + 40.5, ry + 38);
          ctx.lineTo(b.innerX + 47.5, ry + 30);
          ctx.stroke();
        } else {
          ctx.strokeStyle = r.alarm ? '#38BDF8' : 'rgba(255,255,255,0.34)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.font = '700 14px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = r.done ? 'rgba(148,163,184,0.7)' : '#FFFFFF';
        ctx.fillText(r.title, b.innerX + 66, ry + 30);

        ctx.font = '500 12px "JetBrains Mono", monospace';
        ctx.fillStyle = r.alarm ? '#7DD3FC' : '#94A3B8';
        ctx.fillText(`${r.time}  ·  ${r.alarm ? 'Loud Alarm' : 'Reminder'}`, b.innerX + 66, ry + 50);
      });

      // Expanded Animated Dynamic Island at Top of Phone
      const pop = easeOutBack(phaseT / 0.48);
      const retract = phaseT > 1.72 ? easeOutCubic((2.0 - phaseT) / 0.28) : 1;
      const expand = clamp01(Math.min(pop, retract));
      const islandW = 92 + 190 * expand;
      const islandH = 24 + 44 * expand;
      const islandX = b.innerX + (b.innerW - islandW) / 2;
      const islandY = b.innerY + 11;

      ctx.save();
      ctx.shadowColor = islandMeta.ring;
      ctx.shadowBlur = 24 * expand;
      roundRectPath(ctx, islandX, islandY, islandW, islandH, Math.min(islandH / 2, 30));
      ctx.fillStyle = '#03050C';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = islandMeta.ring;
      ctx.stroke();
      ctx.restore();

      if (expand > 0.35) {
        ctx.save();
        ctx.globalAlpha = env * clamp01((expand - 0.35) / 0.45);
        // Live EMO Eyes inside Dynamic Island
        drawEmoEyes(ctx, islandX + 46, islandY + islandH / 2, 0.88, islandMeta.mode, localT);

        ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(islandMeta.title, islandX + 92, islandY + 28);
        ctx.font = '500 11px "DM Sans", sans-serif';
        ctx.fillStyle = '#CBD5E1';
        ctx.fillText(islandMeta.sub, islandX + 92, islandY + 47);
        ctx.restore();
      }
    },
    { hideDefaultNotch: true }
  );

  // Floating enlarged EMO showcase preview pill-less badge beside phone
  const badgeIn = easeOutBack((localT - 0.35) / 0.55);
  ctx.save();
  ctx.globalAlpha = env * clamp01(badgeIn);
  fillGlassCard(ctx, 646, 128, 114, 96, 22, { border: islandMeta.ring });
  drawEmoEyes(ctx, 703, 166, 1.05, islandMeta.mode, localT);
  ctx.font = '700 11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#E2E8F0';
  ctx.textAlign = 'center';
  ctx.fillText(islandMeta.mode.toUpperCase(), 703, 208);
  ctx.textAlign = 'left';
  ctx.restore();

  ctx.restore();
}

/* ---------- SCENE 4: Focus Timer, Subtasks & Full-Screen Alarms (18.0 - 24.0s) ---------- */
function renderScene4FocusAlarms(ctx: CanvasRenderingContext2D, localT: number) {
  const env = sceneEnvelope(localT, 6.0);
  ctx.save();
  ctx.globalAlpha = env;

  drawFeatureCopy(
    ctx,
    localT,
    '03 · FOCUS & EXACT ALARMS',
    'Deep Focus &',
    'Unmissable Alarms.',
    'Check off subtasks right inside a reminder, launch a circular Focus Timer for deep work, and wake up to custom tones with instant snooze.',
    [
      { label: 'Live Focus Timer ring keeps distractions away', accent: 'rgba(56,189,248,0.28)' },
      { label: 'Multi-step subtasks & daily routine packs included', accent: 'rgba(48,209,88,0.28)' },
      { label: 'Custom ringtones + full-screen snooze & dismiss overlay', accent: 'rgba(255,159,10,0.28)' },
    ]
  );

  const px = 772;
  const py = 74;
  const alarmMode = easeInOutQuad((localT - 3.1) / 0.65);

  drawPhoneFrame(ctx, px, py, 336, 588, (b) => {
    const cx = b.innerX + b.innerW / 2;

    // Part A: Focus Timer + Subtasks
    if (alarmMode < 0.98) {
      ctx.save();
      ctx.globalAlpha = env * (1 - alarmMode);

      ctx.font = '700 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText('Focus Session', cx, b.innerY + 72);
      ctx.font = '500 12px "DM Sans", sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText('Morning Deep Work', cx, b.innerY + 92);

      // Circular Focus Progress Ring
      const ringCy = b.innerY + 206;
      const r = 78;
      const pct = 0.68 + clamp01(localT / 3.0) * 0.16;

      ctx.beginPath();
      ctx.arc(cx, ringCy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 11;
      ctx.stroke();

      const ringGrad = ctx.createLinearGradient(cx - r, ringCy - r, cx + r, ringCy + r);
      ringGrad.addColorStop(0, '#38BDF8');
      ringGrad.addColorStop(0.55, '#0A84FF');
      ringGrad.addColorStop(1, '#30D158');
      ctx.beginPath();
      ctx.arc(cx, ringCy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
      ctx.strokeStyle = ringGrad;
      ctx.lineWidth = 11;
      ctx.lineCap = 'round';
      ctx.stroke();

      const secsLeft = Math.max(0, Math.floor(24 * 60 + 25 - localT * 4));
      const mm = String(Math.floor(secsLeft / 60)).padStart(2, '0');
      const ss = String(secsLeft % 60).padStart(2, '0');
      ctx.font = '700 34px "JetBrains Mono", monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`${mm}:${ss}`, cx, ringCy + 8);
      ctx.font = '500 11px "DM Sans", sans-serif';
      ctx.fillStyle = '#7DD3FC';
      ctx.fillText('FOCUSING', cx, ringCy + 30);

      // Subtasks list
      ctx.textAlign = 'left';
      const subtasks = [
        { label: 'Review priority schedule', done: true },
        { label: 'Finish sprint tasks', done: localT > 1.35 },
        { label: 'Send daily digest email', done: localT > 2.2 },
      ];
      subtasks.forEach((st, idx) => {
        const sy = b.innerY + 324 + idx * 54;
        fillGlassCard(ctx, b.innerX + 20, sy, b.innerW - 40, 44, 14, { shadow: false });
        ctx.beginPath();
        ctx.arc(b.innerX + 42, sy + 22, 9, 0, Math.PI * 2);
        if (st.done) {
          ctx.fillStyle = '#30D158';
          ctx.fill();
        } else {
          ctx.strokeStyle = 'rgba(255,255,255,0.35)';
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }
        ctx.font = '500 13px "DM Sans", sans-serif';
        ctx.fillStyle = st.done ? '#CBD5E1' : '#FFFFFF';
        ctx.fillText(st.label, b.innerX + 62, sy + 26);
      });
      ctx.restore();
    }

    // Part B: Full-Screen Ringing Alarm Overlay
    if (alarmMode > 0.02) {
      ctx.save();
      ctx.globalAlpha = env * alarmMode;

      const alarmBg = ctx.createRadialGradient(cx, b.innerY + 230, 20, cx, b.innerY + 230, 260);
      alarmBg.addColorStop(0, 'rgba(10, 132, 255, 0.38)');
      alarmBg.addColorStop(1, 'rgba(5, 7, 18, 0.96)');
      ctx.fillStyle = alarmBg;
      ctx.fillRect(b.innerX, b.innerY, b.innerW, b.innerH);

      // Pulsing alarm ripples
      for (let rIdx = 0; rIdx < 3; rIdx++) {
        const p = (localT * 0.8 + rIdx * 0.33) % 1;
        ctx.beginPath();
        ctx.arc(cx, b.innerY + 218, 36 + p * 86, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(56, 189, 248, ${(1 - p) * 0.55})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(cx, b.innerY + 218, 38, 0, Math.PI * 2);
      ctx.fillStyle = '#0A84FF';
      ctx.fill();
      // Bell silhouette
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, b.innerY + 218, 14, Math.PI, 0);
      ctx.lineTo(cx + 16, b.innerY + 228);
      ctx.lineTo(cx - 16, b.innerY + 228);
      ctx.closePath();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.font = '800 44px "JetBrains Mono", monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('06:30', cx, b.innerY + 318);
      ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#E0F2FE';
      ctx.fillText('Wake-up alarm', cx, b.innerY + 350);
      ctx.font = '500 12px "DM Sans", sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText('Radar Tone · Repeating Daily', cx, b.innerY + 372);

      // Snooze + Dismiss controls
      roundRectPath(ctx, b.innerX + 24, b.innerY + 422, b.innerW - 48, 46, 16);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.font = '700 14px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('Snooze 10 min', cx, b.innerY + 450);

      roundRectPath(ctx, b.innerX + 24, b.innerY + 480, b.innerW - 48, 46, 16);
      ctx.fillStyle = '#FF453A';
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('Dismiss Alarm', cx, b.innerY + 508);

      ctx.textAlign = 'left';
      ctx.restore();
    }
  });

  ctx.restore();
}

/* ---------- SCENE 5: Home Sign-In, Google Calendar & Offline Sync (24.0 - 30.0s) ---------- */
function renderScene5Sync(ctx: CanvasRenderingContext2D, localT: number) {
  const env = sceneEnvelope(localT, 6.0);
  ctx.save();
  ctx.globalAlpha = env;

  drawFeatureCopy(
    ctx,
    localT,
    '04 · CONNECTED EVERYWHERE',
    'Home Sign-In &',
    'Google Workspace Sync.',
    'Sign in right on the Home screen with Google or Email. Connect Google Calendar & Gmail anytime, while offline-first storage keeps alarms safe.',
    [
      { label: 'One-tap Google or Email sign-in right from Home', accent: 'rgba(10,132,255,0.28)' },
      { label: 'Import Google Calendar events & send Gmail digests', accent: 'rgba(56,189,248,0.28)' },
      { label: 'Firebase Cloud Sync + Offline Mode protection', accent: 'rgba(48,209,88,0.28)' },
    ]
  );

  const px = 772;
  const py = 74;
  const signedIn = easeInOutQuad((localT - 2.3) / 0.6);

  drawPhoneFrame(ctx, px, py, 336, 588, (b) => {
    const cx = b.innerX + b.innerW / 2;

    // Top app bar inside phone
    ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('reminderme', b.innerX + 22, b.innerY + 62);

    if (signedIn < 0.5) {
      roundRectPath(ctx, b.innerX + b.innerW - 86, b.innerY + 44, 66, 26, 13);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.fill();
      ctx.font = '600 11px "DM Sans", sans-serif';
      ctx.fillStyle = '#E0F2FE';
      ctx.fillText('Sign In', b.innerX + b.innerW - 70, b.innerY + 61);
    } else {
      ctx.beginPath();
      ctx.arc(b.innerX + b.innerW - 34, b.innerY + 57, 13, 0, Math.PI * 2);
      ctx.fillStyle = '#30D158';
      ctx.fill();
      ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#050712';
      ctx.textAlign = 'center';
      ctx.fillText('P', b.innerX + b.innerW - 34, b.innerY + 61);
      ctx.textAlign = 'left';
    }

    // State A: Home Sign-In Card
    if (signedIn < 0.98) {
      ctx.save();
      ctx.globalAlpha = env * (1 - signedIn);
      fillGlassCard(ctx, b.innerX + 18, b.innerY + 96, b.innerW - 36, 172, 20, {
        border: 'rgba(56, 189, 248, 0.34)',
        shadow: false,
      });
      ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('Sign in & Connect Google', b.innerX + 34, b.innerY + 126);
      ctx.font = '400 12px "DM Sans", sans-serif';
      ctx.fillStyle = '#94A3B8';
      drawWrappedText(
        ctx,
        'Sync your alarms & reminders across all devices right from Home.',
        b.innerX + 34,
        b.innerY + 148,
        b.innerW - 68,
        18
      );

      // Official white Google button
      const gBtnY = b.innerY + 198;
      roundRectPath(ctx, b.innerX + 34, gBtnY, b.innerW - 68, 42, 12);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.font = '700 13px "DM Sans", sans-serif';
      ctx.fillStyle = '#1F1F1F';
      ctx.textAlign = 'center';
      ctx.fillText('G   Sign in with Google', cx, gBtnY + 26);
      ctx.textAlign = 'left';

      // Tap ripple at localT = 1.65
      drawTouchRipple(ctx, cx, gBtnY + 21, (localT - 1.65) / 0.65, '#0A84FF');
      ctx.restore();
    }

    // State B: Synced Workspace + Cloud Hub
    if (signedIn > 0.02) {
      ctx.save();
      ctx.globalAlpha = env * signedIn;

      const cards = [
        {
          title: 'Firebase Cloud Synced',
          sub: 'All devices up to date · Offline safe',
          tag: 'SYNCED',
          accent: '#30D158',
        },
        {
          title: 'Google Calendar',
          sub: 'Team Standup · 10:00 AM imported',
          tag: 'CALENDAR',
          accent: '#38BDF8',
        },
        {
          title: 'Gmail Daily Digest',
          sub: 'Morning agenda ready to email',
          tag: 'GMAIL',
          accent: '#F59E0B',
        },
        {
          title: 'Offline Lock-Screen Mode',
          sub: 'Alarms trigger even without Wi-Fi',
          tag: 'ACTIVE',
          accent: '#A78BFA',
        },
      ];

      cards.forEach((c, idx) => {
        const cardIn = easeOutBack((localT - (2.45 + idx * 0.28)) / 0.5);
        const cy = b.innerY + 98 + idx * 102 + (1 - clamp01(cardIn)) * 22;
        fillGlassCard(ctx, b.innerX + 18, cy, b.innerW - 36, 86, 18, {
          border: 'rgba(255,255,255,0.16)',
          shadow: false,
        });
        ctx.fillStyle = c.accent;
        ctx.beginPath();
        ctx.arc(b.innerX + 38, cy + 28, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '700 10px "JetBrains Mono", monospace';
        ctx.fillStyle = c.accent;
        ctx.fillText(c.tag, b.innerX + 50, cy + 32);

        ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(c.title, b.innerX + 34, cy + 54);
        ctx.font = '400 12px "DM Sans", sans-serif';
        ctx.fillStyle = '#94A3B8';
        ctx.fillText(c.sub, b.innerX + 34, cy + 73);
      });

      ctx.restore();
    }
  });

  ctx.restore();
}

/* ---------- SCENE 6: 3-Step Quick Start + Outro (30.0 - 36.0s) ---------- */
function renderScene6Outro(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  localT: number,
  logoImg?: HTMLImageElement | null
) {
  const env = sceneEnvelope(localT, 6.0, 0.55, 0.4);
  ctx.save();
  ctx.globalAlpha = env;

  const cx = w / 2;

  // Title
  const hIn = easeOutCubic(localT / 0.55);
  ctx.textAlign = 'center';
  ctx.font = '700 15px "JetBrains Mono", monospace';
  ctx.fillStyle = '#38BDF8';
  ctx.fillText('HOW TO GET STARTED', cx, 118 + (1 - hIn) * 14);

  ctx.font = '800 46px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('Ready in Three Simple Steps', cx, 174 + (1 - hIn) * 18);

  // 3-Step Cards
  const steps = [
    {
      num: '01',
      title: 'Sign In on Home',
      desc: 'Tap Google or Email directly on Home to keep your reminders synced across devices.',
      accent: '#38BDF8',
    },
    {
      num: '02',
      title: 'Tap Voice or + New',
      desc: 'Speak naturally or type quick reminders. Pick Loud Alarm, Gentle Reminder, or Repeat.',
      accent: '#30D158',
    },
    {
      num: '03',
      title: 'Stay Right On Time',
      desc: 'Watch EMO eyes confirm actions, use Focus Mode, and rely on offline lock-screen alerts.',
      accent: '#A78BFA',
    },
  ];

  const cardW = 344;
  const gap = 26;
  const startX = cx - (cardW * 3 + gap * 2) / 2;
  steps.forEach((st, idx) => {
    const sIn = easeOutBack((localT - (0.35 + idx * 0.25)) / 0.65);
    if (sIn <= 0.01) return;
    const x = startX + idx * (cardW + gap);
    const y = 224 + (1 - sIn) * 28;
    ctx.save();
    ctx.globalAlpha = env * clamp01(sIn);
    fillGlassCard(ctx, x, y, cardW, 204, 24);
    ctx.textAlign = 'left';
    ctx.font = '800 28px "JetBrains Mono", monospace';
    ctx.fillStyle = st.accent;
    ctx.fillText(st.num, x + 26, y + 50);

    ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(st.title, x + 26, y + 92);

    ctx.font = '400 15px "DM Sans", sans-serif';
    ctx.fillStyle = '#CBD5E1';
    drawWrappedText(ctx, st.desc, x + 26, y + 124, cardW - 52, 23);
    ctx.restore();
  });

  // Closing Brand Footer Bar
  const footIn = easeOutCubic((localT - 1.55) / 0.65);
  ctx.save();
  ctx.globalAlpha = env * footIn;
  fillGlassCard(ctx, cx - 320, 488, 640, 128, 28, {
    border: 'rgba(56, 189, 248, 0.35)',
  });
  drawAppLogo(ctx, cx - 244, 552, 68, logoImg);
  ctx.textAlign = 'left';
  ctx.font = '800 30px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('reminderme', cx - 190, 544);
  ctx.font = '500 15px "DM Sans", sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('Web · Android · iOS  ·  developed by Prajwal M </yourstudio>', cx - 190, 574);

  // Friendly blinking EMO eyes on right end of outro lockup
  drawEmoEyes(ctx, cx + 258, 552, 0.9, 'happy', localT);
  ctx.restore();

  ctx.textAlign = 'left';
  ctx.restore();
}

/* ---------- Master Frame Renderer ---------- */
export function renderIntroFrame(
  ctx: CanvasRenderingContext2D,
  timeSec: number,
  width = INTRO_VIDEO_WIDTH,
  height = INTRO_VIDEO_HEIGHT,
  logoImg?: HTMLImageElement | null
): void {
  const t = Math.max(0, Math.min(INTRO_VIDEO_DURATION, timeSec));

  ctx.save();
  // Scale cleanly if canvas resolution differs from 1280x720 design grid
  const sx = width / INTRO_VIDEO_WIDTH;
  const sy = height / INTRO_VIDEO_HEIGHT;
  ctx.scale(sx, sy);

  drawBackdrop(ctx, INTRO_VIDEO_WIDTH, INTRO_VIDEO_HEIGHT, t);

  if (t < 5.5) {
    renderScene1Overview(ctx, INTRO_VIDEO_WIDTH, INTRO_VIDEO_HEIGHT, t, logoImg);
  } else if (t < 12.0) {
    renderScene2Voice(ctx, t - 5.5);
  } else if (t < 18.0) {
    renderScene3DynamicIsland(ctx, t - 12.0);
  } else if (t < 24.0) {
    renderScene4FocusAlarms(ctx, t - 18.0);
  } else if (t < 30.0) {
    renderScene5Sync(ctx, t - 24.0);
  } else {
    renderScene6Outro(ctx, INTRO_VIDEO_WIDTH, INTRO_VIDEO_HEIGHT, t - 30.0, logoImg);
  }

  drawTopHud(ctx, INTRO_VIDEO_WIDTH, t, logoImg);
  ctx.restore();
}
