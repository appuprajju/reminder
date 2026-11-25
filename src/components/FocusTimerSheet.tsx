import React, { useEffect, useState } from 'react';
import { Check, Pause, Play, RotateCcw, X } from 'lucide-react';
import { playNotificationChime } from '../lib/audio';
import type { Reminder } from '../types';

interface FocusTimerSheetProps {
  reminder: Reminder | null;
  onCompleteTask: (id: string) => void;
  onClose: () => void;
}

const DEFAULT_SECONDS = 25 * 60;

export const FocusTimerSheet: React.FC<FocusTimerSheetProps> = ({
  reminder,
  onCompleteTask,
  onClose,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_SECONDS);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (reminder) {
      setSecondsLeft(DEFAULT_SECONDS);
      setRunning(false);
    }
  }, [reminder]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          playNotificationChime('zen');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  if (!reminder) return null;

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');
  const progress = 1 - secondsLeft / DEFAULT_SECONDS;
  const radius = 64;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - progress);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glass-elevated animate-sheet-up w-full max-w-sm rounded-t-3xl p-6 pb-safe sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Focus Session</p>
            <h2 className="mt-0.5 truncate text-lg font-bold text-white">{reminder.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close focus timer"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-white/[0.08] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="my-7 flex justify-center">
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
                stroke="#2F80FF"
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
                {secondsLeft === 0 ? 'Session Complete' : running ? 'Focusing' : 'Paused'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#2F80FF] text-sm font-semibold text-white hover:bg-[#256FE6]"
          >
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{running ? 'Pause' : 'Start'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setRunning(false);
              setSecondsLeft(DEFAULT_SECONDS);
            }}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] text-sm font-semibold text-slate-200 hover:bg-white/[0.08]"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            onCompleteTask(reminder.id);
            onClose();
          }}
          className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/20 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/30"
        >
          <Check className="h-4 w-4" />
          <span>Mark Reminder Completed</span>
        </button>
      </div>
    </div>
  );
};
