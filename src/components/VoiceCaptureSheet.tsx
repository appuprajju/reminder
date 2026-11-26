import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  AlarmClock,
  Bell,
  Check,
  Globe,
  Mic,
  SlidersHorizontal,
  Square,
  X,
} from 'lucide-react';
import type { ParsedQuickReminder, VoiceDraftOverrides } from '../lib/parser';
import { formatDaysSummary, formatTimeDisplay } from '../lib/time';
import {
  VOICE_EXAMPLE_PHRASES,
  VOICE_LANGUAGES,
  type VoiceLanguageId,
  type VoicePhase,
} from '../lib/voiceState';
import { SpringSegmentedControl } from './SpringSegmentedControl';

interface VoiceCaptureSheetProps {
  open: boolean;
  phase: VoicePhase;
  isHolding: boolean;
  isSupported: boolean;
  lang: VoiceLanguageId;
  transcript: string;
  parsedPreview: ParsedQuickReminder | null;
  errorMessage: string | null;
  timeFormat: '12h' | '24h';
  onLangChange: (lang: VoiceLanguageId) => void;
  onToggleListen: () => void;
  onTranscriptChange: (text: string) => void;
  onUpdateOverrides: (patch: Partial<VoiceDraftOverrides>) => void;
  onConfirmSave: (parsed: ParsedQuickReminder) => void;
  onEditDetails: (parsed: ParsedQuickReminder) => void;
  onClose: () => void;
}

const BAR_DELAYS = ['0ms', '90ms', '180ms', '60ms', '150ms', '240ms', '120ms'];

