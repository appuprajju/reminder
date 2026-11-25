import React, { useRef, useState } from 'react';
import { AlarmClock, Check, Clock } from 'lucide-react';
import { formatTimeDisplay } from '../lib/time';
import type { Reminder } from '../types';

interface RingingAlarmOverlayProps {
  reminder: Reminder | null;
  timeFormat: '12h' | '24h';
  onSnooze: (minutes: number) => void;
  onDismiss: () => void;
}

export const RingingAlarmOverlay: React.FC<RingingAlarmOverlayProps> = ({
  reminder,
  timeFormat,
  onSnooze,
  onDismiss,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragPct, setDragPct] = useState(0); // -1 to +1
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);

  if (!reminder) return null;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startXRef.current = e.clientX;
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || !trackRef.current) return;
    const halfWidth = Math.max(80, trackRef.current.clientWidth / 2 - 34);
    const dx = e.clientX - startXRef.current;
    setDragPct(Math.max(-1, Math.min(1, dx / halfWidth)));
  };

  const handlePointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    if (dragPct >= 0.65) {
      setDragPct(0);
      onDismiss();
    } else if (dragPct <= -0.65) {
      setDragPct(0);
      onSnooze(5);
    } else {
      setDragPct(0);
    }
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={`Alarm ringing: ${reminder.title}`}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-[#060812]/95 px-6 py-12 backdrop-blur-2xl"
    >
      <div className="pt-safe text-center">
        <p className="text-xs font-semibold tracking-wider text-red-400 uppercase">
          {reminder.isAlarm ? 'Alarm Ringing' : 'Scheduled Reminder'}
        </p>
        <p className="mt-2 font-mono text-6xl font-bold tracking-tight text-white tabular-nums">
          {formatTimeDisplay(reminder.time, timeFormat)}
        </p>
      </div>

      {/* Central Pulsing Alarm Emblem */}
      <div className="flex flex-col items-center text-center">
        <div className="relative flex h-28 w-28 items-center justify-center">
          <span className="animate-alarm-ripple absolute inset-0 rounded-full border-2 border-red-500/60" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-white/15 bg-[#161C34] text-red-400 shadow-2xl">
            <AlarmClock className="h-11 w-11" />
          </div>
        </div>
        <h2 className="mt-7 max-w-sm text-2xl font-bold text-white">{reminder.title}</h2>
        {reminder.note && <p className="mt-2 max-w-xs text-sm text-slate-400">{reminder.note}</p>}
      </div>

      {/* Tactile Dual-Direction Gesture Slider + Accessible Buttons */}
      <div className="w-full max-w-sm pb-safe">
        <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold">
          <span className="text-sky-400">Slide Left · Snooze 5m</span>
          <span className="text-emerald-400">Dismiss · Slide Right</span>
        </div>

        <div
          ref={trackRef}
          className="relative flex h-16 w-full items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/[0.06] select-none touch-none"
        >
          {/* Left snooze tint */}
          <div
            style={{ opacity: dragPct < 0 ? Math.abs(dragPct) * 0.7 : 0 }}
            className="pointer-events-none absolute inset-y-0 left-0 right-1/2 bg-gradient-to-l from-sky-500/40 to-sky-400/70"
          />
          {/* Right dismiss tint */}
          <div
            style={{ opacity: dragPct > 0 ? dragPct * 0.7 : 0 }}
            className="pointer-events-none absolute inset-y-0 left-1/2 right-0 bg-gradient-to-r from-emerald-500/40 to-emerald-400/70"
          />

          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              transform: `translateX(${dragPct * 116}px)`,
              transition: dragging ? 'none' : 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="relative z-10 flex h-13 w-16 cursor-grab items-center justify-center rounded-full bg-white text-slate-950 shadow-lg active:cursor-grabbing"
          >
            {dragPct > 0.3 ? (
              <Check className="h-5 w-5 stroke-[2.5]" />
            ) : dragPct < -0.3 ? (
              <Clock className="h-5 w-5 stroke-[2.5]" />
            ) : (
              <span className="font-mono text-xs font-bold">⇄</span>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onSnooze(5)}
            className="min-h-[48px] rounded-xl border border-white/12 bg-white/[0.06] text-sm font-semibold text-sky-300 hover:bg-white/[0.12]"
          >
            Snooze 5 min
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-[48px] rounded-xl bg-[#22C55E] text-sm font-semibold text-[#060812] hover:bg-emerald-400"
          >
            Turn Off
          </button>
        </div>
      </div>
    </div>
  );
};
