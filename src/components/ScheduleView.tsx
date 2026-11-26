import React, { useMemo, useState } from 'react';
import {
  AlarmClockPlus,
  Calendar,
  CalendarArrowDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  Plus,
  RefreshCw,
  Star,
} from 'lucide-react';
import {
  DAY_SHORT,
  formatTimeDisplay,
  getDateKeyFromDate,
  getMonthCalendarDays,
  getTodayDateKey,
  getWeekStripDates,
  isReminderScheduledForDate,
} from '../lib/time';
import type {
  GmailMessageSummary,
  GoogleCalendarEvent,
  Reminder,
  UserPreferences,
} from '../types';
import { SwipeableReminderRow } from './SwipeableReminderRow';

interface ScheduleViewProps {
  reminders: Reminder[];
  prefs: UserPreferences;
  calendarEvents: GoogleCalendarEvent[];
  calendarLoading: boolean;
  calendarError: string | null;
  gmailMessages: GmailMessageSummary[];
  gmailLoading: boolean;
  gmailError: string | null;
  hasWorkspaceAccess: boolean;
  onConnectGoogle: () => void;
  onRefreshCalendar: () => void;
  onRefreshGmail: () => void;
  onImportCalendarEvent: (ev: GoogleCalendarEvent) => void;
  onImportGmailMessage: (msg: GmailMessageSummary) => void;
  onExportAllIcs: () => void;
  onExportIcs: (reminder: Reminder) => void;
  onAddForDate: (date: Date) => void;
  onToggleDone: (id: string) => void;
  onToggleSubtask: (reminderId: string, subtaskId: string) => void;
  onSnooze: (id: string, minutes: number) => void;
  onDelete: (id: string) => void;
  onEdit: (reminder: Reminder) => void;
  onFocus: (reminder: Reminder) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  reminders,
  prefs,
  calendarEvents,
  calendarLoading,
  calendarError,
  gmailMessages,
  gmailLoading,
  gmailError,
  hasWorkspaceAccess,
  onConnectGoogle,
  onRefreshCalendar,
  onRefreshGmail,
  onImportCalendarEvent,
  onImportGmailMessage,
  onExportAllIcs,
  onExportIcs,
  onAddForDate,
  onToggleDone,
  onToggleSubtask,
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

  const selectedDayCalendarEvents = useMemo(
    () => calendarEvents.filter((ev) => ev.dateKey === selectedKey),
    [calendarEvents, selectedKey]
  );

