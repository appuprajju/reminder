import React, { useEffect, useMemo, useState } from 'react';
import { AlarmClock, Mic, Plus, ShieldCheck } from 'lucide-react';
import { useVoiceCapture } from '../hooks/useVoiceCapture';
import { parseQuickInput, type ParsedQuickReminder } from '../lib/parser';
import {
  formatClockParts,
  formatCountdown,
  formatTimeDisplay,
  getGreeting,
  getTodayDateKey,
  isReminderDoneToday,
  isReminderScheduledForDate,
} from '../lib/time';
import type { DeliveryHealth, FilterMode, Reminder, UserPreferences } from '../types';
import { LiquidGlassCard } from './LiquidGlassCard';
import { SwipeableReminderRow } from './SwipeableReminderRow';
import { VoiceCaptureSheet } from './VoiceCaptureSheet';

interface TodayViewProps {
  reminders: Reminder[];
  prefs: UserPreferences;
  userName?: string | null;
  deliveryHealth: DeliveryHealth;
  onToggleTimeFormat: () => void;
  onQuickAdd: (rawText: string) => void;
  onEditVoiceDraft: (parsed: ParsedQuickReminder) => void;
  onOpenNewSheet: () => void;
  onToggleDone: (id: string) => void;
  onSnooze: (id: string, minutes: number) => void;
  onDelete: (id: string) => void;
  onEdit: (reminder: Reminder) => void;
  onFocus: (reminder: Reminder) => void;
  onOpenDeliverySetup: () => void;
  onRegisterVoiceClose?: (closeFn: (() => void) | null) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  reminders,
  prefs,
  userName,
  deliveryHealth,
  onToggleTimeFormat,
  onQuickAdd,
  onEditVoiceDraft,
  onOpenNewSheet,
  onToggleDone,
  onSnooze,
  onDelete,
  onEdit,
  onFocus,
  onOpenDeliverySetup,
  onRegisterVoiceClose,
}) => {
  const [now, setNow] = useState(() => new Date());
  const [filter, setFilter] = useState<FilterMode>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [quickText, setQuickText] = useState('');
  const voice = useVoiceCapture(prefs.vibrate, now);

  useEffect(() => {
    if (!onRegisterVoiceClose) return;
    onRegisterVoiceClose(voice.isOpen ? voice.close : null);
    return () => onRegisterVoiceClose(null);
  }, [onRegisterVoiceClose, voice.close, voice.isOpen]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const todayKey = getTodayDateKey(now);
  const clock = formatClockParts(now, prefs.timeFormat);
  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const todayItems = useMemo(
    () => reminders.filter((r) => isReminderScheduledForDate(r, now)),
    [reminders, now]
  );

  const completedToday = useMemo(
    () => todayItems.filter((r) => isReminderDoneToday(r, todayKey)).length,
    [todayItems, todayKey]
  );

  const completionPct =
    todayItems.length === 0 ? 0 : Math.round((completedToday / todayItems.length) * 100);

  const upNext = useMemo(() => {
    const pending = reminders
      .filter((r) => !isReminderDoneToday(r, todayKey))
      .sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0));
    return pending[0] || null;
  }, [reminders, todayKey]);

  const availableTags = useMemo(() => {
    const set = new Set<string>(prefs.customTags);
    reminders.forEach((r) => {
      if (r.tag) set.add(r.tag);
    });
    return Array.from(set);
  }, [prefs.customTags, reminders]);

  const filteredReminders = useMemo(() => {
    return reminders
      .filter((r) => {
        const done = isReminderDoneToday(r, todayKey);
        if (filter === 'alarms' && !r.isAlarm) return false;
        if (filter === 'todo' && done) return false;
        if (filter === 'done' && !done) return false;
        if (selectedTag !== 'all' && r.tag !== selectedTag) return false;
        return true;
      })
      .sort((a, b) => {
        const aDone = isReminderDoneToday(a, todayKey) ? 1 : 0;
        const bDone = isReminderDoneToday(b, todayKey) ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        return a.time.localeCompare(b.time);
      });
  }, [filter, reminders, selectedTag, todayKey]);

  const parsedPreview = useMemo(() => {
    if (!quickText.trim()) return null;
    return parseQuickInput(quickText, now);
  }, [quickText, now]);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickText.trim()) return;
    onQuickAdd(quickText.trim());
    setQuickText('');
  };

  const handleVoiceTriggerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore if pointer capture unavailable
    }
    voice.startHoldCapture();
  };

  const handleVoiceTriggerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    voice.endHoldCapture();
  };

  const handleVoiceTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault();
      voice.startHoldCapture();
    }
  };

  const handleVoiceTriggerKeyUp = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      voice.endHoldCapture();
    }
  };

  const ringCircumference = 2 * Math.PI * 38;
  const ringOffset = ringCircumference * (1 - completionPct / 100);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
      {/* Left Hero Column (3D Liquid Glass Card with specular pointer tilt) */}
      <LiquidGlassCard className="rounded-[28px] p-5 sm:p-6 lg:sticky lg:top-6 lg:col-span-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-300/80 uppercase">
              {dateLabel}
            </p>
            <h1 className="mt-1 text-lg font-bold tracking-tight text-white">
              {getGreeting(now)}
              {userName ? `, ${userName}` : ''}
            </h1>
          </div>
          <button
            type="button"
            onClick={onToggleTimeFormat}
            className="min-h-[44px] rounded-2xl border border-white/20 bg-white/[0.09] px-3.5 text-xs font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] transition-colors hover:bg-white/[0.16] whitespace-nowrap shrink-0"
            title="Switch 12-hour or 24-hour clock"
          >
            {prefs.timeFormat === '12h' ? '12H' : '24H'}
          </button>
        </div>

        {/* Dominant Focal Anchor: Luminous iOS Liquid Glass Clock */}
        <div className="mt-5 flex items-baseline gap-2">
          <span className="bg-gradient-to-b from-white via-white to-sky-200/75 bg-clip-text font-mono text-5xl font-bold tracking-tight text-transparent tabular-nums drop-shadow-[0_6px_24px_rgba(10,132,255,0.28)] sm:text-6xl">
            {clock.hm}
          </span>
          <span className="font-mono text-lg font-medium text-slate-400 tabular-nums">
            :{clock.sec}
          </span>
          {clock.period && (
            <span className="ml-1 font-mono text-base font-semibold text-sky-300">
              {clock.period}
            </span>
          )}
        </div>

        {/* Daily Progress Ring + Up Next Summary */}
        <div className="mt-6 flex items-center gap-5 border-t border-white/[0.14] pt-5">
          <div className="relative h-24 w-24 shrink-0">
            <svg
              viewBox="0 0 96 96"
              className="h-full w-full -rotate-90 drop-shadow-[0_8px_18px_rgba(48,209,88,0.4)]"
            >
              <defs>
                <linearGradient id="liquidRingGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#6EE7B7" />
                  <stop offset="55%" stopColor="#30D158" />
                  <stop offset="100%" stopColor="#38BDF8" />
                </linearGradient>
              </defs>
              <circle
                cx="48"
                cy="48"
                r="38"
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="8"
              />
              <circle
                cx="48"
                cy="48"
                r="38"
                fill="none"
                stroke="url(#liquidRingGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                className="transition-[stroke-dashoffset] duration-500 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-xl font-bold text-white tabular-nums">
                {completionPct}%
              </span>
              <span className="font-mono text-[11px] text-slate-300/80 tabular-nums">
                {completedToday}/{todayItems.length}
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-wide text-slate-300/75 uppercase">
              Up next
            </p>
            {upNext ? (
              <>
                <p className="mt-1 truncate text-base font-bold text-white">
                  {upNext.title}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-300">
                  <span className="font-mono font-semibold text-white tabular-nums">
                    {formatTimeDisplay(upNext.time, prefs.timeFormat)}
                  </span>
                  <span aria-hidden="true" className="text-slate-500">·</span>
                  <span className="font-mono font-semibold text-sky-300 tabular-nums">
                    {formatCountdown(upNext.dueAt, now.getTime())}
                  </span>
                </div>
              </>
            ) : (
              <p className="mt-1 text-sm font-semibold text-emerald-300">
                All clear for today
              </p>
            )}
          </div>
        </div>

        {/* OS Background Delivery Status Row */}
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[0.14] pt-4">
          <div className="min-w-0 text-xs text-slate-300/85">
            <span className="font-semibold text-white">
              {deliveryHealth.notificationPermission === 'granted'
                ? 'OS Lock-Screen Delivery Active'
                : 'Enable Lock-Screen Alarms'}
            </span>
            <p className="mt-0.5 truncate text-slate-400">
              {deliveryHealth.notificationPermission === 'granted'
                ? `${deliveryHealth.osScheduledCount} scheduled via OS / push`
                : 'Allow OS AlarmManager & Push for closed-app alerts'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenDeliverySetup}
            className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-2xl border border-white/20 bg-white/[0.09] px-3.5 text-xs font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] transition-colors hover:bg-white/[0.16] whitespace-nowrap"
          >
            <ShieldCheck className="h-4 w-4 text-sky-300" />
            <span>{deliveryHealth.notificationPermission === 'granted' ? 'Inspect' : 'Enable'}</span>
          </button>
        </div>
      </LiquidGlassCard>

      {/* Right Workspace Column: Quick Capture + Filters + Swipeable Schedule */}
      <section className="flex flex-col gap-4 lg:col-span-7">
        {/* Natural-Language Quick Add & Prominent Push-to-Talk Voice Bar */}
        <form onSubmit={handleQuickSubmit} className="glass-surface rounded-2xl p-2.5">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              placeholder='Try "Take vitamins daily at 8:30am" or hold mic to speak'
              maxLength={100}
              className="min-h-[48px] min-w-0 flex-1 bg-transparent px-3 text-sm text-white placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="button"
              onPointerDown={handleVoiceTriggerDown}
              onPointerUp={handleVoiceTriggerUp}
              onPointerCancel={handleVoiceTriggerUp}
              onKeyDown={handleVoiceTriggerKeyDown}
              onKeyUp={handleVoiceTriggerKeyUp}
              aria-pressed={voice.phase === 'listening' || voice.isHolding}
              aria-label="Hold to speak reminder"
              title="Press and hold to speak a reminder"
              className={`inline-flex min-h-[48px] min-w-[48px] shrink-0 select-none touch-none items-center justify-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition-all duration-150 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#0A84FF] ${
                voice.phase === 'listening'
                  ? 'scale-[0.98] border-[#FF453A]/70 bg-[#FF453A] text-white shadow-[0_8px_24px_rgba(255,69,58,0.45)]'
                  : 'border-sky-400/35 bg-sky-500/20 text-sky-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] hover:bg-sky-500/30 active:scale-95'
              }`}
            >
              <Mic className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">
                {voice.phase === 'listening' ? 'Release' : 'Hold to Speak'}
              </span>
            </button>
            <button
              type="submit"
              disabled={!quickText.trim()}
              className="liquid-primary-btn flex min-h-[48px] shrink-0 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-white transition-transform active:scale-95 disabled:opacity-45 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>Add</span>
            </button>
          </div>

          {parsedPreview && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-3 pt-2 text-xs text-slate-400">
              <span className="truncate font-medium text-slate-200">{parsedPreview.title}</span>
              <span className="font-mono text-[#60A5FA] tabular-nums">{parsedPreview.summary}</span>
            </div>
          )}
        </form>

        {/* Interactive Segmented Filter Bar + Tag Filters */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label="Filter reminders"
              className="inline-flex rounded-xl border border-white/[0.08] bg-[#0F1426] p-1"
            >
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'alarms', label: 'Alarms' },
                  { id: 'todo', label: 'To Do' },
                  { id: 'done', label: 'Done' },
                ] as { id: FilterMode; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`min-h-[38px] rounded-lg px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    filter === tab.id
                      ? 'bg-[#2F80FF] text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onOpenNewSheet}
              className="hidden min-h-[44px] items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 text-xs font-semibold text-slate-100 transition-colors hover:bg-white/[0.09] sm:inline-flex whitespace-nowrap shrink-0"
            >
              <AlarmClock className="h-4 w-4 text-[#60A5FA]" />
              <span>Detailed Alarm</span>
            </button>
          </div>

          {availableTags.length > 0 && (
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedTag('all')}
                className={`min-h-[36px] shrink-0 rounded-lg px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedTag === 'all'
                    ? 'bg-white/[0.14] text-white'
                    : 'bg-white/[0.04] text-slate-400 hover:text-slate-200'
                }`}
              >
                All Tags
              </button>
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(selectedTag === tag ? 'all' : tag)}
                  className={`min-h-[36px] shrink-0 rounded-lg px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                    selectedTag === tag
                      ? 'bg-[#2F80FF]/25 text-[#93C5FD]'
                      : 'bg-white/[0.04] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Swipeable Reminder Feed */}
        {filteredReminders.length === 0 ? (
          <div className="glass-surface flex flex-col items-center justify-center rounded-3xl px-6 py-12 text-center">
            <AlarmClock className="h-9 w-9 text-slate-600" />
            <h2 className="mt-3 text-base font-semibold text-slate-200">No reminders here yet</h2>
            <p className="mt-1 max-w-xs text-sm text-slate-400">
              Use the quick bar above or tap New Alarm to schedule an exact OS reminder.
            </p>
            <button
              type="button"
              onClick={onOpenNewSheet}
              className="mt-5 min-h-[44px] rounded-xl bg-[#2F80FF] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#256FE6]"
            >
              Create Alarm
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <p className="px-1 text-xs text-slate-500">
              Swipe right to complete · Swipe left for snooze or delete
            </p>
            {filteredReminders.map((r) => (
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

      <VoiceCaptureSheet
        open={voice.isOpen}
        phase={voice.phase}
        isHolding={voice.isHolding}
        isSupported={voice.isSupported}
        transcript={voice.transcript}
        parsedPreview={voice.parsedPreview}
        errorMessage={voice.errorMessage}
        timeFormat={prefs.timeFormat}
        onHoldStart={voice.startHoldCapture}
        onHoldEnd={voice.endHoldCapture}
        onTranscriptChange={voice.updateTranscript}
        onConfirmSave={(spokenText) => onQuickAdd(spokenText)}
        onEditDetails={(parsed) => {
          voice.close();
          onEditVoiceDraft(parsed);
        }}
        onClose={voice.close}
      />
    </div>
  );
};