function addMinutesToHm(hm: string, addMin: number): string {
  const [h, m] = hm.split(':').map(Number);
  const total = ((Number.isFinite(h) ? h : 9) * 60 + (Number.isFinite(m) ? m : 0) + addMin) % 1440;
  const normalized = (total + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

export const VoiceCaptureSheet: React.FC<VoiceCaptureSheetProps> = ({
  open,
  phase,
  isSupported,
  lang,
  transcript,
  parsedPreview,
  errorMessage,
  timeFormat,
  onLangChange,
  onToggleListen,
  onTranscriptChange,
  onUpdateOverrides,
  onConfirmSave,
  onEditDetails,
  onClose,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const isListening = phase === 'listening';
  const canSave = Boolean(transcript.trim() && parsedPreview);
  const scheduleLabel = parsedPreview
    ? formatDaysSummary(parsedPreview.days, parsedPreview.oneTimeDate)
    : '';

  const repeatMode: 'once' | 'daily' | 'weekdays' = parsedPreview?.oneTimeDate
    ? 'once'
    : parsedPreview?.days && parsedPreview.days.length === 5 && !parsedPreview.days.includes(0) && !parsedPreview.days.includes(6)
      ? 'weekdays'
      : 'daily';

  const statusHeading = isListening
    ? 'Listening… tap mic to stop'
    : phase === 'review' && canSave
      ? 'Ready to schedule'
      : phase === 'error'
        ? 'Type or try voice again'
        : 'Voice Alarm & Reminder';

  const sheetContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Voice alarm and reminder capture"
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glass-elevated animate-sheet-up flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl">
        {/* Mobile grab handle */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold text-white">{statusHeading}</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {isListening
                ? 'Speak naturally: time, repeat, alarm or reminder'
                : 'Tap once to speak hands-free, or tweak parsed details below'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close voice capture"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Language Selector + Tap-to-Speak Orb */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex w-full items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <Globe className="h-3.5 w-3.5 text-sky-300" />
                Voice language
              </span>
              <select
                aria-label="Voice recognition language"
                value={lang}
                onChange={(e) => onLangChange(e.target.value as VoiceLanguageId)}
                className="min-h-[36px] rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3 text-xs font-medium text-slate-100 focus:border-[#0A84FF] focus:outline-none"
              >
                {VOICE_LANGUAGES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={onToggleListen}
              onContextMenu={(e) => e.preventDefault()}
              aria-pressed={isListening}
              aria-label={isListening ? 'Stop listening' : 'Tap to speak alarm or reminder'}
              className={`group relative flex select-none touch-manipulation items-center justify-center rounded-full border transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0A84FF] ${
                isListening
                  ? 'h-24 w-24 scale-105 border-[#FF453A]/70 bg-gradient-to-b from-[#FF6961] to-[#FF453A] text-white shadow-[0_14px_38px_rgba(255,69,58,0.5),inset_0_1px_0_rgba(255,255,255,0.45)]'
                  : canSave
                    ? 'h-16 w-16 border-white/30 bg-gradient-to-b from-[#4BA3FF] to-[#0A84FF] text-white shadow-[0_10px_24px_rgba(10,132,255,0.38),inset_0_1px_0_rgba(255,255,255,0.5)] hover:brightness-105 active:scale-95'
                    : 'h-24 w-24 border-white/30 bg-gradient-to-b from-[#4BA3FF] to-[#0A84FF] text-white shadow-[0_14px_34px_rgba(10,132,255,0.42),inset_0_1px_0_rgba(255,255,255,0.5)] hover:brightness-105 active:scale-95'
              }`}
            >
              {isListening && (
                <span
                  aria-hidden="true"
                  className="animate-alarm-ripple pointer-events-none absolute inset-0 rounded-full border-2 border-[#FF453A]/75"
                />
              )}
              {isListening ? (
                <Square className="h-7 w-7 fill-current" />
              ) : (
                <Mic className={canSave ? 'h-7 w-7' : 'h-9 w-9'} />
              )}
            </button>

            {/* 7-bar compositor-only cadence visualizer */}
            <div
              aria-hidden="true"
              className="mt-2.5 flex h-5 items-center justify-center gap-1.5"
            >
              {BAR_DELAYS.map((delay, idx) => (
                <span
                  key={idx}
                  style={{ animationDelay: delay }}
                  className={`h-6 w-1.5 rounded-full transition-colors duration-150 ${
                    isListening
                      ? 'voice-bar-active bg-[#FF6961]'
                      : canSave
                        ? 'scale-y-[0.38] bg-[#30D158]/75'
                        : 'scale-y-[0.3] bg-white/20'
                  }`}
                />
              ))}
            </div>

            <p className="mt-1.5 text-xs font-medium text-slate-300">
              {isListening
                ? 'Listening live… tap the red button when finished'
                : isSupported
                  ? 'Tap mic to start speaking — no need to hold'
                  : 'Type naturally below — smart alarm & reminder parsing is active'}
            </p>
          </div>

          {/* Calm Error / Permission Recovery Banner */}
          {errorMessage && (
            <div
              role="status"
              className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-200"
            >
              <p>{errorMessage}</p>
              <button
                type="button"
                onClick={() => inputRef.current?.focus()}
                className="mt-2 inline-flex min-h-[36px] items-center rounded-lg bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/15"
              >
                Type Instead
              </button>
            </div>
          )}

          {/* Editable Live Transcript Field */}
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="voice-transcript-input" className="text-xs font-medium text-slate-400">
                {isListening ? 'Live transcript' : 'Heard phrase (edit anytime)'}
              </label>
              {transcript.trim() && (
                <button
                  type="button"
                  onClick={() => onTranscriptChange('')}
                  className="text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
            <input
              id="voice-transcript-input"
              ref={inputRef}
              type="text"
              maxLength={120}
              value={transcript}
              onChange={(e) => onTranscriptChange(e.target.value)}
              placeholder='Say "Wake me up tomorrow at 6:30am" or "Remind me in 30 min"'
              className="mt-1.5 min-h-[46px] w-full rounded-xl border border-white/[0.12] bg-[#060812]/80 px-3.5 text-base text-white placeholder:text-slate-500 focus:border-[#0A84FF] focus:outline-none sm:text-sm"
            />
          </div>

          {/* Interactive Parsed Preview Card with Quick Tweaks */}
          {parsedPreview ? (
            <div className="space-y-3.5 rounded-2xl border border-white/[0.14] bg-white/[0.04] p-4">
              <div className="flex items-center gap-3.5">
                <div
                  aria-hidden="true"
                  style={{
                    background: `linear-gradient(145deg, ${
                      parsedPreview.isAlarm ? '#0A84FF' : '#30D158'
                    }, rgba(255,255,255,0.14))`,
                  }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-white/25 text-lg shadow-[0_8px_18px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.5)]"
                >
                  {parsedPreview.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold text-white">{parsedPreview.title}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-300">
                    <span className="inline-flex items-center gap-1 font-mono font-semibold text-white tabular-nums">
                      {parsedPreview.isAlarm ? (
                        <AlarmClock className="h-3.5 w-3.5 text-red-400" />
                      ) : (
                        <Bell className="h-3.5 w-3.5 text-emerald-300" />
                      )}
                      {formatTimeDisplay(parsedPreview.time, timeFormat)}
                    </span>
                    <span aria-hidden="true" className="text-slate-500">·</span>
                    <span>{scheduleLabel}</span>
                    {parsedPreview.priority === 'high' && (
                      <>
                        <span aria-hidden="true" className="text-slate-500">·</span>
                        <span className="font-semibold text-amber-300">High priority</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Instant Mode Switch: Loud Alarm vs Gentle Reminder */}
              <SpringSegmentedControl<'alarm' | 'reminder'>
                ariaLabel="Alert type"
                fullWidth
                size="sm"
                value={parsedPreview.isAlarm ? 'alarm' : 'reminder'}
                onChange={(mode) => onUpdateOverrides({ isAlarm: mode === 'alarm' })}
                options={[
                  { id: 'alarm', label: 'Loud Alarm' },
                  { id: 'reminder', label: 'Gentle Reminder' },
                ]}
              />

              {/* Direct Time Editor + Quick Nudges */}
              <div className="flex flex-wrap items-center gap-2">
                <label className="relative flex min-h-[40px] items-center rounded-xl border border-white/[0.12] bg-[#060812]/80 px-3 text-xs text-slate-200">
                  <span className="sr-only">Alarm time</span>
                  <input
                    type="time"
                    value={parsedPreview.time}
                    onChange={(e) => onUpdateOverrides({ time: e.target.value })}
                    className="bg-transparent font-mono text-xs font-semibold text-white focus:outline-none"
                  />
                </label>

                {[
                  { label: '+15m', delta: 15 },
                  { label: '+30m', delta: 30 },
                  { label: '+1h', delta: 60 },
                ].map((nudge) => (
                  <button
                    key={nudge.label}
                    type="button"
                    onClick={() =>
                      onUpdateOverrides({ time: addMinutesToHm(parsedPreview.time, nudge.delta) })
                    }
                    className="ios-spring-press min-h-[40px] rounded-xl border border-white/[0.1] bg-white/[0.05] px-2.5 font-mono text-xs font-semibold text-slate-200 hover:bg-white/[0.12]"
                  >
                    {nudge.label}
                  </button>
                ))}
              </div>

              {/* Instant Repeat Switcher */}
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'once', label: 'One-time' },
                    { id: 'daily', label: 'Daily' },
                    { id: 'weekdays', label: 'Weekdays' },
                  ] as const
                ).map((opt) => {
                  const active = repeatMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onUpdateOverrides({ repeatMode: opt.id })}
                      className={`ios-spring-press min-h-[38px] rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap ${
                        active
                          ? 'border-sky-400/50 bg-sky-500/20 text-sky-100'
                          : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs font-medium text-slate-400">
                Try saying or tapping an example
              </p>
              <div className="mt-2 flex flex-col gap-1.5">
                {VOICE_EXAMPLE_PHRASES.map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() => onTranscriptChange(phrase)}
                    className="flex min-h-[44px] items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 text-left text-xs text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                  >
                    <span className="truncate">&ldquo;{phrase}&rdquo;</span>
                    <span className="ml-2 shrink-0 text-[11px] font-semibold text-sky-300">
                      Try
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Thumb-Zone Action Footer */}
        <div className="flex flex-col gap-2.5 border-t border-white/[0.08] px-5 pt-3.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:py-4">
          <div
            className={`grid gap-2.5 sm:flex sm:items-center ${
              canSave && parsedPreview ? 'grid-cols-2' : 'grid-cols-1'
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.09] whitespace-nowrap"
            >
              Cancel
            </button>

            {canSave && parsedPreview && (
              <button
                type="button"
                onClick={() => onEditDetails(parsedPreview)}
                className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-white/[0.14] bg-white/[0.06] px-4 text-sm font-semibold text-slate-100 transition-colors hover:bg-white/[0.12] whitespace-nowrap"
              >
                <SlidersHorizontal className="h-4 w-4 text-sky-300" />
                <span>More Options</span>
              </button>
            )}
          </div>

          <button
            type="button"
            disabled={!canSave || !parsedPreview}
            onClick={() => {
              if (!canSave || !parsedPreview) return;
              onConfirmSave(parsedPreview);
              onClose();
            }}
            className="liquid-primary-btn inline-flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-xl px-5 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-45 sm:w-auto sm:flex-1 whitespace-nowrap"
          >
            <Check className="h-4 w-4" />
            <span>{parsedPreview?.isAlarm ? 'Save Alarm' : 'Save Reminder'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(sheetContent, document.body) : sheetContent;
};
