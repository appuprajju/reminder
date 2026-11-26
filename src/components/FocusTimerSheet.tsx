import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Headphones, Pause, Play, RotateCcw, Volume2, X } from 'lucide-react';
import { playNotificationChime } from '../lib/audio';
import { AMBIENT_SOUNDS, ambientSoundscape } from '../lib/soundscapes';
import type { AmbientSoundId, Reminder } from '../types';
import { SpringSegmentedControl } from './SpringSegmentedControl';

interface FocusTimerSheetProps {
  reminder: Reminder | null;
  onCompleteTask: (id: string) => void;
  onClose: () => void;
}

type PresetDuration = '15' | '25' | '45' | '60';

const DURATION_OPTIONS: { id: PresetDuration; label: string }[] = [
  { id: '15', label: '15m' },
  { id: '25', label: '25m' },
  { id: '45', label: '45m' },
  { id: '60', label: '60m' },
];

export const FocusTimerSheet: React.FC<FocusTimerSheetProps> = ({
  reminder,
  onCompleteTask,
  onClose,
}) => {
  const [preset, setPreset] = useState<PresetDuration>('25');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [soundId, setSoundId] = useState<AmbientSoundId>('off');
  const [volume, setVolume] = useState(0.5);

  const totalSeconds = Number(preset) * 60;

  useEffect(() => {
    if (reminder) {
      setPreset('25');
      setSecondsLeft(25 * 60);
      setRunning(false);
      setSoundId('off');
      ambientSoundscape.stop();
    }
    return () => {
      ambientSoundscape.stop();
    };
  }, [reminder]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          ambientSoundscape.stop();
          playNotificationChime('zen');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!reminder) {
      ambientSoundscape.stop();
      return;
    }
    if (soundId === 'off') {
      ambientSoundscape.stop();
    } else {
      ambientSoundscape.start(soundId, volume);
    }
  }, [reminder, soundId]);

  const handleVolumeChange = (nextVol: number) => {
    setVolume(nextVol);
    ambientSoundscape.setVolume(nextVol);
  };

  const handlePresetChange = (next: PresetDuration) => {
    setPreset(next);
    setRunning(false);
    setSecondsLeft(Number(next) * 60);
  };

  const handleClose = () => {
    ambientSoundscape.stop();
    onClose();
  };

  if (!reminder) return null;

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');
  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;
  const radius = 64;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - progress);

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Focus timer for ${reminder.title}`}
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="glass-elevated animate-sheet-up max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-3xl">
        <div className="mb-3 flex justify-center sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-white/20" />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-sky-300">Focus Mode</p>
            <h2 className="mt-0.5 truncate font-display text-lg font-bold text-white">
              {reminder.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close focus timer"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-white/[0.08] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Duration Preset Sliding Switch */}
        <div className="mt-4">
          <SpringSegmentedControl
            options={DURATION_OPTIONS}
            value={preset}
            onChange={handlePresetChange}
            ariaLabel="Focus duration preset"
            size="sm"
            fullWidth
          />
        </div>

        {/* Progress Ring */}
        <div className="my-5 flex justify-center">
          <div className="relative h-44 w-44">
            <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="10"
              />
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke="#0A84FF"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                className="transition-[stroke-dashoffset] duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-4xl font-bold text-white tabular-nums">
                {mins}:{secs}
              </span>
              <span className="mt-1 text-xs text-slate-400">
                {secondsLeft === 0 ? 'Session Complete' : running ? 'Focusing' : 'Ready'}
              </span>
            </div>
          </div>
        </div>

        {/* Ambient Soundscapes Mixer */}
        <div className="rounded-2xl border border-white/[0.1] bg-white/[0.03] p-3.5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <Headphones className="h-3.5 w-3.5 text-sky-300" />
              Ambient Soundscape
            </span>
            {soundId !== 'off' && (
              <span className="text-[11px] font-medium text-emerald-300">Playing</span>
            )}
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {AMBIENT_SOUNDS.map((sound) => {
              const active = soundId === sound.id;
              return (
                <button
                  key={sound.id}
                  type="button"
                  onClick={() => setSoundId(sound.id)}
                  className={`ios-spring-press min-h-[36px] rounded-xl border px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                    active
                      ? 'border-sky-400/50 bg-[#0A84FF]/25 text-white'
                      : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sound.label}
                </button>
              );
            })}
          </div>

          {soundId !== 'off' && (
            <div className="mt-3 flex items-center gap-2.5 border-t border-white/[0.06] pt-2.5">
              <Volume2 className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.05}
                value={volume}
                aria-label="Ambient soundscape volume"
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="h-1.5 flex-1 cursor-pointer accent-[#0A84FF]"
              />
              <span className="w-8 text-right font-mono text-[11px] text-slate-300 tabular-nums">
                {Math.round(volume * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Transport Controls */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            className="liquid-primary-btn ios-spring-press flex min-h-[48px] items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white"
          >
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{running ? 'Pause' : 'Start Focus'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setRunning(false);
              setSecondsLeft(totalSeconds);
            }}
            className="ios-spring-press flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.05] text-sm font-semibold text-slate-200 hover:bg-white/[0.1]"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            ambientSoundscape.stop();
            onCompleteTask(reminder.id);
            onClose();
          }}
          className="ios-spring-press mt-2.5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/20 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/30"
        >
          <Check className="h-4 w-4" />
          <span>Mark Reminder Completed</span>
        </button>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};
