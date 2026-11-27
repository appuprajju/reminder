import React, { useRef, useState } from 'react';
import { AlarmClock, Check, ChevronUp, Clock, Volume2 } from 'lucide-react';
import { getAlarmSoundLabel } from '../lib/audio';
import { triggerHaptic } from '../lib/nativeBridge';
import { formatTimeDisplay } from '../lib/time';
import type { Reminder } from '../types';

interface RingingAlarmOverlayProps {
  reminder: Reminder | null;
  timeFormat: '12h' | '24h';
  customAudioName?: string | null;
  vibrate?: boolean;
  onSnooze: (minutes: number) => void;
  onDismiss: () => void;
}

const SNOOZE_PRESETS = [5, 10, 15];
const SWIPE_MAX_PX = 148;
const DISMISS_THRESHOLD = 0.68;

export const RingingAlarmOverlay: React.FC<RingingAlarmOverlayProps> = ({
  reminder,
  timeFormat,
  customAudioName,
  vibrate = true,
  onSnooze,
  onDismiss,
}) => {
  const [swipeProgress, setSwipeProgress] = useState(0); // 0 to 1 upward
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);
  const thresholdHapticFiredRef = useRef(false);

  if (!reminder) return null;

  const soundLabel = getAlarmSoundLabel(reminder.sound, customAudioName);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    startYRef.current = e.clientY;
    thresholdHapticFiredRef.current = false;
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const dyUp = startYRef.current - e.clientY;
    const next = Math.max(0, Math.min(1, dyUp / SWIPE_MAX_PX));
    setSwipeProgress(next);

    if (next >= DISMISS_THRESHOLD && !thresholdHapticFiredRef.current) {
      thresholdHapticFiredRef.current = true;
      triggerHaptic('medium', vibrate);
    }
  };

  const handlePointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    if (swipeProgress >= DISMISS_THRESHOLD) {
      triggerHaptic('success', vibrate);
      setSwipeProgress(0);
      onDismiss();
    } else {
      setSwipeProgress(0);
    }
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={`Alarm ringing: ${reminder.title}`}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between overflow-hidden bg-[#050814]/96 px-6 py-10 backdrop-blur-2xl"
    >
      {/* Ambient Lock-Screen Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            swipeProgress > 0.1
              ? `radial-gradient(circle at 50% 85%, rgba(48, 209, 88, ${0.15 + swipeProgress * 0.35}) 0%, rgba(10, 132, 255, 0.12) 45%, transparent 72%)`
              : 'radial-gradient(circle at 50% 35%, rgba(255, 69, 58, 0.22) 0%, rgba(10, 132, 255, 0.1) 46%, transparent 72%)',
        }}
      />

      {/* Top Clock Header */}
      <div className="relative z-10 pt-safe text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-red-400 uppercase">
          {reminder.isAlarm ? 'Lock-Screen Alarm' : 'Scheduled Reminder'}
        </p>
        <p className="mt-2 font-mono text-6xl font-bold tracking-tight text-white tabular-nums sm:text-7xl">
          {formatTimeDisplay(reminder.time, timeFormat)}
        </p>
      </div>

      {/* Center Pulsing Alarm Emblem + Title + Ringtone Indicator */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="relative flex h-28 w-28 items-center justify-center">
          <span className="animate-alarm-ripple absolute inset-0 rounded-full border-2 border-red-500/60" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-white/20 bg-[#141B35]/90 text-red-400 shadow-[0_18px_48px_rgba(0,0,0,0.6)]">
            <AlarmClock className="h-11 w-11" />
          </div>
        </div>
        <h2 className="font-display mt-6 max-w-sm text-2xl font-bold text-white sm:text-3xl">
          {reminder.title}
        </h2>
        {reminder.note && (
          <p className="mt-2 max-w-xs text-sm text-slate-300">{reminder.note}</p>
        )}
        {reminder.isAlarm && (
          <p className="mt-3 inline-flex max-w-xs items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-sky-200">
            <Volume2 className="h-3.5 w-3.5 shrink-0 text-sky-300" />
            <span className="truncate">{soundLabel}</span>
          </p>
        )}
      </div>

      {/* Thumb-Zone Controls: Snooze Pills + Swipe Up to Dismiss */}
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-5 pb-safe">
        {/* Tap Snooze Pills */}
        <div className="w-full">
          <p className="mb-2 text-center text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Quick Snooze
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {SNOOZE_PRESETS.map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => {
                  triggerHaptic('light', vibrate);
                  onSnooze(mins);
                }}
                className="ios-spring-press flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl border border-sky-400/30 bg-sky-500/15 px-3 text-sm font-semibold text-sky-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition-colors hover:bg-sky-500/25"
              >
                <Clock className="h-3.5 w-3.5 text-sky-300" />
                <span>{mins}m</span>
              </button>
            ))}
          </div>
        </div>

        {/* Vertical Swipe-Up-to-Dismiss Track */}
        <div className="flex w-full flex-col items-center">
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative flex h-44 w-full max-w-[240px] flex-col items-center justify-end overflow-hidden rounded-[32px] border border-white/15 bg-white/[0.06] p-3 select-none touch-none"
          >
            {/* Rising Emerald Progress Scrim */}
            <div
              aria-hidden="true"
              style={{
                height: `${Math.round(swipeProgress * 100)}%`,
                transition: dragging ? 'none' : 'height 220ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-emerald-500/55 via-emerald-400/30 to-transparent"
            />

            {/* Top Chevrons + Label */}
            <div className="pointer-events-none absolute inset-x-0 top-4 flex flex-col items-center gap-0.5 text-center">
              <ChevronUp
                className={`h-4 w-4 transition-colors ${
                  swipeProgress >= DISMISS_THRESHOLD ? 'text-emerald-300' : 'animate-bounce text-slate-300'
                }`}
              />
              <span
                className={`text-xs font-semibold tracking-wide ${
                  swipeProgress >= DISMISS_THRESHOLD ? 'text-emerald-200' : 'text-slate-300'
                }`}
              >
                {swipeProgress >= DISMISS_THRESHOLD ? 'Release to Dismiss' : 'Swipe Up to Dismiss'}
              </span>
            </div>

            {/* Draggable Handle */}
            <div
              style={{
                transform: `translateY(${-swipeProgress * 88}px)`,
                transition: dragging ? 'none' : 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className={`relative z-10 flex h-14 w-full items-center justify-center gap-2 rounded-2xl font-semibold shadow-[0_12px_30px_rgba(0,0,0,0.45)] cursor-grab active:cursor-grabbing ${
                swipeProgress >= DISMISS_THRESHOLD
                  ? 'bg-[#30D158] text-[#050814]'
                  : 'bg-white text-slate-950'
              }`}
            >
              {swipeProgress >= DISMISS_THRESHOLD ? (
                <>
                  <Check className="h-5 w-5 stroke-[2.75]" />
                  <span className="text-sm font-bold">Dismissing</span>
                </>
              ) : (
                <>
                  <ChevronUp className="h-5 w-5 stroke-[2.5]" />
                  <span className="text-sm font-bold">Slide Up</span>
                </>
              )}
            </div>
          </div>

          {/* Accessible Fallback Tap Button */}
          <button
            type="button"
            onClick={onDismiss}
            className="mt-3 min-h-[44px] rounded-xl px-5 text-xs font-semibold text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            Tap here to turn off alarm
          </button>
        </div>
      </div>
    </div>
  );
};
