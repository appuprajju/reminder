import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import {
  DAY_SHORT,
  getDateKeyFromDate,
  getMonthCalendarDays,
  getTodayDateKey,
  getWeekStripDates,
  isReminderScheduledForDate,
} from '../lib/time';
import type { Reminder, UserPreferences } from '../types';
import { SwipeableReminderRow } from './SwipeableReminderRow';

interface ScheduleViewProps {
  reminders: Reminder[];
  prefs: UserPreferences;
  onAddForDate: (date: Date) => void;
  onToggleDone: (id: string) => void;
  onSnooze: (id: string, minutes: number) => void;
  onDelete: (id: string) => void;
  onEdit: (reminder: Reminder) => void;
  onFocus: (reminder: Reminder) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  reminders,
  prefs,
  onAddForDate,
  onToggleDone,
  onSnooze,
  onDelete,
  onEdit,
  onFocus,
}) => {
  const todayKey = getTodayDateKey();
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const selectedKey = getDateKeyFromDate(selectedDate);
  const weekDates = useMemo(() => getWeekStripDates(selectedDate), [selectedDate]);
  const monthDays = useMemo(
    () => getMonthCalendarDays(viewMonth.getFullYear(), viewMonth.getMonth()),
    [viewMonth]
  );

  const selectedDayReminders = useMemo(() => {
    return reminders
      .filter((r) => isReminderScheduledForDate(r, selectedDate))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [reminders, selectedDate]);

  const monthTitle = viewMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const selectedDateTitle = selectedDate.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const shiftMonth = (delta: number) => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const jumpToday = () => {
    const now = new Date();
    setSelectedDate(now);
    setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
      {/* Left: Horizontal Week Strip + Month Grid */}
      <section className="glass-surface rounded-3xl p-5 lg:col-span-6">
        {/* Horizontal Quick Week Scroller */}
        <div className="mb-5 flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar">
          {weekDates.map((d) => {
            const k = getDateKeyFromDate(d);
            const active = k === selectedKey;
            const isToday = k === todayKey;
            return (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setSelectedDate(d);
                  setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                }}
                className={`flex min-h-[58px] min-w-[44px] flex-1 flex-col items-center justify-center rounded-2xl transition-colors ${
                  active
                    ? 'bg-[#2F80FF] text-white'
                    : isToday
                      ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : 'bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]'
                }`}
              >
                <span className="text-[11px] font-medium opacity-75">{DAY_SHORT[d.getDay()]}</span>
                <span className="mt-0.5 font-mono text-sm font-bold tabular-nums">{d.getDate()}</span>
              </button>
            );
          })}
        </div>

        {/* Month Navigation Header */}
        <div className="flex items-center justify-between gap-2 border-t border-white/[0.08] pt-4">
          <h2 className="text-base font-bold text-slate-50">{monthTitle}</h2>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.1]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={jumpToday}
              className="min-h-[44px] rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-xs font-semibold text-slate-200 hover:bg-white/[0.1]"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.1]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 7-Column Month Grid */}
        <div className="mt-4 grid grid-cols-7 gap-1.5 text-center">
          {DAY_SHORT.map((d) => (
            <div key={d} className="py-1.5 text-[11px] font-semibold text-slate-500">
              {d}
            </div>
          ))}
          {monthDays.map((day) => {
            const key = getDateKeyFromDate(day);
            const inMonth = day.getMonth() === viewMonth.getMonth();
            const isSelected = key === selectedKey;
            const isToday = key === todayKey;
            const scheduled = reminders.filter((r) => isReminderScheduledForDate(r, day));
            const alarmCount = scheduled.filter((r) => r.isAlarm).length;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDate(day)}
                className={`flex min-h-[48px] flex-col items-center justify-center rounded-xl border transition-colors ${
                  isSelected
                    ? 'border-[#2F80FF] bg-[#2F80FF]/25 text-white'
                    : isToday
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                      : 'border-white/[0.05] bg-white/[0.02] text-slate-300 hover:bg-white/[0.07]'
                } ${inMonth ? '' : 'opacity-35'}`}
              >
                <span className="font-mono text-xs font-semibold tabular-nums">{day.getDate()}</span>
                {scheduled.length > 0 && (
                  <span className="mt-1 font-mono text-[10px] leading-none text-slate-400 tabular-nums">
                    {alarmCount > 0 ? `${scheduled.length}` : `${scheduled.length}`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Right: Selected Day Detail Drawer */}
      <section className="flex flex-col gap-4 lg:col-span-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-400">Selected day</p>
            <h2 className="text-lg font-bold text-slate-50">{selectedDateTitle}</h2>
          </div>
          <button
            type="button"
            onClick={() => onAddForDate(selectedDate)}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#2F80FF] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#256FE6] whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add for Day</span>
          </button>
        </div>

        {selectedDayReminders.length === 0 ? (
          <div className="glass-surface rounded-3xl px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-300">No reminders scheduled for this date.</p>
            <p className="mt-1 text-xs text-slate-500">
              Tap Add for Day to schedule an exact alarm or recurring task.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {selectedDayReminders.map((r) => (
              <SwipeableReminderRow
                key={r.id}
                reminder={r}
                timeFormat={prefs.timeFormat}
                onToggleDone={onToggleDone}
                onSnooze={onSnooze}
                onDelete={onDelete}
                onEdit={onEdit}
                onFocus={onFocus}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
