import React, { useEffect, useRef, useState } from 'react';
import {
  AlarmClock,
  Bell,
  CalendarArrowDown,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  ListChecks,
  Timer,
  Trash2,
} from 'lucide-react';
import { triggerHaptic } from '../lib/nativeBridge';
import type { Reminder } from '../types';
import { formatDaysSummary, formatTimeDisplay, isReminderDoneToday } from '../lib/time';

interface SwipeableReminderRowProps {
  reminder: Reminder;
  timeFormat: '12h' | '24h';
  onToggleDone: (id: string) => void;
  onSnooze: (id: string, minutes: number) => void;
  onDelete: (id: string) => void;
  onEdit: (reminder: Reminder) => void;
  onFocus: (reminder: Reminder) => void;
  onToggleSubtask?: (reminderId: string, subtaskId: string) => void;
  onExportIcs?: (reminder: Reminder) => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onEnterSelection?: (id: string) => void;
  vibrate?: boolean;
}

const LONG_PRESS_MS = 450;

export const SwipeableReminderRow: React.FC<SwipeableReminderRowProps> = ({
  reminder,
  timeFormat,
  onToggleDone,
  onSnooze,
  onDelete,
  onEdit,
  onFocus,
  onToggleSubtask,
  onExportIcs,
  selectionMode = false,
  selected = false,
  onToggleSelect,
  onEnterSelection,
  vibrate = true,
}) => {
  const done = isReminderDoneToday(reminder);
  const [offsetX, setOffsetX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const lockedAxisRef = useRef<'x' | 'y' | null>(null);
  const movedRef = useRef(false);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressedRef = useRef(false);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (selectionMode) {
      clearLongPressTimer();
      setOffsetX(0);
      setActionsOpen(false);
      setDragging(false);
    }
  }, [selectionMode]);

  useEffect(() => clearLongPressTimer, []);

  const subtasks = reminder.subtasks || [];
  const subtasksDone = subtasks.filter((s) => s.done).length;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (selectionMode) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, [data-subtask-drawer]')) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    lockedAxisRef.current = null;
    movedRef.current = false;
    longPressedRef.current = false;
    setDragging(true);

    if (onEnterSelection) {
      clearLongPressTimer();
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTimerRef.current = null;
        longPressedRef.current = true;
        setDragging(false);
        setOffsetX(0);
        setActionsOpen(false);
        triggerHaptic('medium', vibrate);
        onEnterSelection(reminder.id);
      }, LONG_PRESS_MS);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || selectionMode) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;

    if (Math.hypot(dx, dy) > 10) {
      clearLongPressTimer();
    }

    if (!lockedAxisRef.current) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        lockedAxisRef.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
    }
    if (lockedAxisRef.current !== 'x') return;

    movedRef.current = true;
    const base = actionsOpen ? -136 : 0;
    const clamped = Math.max(-152, Math.min(116, base + dx));
    setOffsetX(clamped);
  };

  const handlePointerEnd = () => {
    clearLongPressTimer();
    if (!dragging) return;
    setDragging(false);
    if (lockedAxisRef.current === 'x') {
      if (offsetX >= 80) {
        onToggleDone(reminder.id);
        setOffsetX(0);
        setActionsOpen(false);
      } else if (offsetX <= -64) {
        setOffsetX(-136);
        setActionsOpen(true);
      } else {
        setOffsetX(0);
        setActionsOpen(false);
      }
    }
    lockedAxisRef.current = null;
  };

  const priorityLabel =
    reminder.priority === 'high' ? 'High' : reminder.priority === 'med' ? 'Medium' : 'Normal';
  const scheduleLabel = formatDaysSummary(reminder.days, reminder.oneTimeDate);
  const isSnoozed = !!(reminder.snoozedUntil && reminder.snoozedUntil > Date.now());

  return (
    <div
      data-selected={selectionMode && selected ? 'true' : 'false'}
      className={`relative overflow-hidden rounded-[22px] border backdrop-blur-2xl transition-colors duration-150 ${
        selectionMode && selected
          ? 'border-[#0A84FF]/70 bg-[#0A84FF]/15 shadow-[0_14px_34px_rgba(10,132,255,0.22),inset_0_1px_0_rgba(147,197,253,0.4)]'
          : 'border-white/[0.18] bg-white/[0.06] shadow-[0_14px_34px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.3)]'
      }`}
    >
      {/* Left reveal (Swipe right to complete) */}
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 flex w-28 items-center justify-start bg-[#30D158]/25 pl-5 text-emerald-300 transition-opacity duration-150 ${
          offsetX > 4 ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      >
        <Check className="h-5 w-5" />
        <span className="ml-1.5 text-xs font-semibold">{done ? 'Undo' : 'Done'}</span>
      </div>

      {/* Right reveal (Swipe left for Snooze & Delete) */}
      <div
        aria-hidden={!(offsetX < -4 || actionsOpen)}
        className={`absolute inset-y-0 right-0 flex items-stretch transition-opacity duration-150 ${
          offsetX < -4 || actionsOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <button
          type="button"
          tabIndex={actionsOpen ? 0 : -1}
          onClick={() => {
            setOffsetX(0);
            setActionsOpen(false);
            onSnooze(reminder.id, 10);
          }}
          className="flex min-w-[68px] flex-col items-center justify-center gap-1 bg-[#FF9F0A]/25 px-3 text-xs font-semibold text-amber-200 transition-colors hover:bg-[#FF9F0A]/35"
          aria-label={`Snooze ${reminder.title} 10 minutes`}
        >
          <Clock className="h-4 w-4" />
          <span>10m</span>
        </button>
        <button
          type="button"
          tabIndex={actionsOpen ? 0 : -1}
          onClick={() => {
            setOffsetX(0);
            setActionsOpen(false);
            onDelete(reminder.id);
          }}
          className="flex min-w-[68px] flex-col items-center justify-center gap-1 bg-[#FF453A]/30 px-3 text-xs font-semibold text-red-200 transition-colors hover:bg-[#FF453A]/45"
          aria-label={`Delete ${reminder.title}`}
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete</span>
        </button>
      </div>

      {/* Foreground interactive liquid-glass row */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onPointerLeave={clearLongPressTimer}
        onContextMenu={(e) => {
          if (onEnterSelection) e.preventDefault();
        }}
        onClick={() => {
          if (longPressedRef.current) {
            longPressedRef.current = false;
            return;
          }
          if (selectionMode) {
            onToggleSelect?.(reminder.id);
            return;
          }
          if (movedRef.current) return;
          if (actionsOpen) {
            setOffsetX(0);
            setActionsOpen(false);
            return;
          }
          onEdit(reminder);
        }}
        style={{
          transform: `translate3d(${selectionMode ? 0 : offsetX}px, 0, 0)`,
          transition: dragging ? 'none' : 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        className={`relative z-10 cursor-pointer select-none touch-pan-y transition-colors duration-150 ${
          selectionMode && selected
            ? 'bg-gradient-to-br from-[#162752]/95 to-[#0D1A3B]/95'
            : 'bg-gradient-to-br from-[#161E3B]/92 to-[#0D1329]/92 hover:from-[#1B2547]/95 hover:to-[#111936]/95'
        }`}
      >
        <div className="flex min-h-[76px] items-center gap-3.5 px-4 py-3.5">
          {/* Selection checkbox (selection mode) OR completion circle (normal mode) */}
          {selectionMode ? (
            <button
              type="button"
              role="checkbox"
              aria-checked={selected}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect?.(reminder.id);
              }}
              aria-label={selected ? `Deselect ${reminder.title}` : `Select ${reminder.title}`}
              className="ios-spring-press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-[#0A84FF]"
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-lg border transition-all duration-150 ${
                  selected
                    ? 'animate-check-pop border-[#0A84FF] bg-[#0A84FF] text-white shadow-[0_0_16px_rgba(10,132,255,0.6)]'
                    : 'border-white/45 bg-white/[0.05] text-transparent hover:border-sky-300/80'
                }`}
              >
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleDone(reminder.id);
              }}
              aria-label={done ? `Mark ${reminder.title} not done` : `Complete ${reminder.title}`}
              className="ios-spring-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-[#0A84FF]"
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-150 ${
                  done
                    ? 'animate-check-pop border-[#30D158] bg-[#30D158] text-[#050712] shadow-[0_0_16px_rgba(48,209,88,0.6)]'
                    : 'border-white/40 bg-white/[0.04] text-transparent hover:border-white/75'
                }`}
              >
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              </span>
            </button>
          )}

          {/* Glossy 3D iOS Emblem Squircle */}
          <div
            aria-hidden="true"
            style={{
              background: `linear-gradient(145deg, ${reminder.color || '#0A84FF'}, rgba(255,255,255,0.12))`,
            }}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-white/25 text-lg shadow-[0_8px_18px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.55)] transition-all ${
              done ? 'grayscale opacity-55' : ''
            }`}
          >
            {reminder.emoji || (reminder.isAlarm ? '⏰' : '🔔')}
          </div>

          {/* Title & unboxed inline metadata */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`truncate text-[15px] font-semibold leading-snug ${
                  done ? 'text-slate-400/70 line-through' : 'text-white'
                }`}
              >
                {reminder.title}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-300/80">
              <span className="inline-flex items-center gap-1 font-mono font-semibold text-white tabular-nums">
                {reminder.isAlarm ? (
                  <AlarmClock className="h-3.5 w-3.5 text-red-400" />
                ) : (
                  <Bell className="h-3.5 w-3.5 text-sky-300" />
                )}
                {formatTimeDisplay(reminder.time, timeFormat)}
              </span>
              <span aria-hidden="true" className="text-slate-500">·</span>
              <span>{scheduleLabel}</span>
              {reminder.tag && (
                <>
                  <span aria-hidden="true" className="text-slate-500">·</span>
                  <span>{reminder.tag}</span>
                </>
              )}
              {reminder.priority === 'high' && (
                <>
                  <span aria-hidden="true" className="text-slate-500">·</span>
                  <span className="font-semibold text-amber-300">{priorityLabel}</span>
                </>
              )}
              {isSnoozed && (
                <>
                  <span aria-hidden="true" className="text-slate-500">·</span>
                  <span className="font-semibold text-sky-300">Snoozed</span>
                </>
              )}
              {subtasks.length > 0 && (
                <>
                  <span aria-hidden="true" className="text-slate-500">·</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setChecklistOpen((v) => !v);
                    }}
                    aria-expanded={checklistOpen}
                    aria-label={`${checklistOpen ? 'Hide' : 'Show'} ${subtasks.length} checklist steps`}
                    className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 font-mono text-xs font-semibold text-sky-300 transition-colors hover:bg-white/[0.08] tabular-nums"
                  >
                    <ListChecks className="h-3.5 w-3.5" />
                    <span>
                      {subtasksDone}/{subtasks.length}
                    </span>
                    {checklistOpen ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                </>
              )}
            </div>

            {reminder.note && (
              <p className="mt-0.5 truncate text-xs text-slate-400">{reminder.note}</p>
            )}
          </div>

          {/* Quick desktop / accessible actions (step aside in selection mode) */}
          {!selectionMode && (
            <div className="flex shrink-0 items-center gap-1">
              {!done && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFocus(reminder);
                  }}
                  title="Start focus session with ambient soundscapes"
                  aria-label={`Focus on ${reminder.title}`}
                  className="ios-spring-press flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-100"
                >
                  <Timer className="h-4 w-4" />
                </button>
              )}
              {onExportIcs && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onExportIcs(reminder);
                  }}
                  title="Export .ics for Apple Calendar"
                  aria-label={`Export ${reminder.title} to Apple Calendar`}
                  className="ios-spring-press hidden h-11 w-11 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-sky-300 sm:flex"
                >
                  <CalendarArrowDown className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSnooze(reminder.id, 10);
                }}
                title="Snooze 10 minutes"
                aria-label={`Snooze ${reminder.title}`}
                className="ios-spring-press hidden h-11 w-11 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-amber-300 sm:flex"
              >
                <Clock className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(reminder.id);
                }}
                title="Delete reminder"
                aria-label={`Delete ${reminder.title}`}
                className="ios-spring-press hidden h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-red-500/15 hover:text-red-400 sm:flex"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Inline Expandable Subtasks Checklist Drawer */}
        {checklistOpen && subtasks.length > 0 && (
          <div
            data-subtask-drawer
            onClick={(e) => e.stopPropagation()}
            className="border-t border-white/[0.08] bg-[#090E20]/65 px-4 py-2.5 pl-[64px]"
          >
            <ul className="space-y-1">
              {subtasks.map((st) => (
                <li key={st.id}>
                  <button
                    type="button"
                    onClick={() => onToggleSubtask?.(reminder.id, st.id)}
                    className="ios-spring-press flex min-h-[38px] w-full items-center gap-2.5 rounded-xl px-2 py-1 text-left transition-colors hover:bg-white/[0.05]"
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                        st.done
                          ? 'animate-check-pop border-[#30D158] bg-[#30D158] text-[#050712]'
                          : 'border-white/35 bg-white/[0.04] text-transparent'
                      }`}
                    >
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        st.done ? 'text-slate-400/75 line-through' : 'text-slate-200'
                      }`}
                    >
                      {st.title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
