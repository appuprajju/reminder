import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';

interface DeveloperIntroProps {
  visible: boolean;
  onFinish: () => void;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  r: number;
  vx: number;
  vy: number;
  hue: number;
}

/**
 * Cinematic liquid-glass startup & developer intro showcasing reminderme
 * and "developed by Prajwal M </yourstudio>", with auto-advance and instant skip.
 */
export const DeveloperIntro: React.FC<DeveloperIntroProps> = ({ visible, onFinish }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [exiting, setExiting] = useState(false);

  const triggerExit = React.useCallback(() => {
    setExiting((prev) => {
      if (prev) return prev;
      window.setTimeout(() => onFinish(), 480);
      return true;
    });
  }, [onFinish]);

  useEffect(() => {
    if (!visible) {
      setExiting(false);
      return;
    }
    setExiting(false);
    const autoTimer = window.setTimeout(() => triggerExit(), 1650);
    return () => window.clearTimeout(autoTimer);
  }, [visible, triggerExit]);

  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafId = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const particles: Particle[] = Array.from({ length: 42 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      z: 0.4 + Math.random() * 0.9,
      r: 1.2 + Math.random() * 2.2,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -0.2 - Math.random() * 0.45,
      hue: [208, 222, 265, 185][Math.floor(Math.random() * 4)],
    }));

    const render = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        if (!prefersReduced) {
          p.x += p.vx * p.z;
          p.y += p.vy * p.z;
          if (p.y < -12) {
            p.y = h + 12;
            p.x = Math.random() * w;
          }
          if (p.x < -12) p.x = w + 12;
          if (p.x > w + 12) p.x = -12;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * p.z, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 92%, 76%, ${(0.22 + p.z * 0.35).toFixed(2)})`;
        ctx.fill();
      }
      if (!prefersReduced) {
        rafId = window.requestAnimationFrame(render);
      }
    };

    render();
    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(rafId);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Welcome to reminderme"
      onClick={triggerExit}
      className={`fixed inset-0 z-[120] flex flex-col items-center justify-center overflow-hidden px-6 transition-[opacity,transform] duration-500 ease-out ${
        exiting ? 'pointer-events-none scale-105 opacity-0' : 'scale-100 opacity-100'
      }`}
      style={{
        background:
          'radial-gradient(900px 640px at 50% 30%, #1b2458 0%, #090d24 52%, #04050e 100%)',
      }}
    >
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />

      {/* Center Content */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-intro-in relative z-10 flex max-w-sm flex-col items-center text-center"
      >
        {/* Iridescent Liquid Glass Emblem */}
        <div className="relative mb-6 flex h-28 w-28 items-center justify-center">
          <div className="intro-conic-glow absolute -inset-3 rounded-[34px] opacity-80 blur-xl" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/40 bg-gradient-to-br from-white/30 via-white/10 to-white/5 shadow-[0_22px_50px_rgba(0,0,0,0.55),inset_0_2px_0_rgba(255,255,255,0.6)] backdrop-blur-2xl">
            <img
              src="/icons/icon-192.png"
              alt="reminderme logo"
              className="h-16 w-16 rounded-[18px] shadow-[0_12px_28px_rgba(10,132,255,0.55)]"
            />
          </div>
        </div>

        <h1 className="font-display bg-gradient-to-b from-white via-sky-100 to-sky-300 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent drop-shadow-[0_6px_24px_rgba(47,128,255,0.45)]">
          reminderme
        </h1>
        <p className="mt-1.5 text-xs font-semibold tracking-[0.22em] text-slate-300/80 uppercase">
          Smart Daily Planner
        </p>

        {/* Developer Signature Liquid Glass Card */}
        <div className="mt-8 flex flex-col items-center gap-1.5 rounded-2xl border border-white/25 bg-white/[0.08] px-6 py-3.5 shadow-[0_14px_36px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.4)] backdrop-blur-xl">
          <span className="text-[11px] font-medium tracking-[0.16em] text-slate-400 uppercase">
            developed by
          </span>
          <div className="flex items-center gap-2.5">
            <span className="font-display text-lg font-bold tracking-tight text-white">
              Prajwal M
            </span>
            <span className="rounded-lg border border-sky-400/35 bg-sky-400/15 px-2 py-0.5 font-mono text-xs font-bold text-sky-300 shadow-[0_0_14px_rgba(90,200,250,0.28)]">
              &lt;/yourstudio&gt;
            </span>
          </div>
        </div>
      </div>

      {/* Instant Skip / Enter Button + Privacy Link */}
      <div className="absolute bottom-6 z-10 flex flex-col items-center gap-2 pb-safe">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerExit();
          }}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-5 text-xs font-semibold text-slate-300 backdrop-blur-md transition-colors hover:bg-white/[0.14] hover:text-white"
        >
          <span>Tap to enter</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <a
          href="/privacy-policy"
          onClick={(e) => e.stopPropagation()}
          className="text-[11px] font-medium text-sky-300/85 underline underline-offset-4 hover:text-sky-200"
        >
          Privacy Policy
        </a>
      </div>
    </div>
  );
};