  const calendarCountByDay = useMemo(() => {
    const map = new Map<string, number>();
    calendarEvents.forEach((ev) => {
      map.set(ev.dateKey, (map.get(ev.dateKey) || 0) + 1);
    });
    return map;
  }, [calendarEvents]);

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
      {/* Left: Horizontal Week Strip + Month Grid + Gmail Capture */}
      <div className="flex flex-col gap-6 lg:col-span-6">
        <section className="glass-surface rounded-3xl p-5">
          {/* Horizontal Quick Week Scroller */}
          <div className="no-scrollbar mb-5 flex items-center justify-between gap-1.5 overflow-x-auto">
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
                  className={`ios-spring-press flex min-h-[58px] min-w-[44px] flex-1 flex-col items-center justify-center rounded-2xl transition-colors ${
                    active
                      ? 'bg-[#0A84FF] text-white shadow-[0_6px_18px_rgba(10,132,255,0.42)]'
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
            <h2 className="font-display text-base font-bold text-slate-50">{monthTitle}</h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label="Previous month"
                className="ios-spring-press flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.1]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={jumpToday}
                className="ios-spring-press min-h-[44px] rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-xs font-semibold text-slate-200 hover:bg-white/[0.1]"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="Next month"
                className="ios-spring-press flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.1]"
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
              const calCount = calendarCountByDay.get(key) || 0;
              const totalCount = scheduled.length + calCount;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={`ios-spring-press flex min-h-[48px] flex-col items-center justify-center rounded-xl border transition-colors ${
                    isSelected
                      ? 'border-[#0A84FF] bg-[#0A84FF]/25 text-white'
                      : isToday
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                        : 'border-white/[0.05] bg-white/[0.02] text-slate-300 hover:bg-white/[0.07]'
                  } ${inMonth ? '' : 'opacity-35'}`}
                >
                  <span className="font-mono text-xs font-semibold tabular-nums">
                    {day.getDate()}
                  </span>
                  {totalCount > 0 && (
                    <span className="mt-1 font-mono text-[10px] leading-none text-sky-300 tabular-nums">
                      {totalCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Gmail Inbox-to-Reminder Capture Card */}
        <section className="glass-surface rounded-3xl p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-amber-300" />
              <h2 className="font-display text-base font-bold text-slate-50">
                Gmail Inbox to Reminder
              </h2>
            </div>
            {hasWorkspaceAccess && (
              <button
                type="button"
                disabled={gmailLoading}
                onClick={onRefreshGmail}
                aria-label="Refresh Gmail messages"
                className="ios-spring-press flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-200 hover:bg-white/[0.1] disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${gmailLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          {!hasWorkspaceAccess ? (
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-relaxed text-slate-400">
                Connect Google to scan recent inbox emails and turn any message into an exact alarm
                in one tap.
              </p>
              <button
                type="button"
                onClick={onConnectGoogle}
                className="ios-spring-press min-h-[42px] shrink-0 rounded-xl border border-sky-400/30 bg-sky-500/15 px-4 text-xs font-semibold text-sky-100 hover:bg-sky-500/25 whitespace-nowrap"
              >
                Connect Gmail
              </button>
            </div>
          ) : gmailError ? (
            <p className="mt-3 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {gmailError}
            </p>
          ) : gmailMessages.length === 0 ? (
            <p className="mt-3 text-xs text-slate-400">
              {gmailLoading
                ? 'Loading recent Gmail messages…'
                : 'No recent primary inbox messages found.'}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-white/[0.06]">
              {gmailMessages.slice(0, 5).map((msg) => (
                <li key={msg.id} className="flex items-start justify-between gap-3 py-3 first:pt-1 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {msg.isStarred && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-300 text-amber-300" />}
                      <p className="truncate text-xs font-semibold text-white">{msg.subject}</p>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                      {msg.from}
                      {msg.snippet ? ` · ${msg.snippet}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onImportGmailMessage(msg)}
                    className="ios-spring-press inline-flex min-h-[38px] shrink-0 items-center gap-1 rounded-xl border border-white/[0.1] bg-white/[0.06] px-3 text-xs font-semibold text-sky-200 hover:bg-white/[0.12] whitespace-nowrap"
                  >
                    <AlarmClockPlus className="h-3.5 w-3.5" />
                    <span>Remind</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Right: Selected Day Detail Drawer + Synced Google Calendar Events */}
      <section className="flex flex-col gap-4 lg:col-span-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-400">Selected day</p>
            <h2 className="font-display text-lg font-bold text-slate-50">{selectedDateTitle}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExportAllIcs}
              className="ios-spring-press flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.05] px-3.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.1] whitespace-nowrap shrink-0"
            >
              <CalendarArrowDown className="h-4 w-4 text-emerald-300" />
              <span>Export .ics</span>
            </button>
            <button
              type="button"
              onClick={() => onAddForDate(selectedDate)}
              className="liquid-primary-btn ios-spring-press flex min-h-[44px] items-center gap-1.5 rounded-xl px-4 text-xs font-semibold text-white whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Add for Day</span>
            </button>
          </div>
        </div>

        {/* Synced Google Calendar Card for Selected Date */}
        <div className="glass-surface rounded-3xl p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-sky-300" />
              <h3 className="text-sm font-bold text-white">Google Calendar</h3>
              {hasWorkspaceAccess && (
                <span className="font-mono text-xs text-slate-400 tabular-nums">
                  · {selectedDayCalendarEvents.length} on day
                </span>
              )}
            </div>
            {hasWorkspaceAccess ? (
              <button
                type="button"
                disabled={calendarLoading}
                onClick={onRefreshCalendar}
                aria-label="Sync Google Calendar"
                className="ios-spring-press flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-200 hover:bg-white/[0.1] disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${calendarLoading ? 'animate-spin' : ''}`} />
              </button>
            ) : (
              <button
                type="button"
                onClick={onConnectGoogle}
                className="ios-spring-press min-h-[36px] rounded-xl border border-sky-400/30 bg-sky-500/15 px-3 text-xs font-semibold text-sky-100 hover:bg-sky-500/25"
              >
                Connect
              </button>
            )}
          </div>

          {!hasWorkspaceAccess ? (
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Sign in with Google to view your Google Calendar events alongside your alarms and add
              reminders directly to your calendar.
            </p>
          ) : calendarError ? (
            <p className="mt-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {calendarError}
            </p>
          ) : selectedDayCalendarEvents.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">
              {calendarLoading
                ? 'Syncing Google Calendar…'
                : calendarEvents.length > 0
                  ? `No events on ${selectedDateTitle} · ${calendarEvents.length} upcoming in the next 14 days.`
                  : 'No Google Calendar events scheduled in the next 14 days.'}
            </p>
          ) : (
            <ul className="mt-2.5 divide-y divide-white/[0.06]">
              {selectedDayCalendarEvents.map((ev) => (
                <li key={ev.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-1 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">{ev.summary}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                      <span className="font-mono text-sky-300 tabular-nums">
                        {ev.allDay ? 'All day' : formatTimeDisplay(ev.timeHm, prefs.timeFormat)}
                      </span>
                      {ev.location ? ` · ${ev.location}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onImportCalendarEvent(ev)}
                    className="ios-spring-press inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-xl border border-white/[0.1] bg-white/[0.06] px-2.5 text-xs font-semibold text-slate-100 hover:bg-white/[0.12] whitespace-nowrap"
                  >
                    <AlarmClockPlus className="h-3.5 w-3.5 text-sky-300" />
                    <span>Set Alarm</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Selected Day Reminders */}
        {selectedDayReminders.length === 0 ? (
          <div className="glass-surface rounded-3xl px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-300">
              No reminders scheduled for this date.
            </p>
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
                onToggleSubtask={onToggleSubtask}
                onSnooze={onSnooze}
                onDelete={onDelete}
                onEdit={onEdit}
                onFocus={onFocus}
                onExportIcs={onExportIcs}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
