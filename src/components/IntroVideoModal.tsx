import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Download,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
  MessageSquareText,
} from 'lucide-react';
import {
  INTRO_CHAPTERS,
  INTRO_VIDEO_DURATION,
  INTRO_VIDEO_HEIGHT,
  INTRO_VIDEO_WIDTH,
  getActiveChapter,
  renderIntroFrame,
} from '../lib/introVideoRenderer';

interface IntroVideoModalProps {
  open: boolean;
  onClose: () => void;
}

const VIDEO_SRC = '/reminderme-intro.mp4';

function formatClock(sec: number): string {
  const safe = Math.max(0, Math.min(INTRO_VIDEO_DURATION, Math.floor(sec)));
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export const IntroVideoModal: React.FC<IntroVideoModalProps> = ({ open, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const lastSpokenChapterRef = useRef<string | null>(null);

  const [useCanvasFallback, setUseCanvasFallback] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [voiceoverOn, setVoiceoverOn] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(INTRO_VIDEO_DURATION);

  const activeChapter = getActiveChapter(currentTime);

  const stopSpeech = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // ignore
    }
    lastSpokenChapterRef.current = null;
  }, []);

  // Load app icon once for canvas fallback
  useEffect(() => {
    const img = new Image();
    img.src = '/icons/icon-192.png';
    logoImgRef.current = img;
  }, []);

  // Reset state cleanly when modal opens/closes
  useEffect(() => {
    if (!open) {
      stopSpeech();
      setPlaying(false);
      return;
    }
    setCurrentTime(0);
    setPlaying(true);
    lastSpokenChapterRef.current = null;
    const vid = videoRef.current;
    if (vid && !useCanvasFallback) {
      vid.currentTime = 0;
      void vid.play().catch(() => {
        // Autoplay with audio can be blocked on some browsers; fall back to muted autoplay
        vid.muted = true;
        setMuted(true);
        void vid.play().catch(() => setPlaying(false));
      });
    }
  }, [open, stopSpeech, useCanvasFallback]);

  // Escape key closes modal
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Canvas fallback 60fps loop (only active if MP4 fails to load)
  useEffect(() => {
    if (!open || !useCanvasFallback) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTs = performance.now();
    let timeAcc = currentTime;

    const tick = (nowTs: number) => {
      const dt = Math.min(0.1, (nowTs - lastTs) / 1000);
      lastTs = nowTs;
      if (playing) {
        timeAcc += dt;
        if (timeAcc >= INTRO_VIDEO_DURATION) {
          timeAcc = INTRO_VIDEO_DURATION;
          setPlaying(false);
        }
        setCurrentTime(timeAcc);
      }
      renderIntroFrame(ctx, timeAcc, INTRO_VIDEO_WIDTH, INTRO_VIDEO_HEIGHT, logoImgRef.current);
      if (playing) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    renderIntroFrame(ctx, timeAcc, INTRO_VIDEO_WIDTH, INTRO_VIDEO_HEIGHT, logoImgRef.current);
    if (playing) {
      rafId = window.requestAnimationFrame(tick);
    }
    return () => window.cancelAnimationFrame(rafId);
  }, [open, useCanvasFallback, playing]);

  // Redraw canvas fallback when scrubbed while paused
  useEffect(() => {
    if (!open || !useCanvasFallback || playing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    renderIntroFrame(ctx, currentTime, INTRO_VIDEO_WIDTH, INTRO_VIDEO_HEIGHT, logoImgRef.current);
  }, [open, useCanvasFallback, playing, currentTime]);

  // Optional spoken chapter narration via Web Speech API
  useEffect(() => {
    if (!open || !voiceoverOn || !playing) {
      if (!voiceoverOn || !open) stopSpeech();
      return;
    }
    if (lastSpokenChapterRef.current === activeChapter.id) return;
    lastSpokenChapterRef.current = activeChapter.id;

    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(activeChapter.narration);
        utter.rate = 1.03;
        utter.pitch = 1.0;
        window.speechSynthesis.speak(utter);
      }
    } catch {
      // ignore if TTS unavailable
    }
  }, [activeChapter.id, activeChapter.narration, open, playing, stopSpeech, voiceoverOn]);

  if (!open) return null;

  const togglePlay = () => {
    if (useCanvasFallback) {
      if (currentTime >= INTRO_VIDEO_DURATION - 0.1) {
        setCurrentTime(0);
      }
      setPlaying((p) => !p);
      return;
    }
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused || vid.ended) {
      if (vid.ended) vid.currentTime = 0;
      void vid.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      vid.pause();
      setPlaying(false);
    }
  };

  const seekTo = (sec: number) => {
    const clamped = Math.max(0, Math.min(duration, sec));
    setCurrentTime(clamped);
    lastSpokenChapterRef.current = null;
    if (!useCanvasFallback && videoRef.current) {
      videoRef.current.currentTime = clamped;
      if (videoRef.current.paused) {
        void videoRef.current.play().then(() => setPlaying(true)).catch(() => {});
      }
    } else {
      setPlaying(true);
    }
  };

  const handleRestart = () => {
    stopSpeech();
    seekTo(0);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (videoRef.current) {
      videoRef.current.muted = next;
    }
  };

  const toggleVoiceover = () => {
    const next = !voiceoverOn;
    setVoiceoverOn(next);
    if (!next) {
      stopSpeech();
    } else {
      lastSpokenChapterRef.current = null;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="reminderme Animated App Intro Video"
      onClick={onClose}
      className="fixed inset-0 z-[105] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-elevated animate-sheet-up flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.1] px-4 py-3.5 sm:px-6">
          <div className="min-w-0">
            <h2 className="font-display truncate text-base font-bold text-white sm:text-lg">
              reminderme App Intro Video
            </h2>
            <p className="mt-0.5 truncate text-xs text-slate-400">
              {activeChapter.indexLabel} / 06 · {activeChapter.title} · 36s HD Animated Walkthrough
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={VIDEO_SRC}
              download="reminderme-app-intro.mp4"
              className="liquid-primary-btn ios-spring-press flex min-h-[44px] items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold text-white whitespace-nowrap"
            >
              <Download className="h-4 w-4" />
              <span>Download MP4</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close intro video"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.05] text-slate-300 hover:bg-white/[0.12] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Video Stage (16:9 HD) */}
        <div className="overflow-y-auto px-4 pt-4 pb-5 sm:px-6">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/[0.14] bg-[#050712] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            {!useCanvasFallback ? (
              <video
                ref={videoRef}
                src={VIDEO_SRC}
                playsInline
                muted={muted}
                preload="auto"
                onClick={togglePlay}
                onLoadedMetadata={(e) => {
                  const d = e.currentTarget.duration;
                  if (Number.isFinite(d) && d > 1) setDuration(d);
                }}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => {
                  setPlaying(false);
                  stopSpeech();
                }}
                onError={() => setUseCanvasFallback(true)}
                className="h-full w-full cursor-pointer object-contain"
              />
            ) : (
              <canvas
                ref={canvasRef}
                width={INTRO_VIDEO_WIDTH}
                height={INTRO_VIDEO_HEIGHT}
                onClick={togglePlay}
                className="h-full w-full cursor-pointer object-contain"
              />
            )}

            {/* Center Play Overlay when Paused */}
            {!playing && (
              <button
                type="button"
                onClick={togglePlay}
                aria-label="Play intro video"
                className="ios-spring-press absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/35 bg-[#0A84FF]/90 text-white shadow-[0_12px_36px_rgba(10,132,255,0.55)] backdrop-blur-md"
              >
                <Play className="ml-0.5 h-7 w-7 fill-current" />
              </button>
            )}
          </div>

          {/* Transport Bar + Scrubber */}
          <div className="mt-3.5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                aria-label={playing ? 'Pause video' : 'Play video'}
                className="ios-spring-press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.06] text-white hover:bg-white/[0.14]"
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={handleRestart}
                aria-label="Restart video"
                className="ios-spring-press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.06] text-slate-200 hover:bg-white/[0.14]"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <span className="font-mono text-xs text-slate-300 tabular-nums">
                  {formatClock(currentTime)}
                </span>
                <input
                  type="range"
                  aria-label="Seek intro video timeline"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={Math.min(currentTime, duration)}
                  onChange={(e) => seekTo(Number(e.target.value))}
                  className="h-2 flex-1 cursor-pointer accent-[#0A84FF]"
                />
                <span className="font-mono text-xs text-slate-400 tabular-nums">
                  {formatClock(duration)}
                </span>
              </div>

              {!useCanvasFallback && (
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={muted ? 'Unmute music' : 'Mute music'}
                  className="ios-spring-press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.06] text-slate-200 hover:bg-white/[0.14]"
                >
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              )}

              <button
                type="button"
                onClick={toggleVoiceover}
                aria-pressed={voiceoverOn}
                className={`ios-spring-press flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                  voiceoverOn
                    ? 'border-sky-400/50 bg-sky-500/20 text-sky-200'
                    : 'border-white/[0.12] bg-white/[0.06] text-slate-300 hover:bg-white/[0.12]'
                }`}
              >
                <MessageSquareText className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {voiceoverOn ? 'Narration On' : 'Voice Narration'}
                </span>
              </button>
            </div>

            {/* Live Chapter Script Caption */}
            <p className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-xs leading-relaxed text-slate-300">
              <span className="font-semibold text-white">{activeChapter.title}:</span>{' '}
              {activeChapter.narration}
            </p>

            {/* 6 Interactive Feature Chapters */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {INTRO_CHAPTERS.map((ch) => {
                const isActive = ch.id === activeChapter.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => seekTo(ch.startSec + 0.05)}
                    className={`ios-spring-press flex min-h-[44px] flex-col items-start justify-center rounded-xl border px-3 py-2 text-left transition-colors ${
                      isActive
                        ? 'border-sky-400/50 bg-sky-500/20 text-white'
                        : 'border-white/[0.08] bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]'
                    }`}
                  >
                    <span className="font-mono text-[10px] font-semibold text-sky-300">
                      {ch.indexLabel} · {formatClock(ch.startSec)}
                    </span>
                    <span className="mt-0.5 w-full truncate text-xs font-semibold">
                      {ch.shortTitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
