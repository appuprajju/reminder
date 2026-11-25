import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlarmClock, Bell, Check, Mic, SlidersHorizontal, X } from 'lucide-react';
import type { ParsedQuickReminder } from '../lib/parser';
import { formatDaysSummary, formatTimeDisplay } from '../lib/time';
import { VOICE_EXAMPLE_PHRASES, type VoicePhase } from '../lib/voiceState';

interface VoiceCaptureSheetProps {
  open: boolean;
  phase: VoicePhase;
  isHolding: boolean;
  isSupported: boolean;
  transcript: string;
  parsedPreview: ParsedQuickReminder | null;
  errorMessage: string | null;
  timeFormat: '12h' | '24h';
  onHoldStart: () => void;
  onHoldEnd: () => void;
  onTranscriptChange: (text: string) => void;
  onConfirmSave: (transcript: string) => void;
  onEditDetails: (parsed: ParsedQuickReminder) => void;
  onClose: () => void;
}

const BAR_DELAYS = ['0ms', '110ms', '220ms', '90ms', '180ms'];

export const VoiceCaptureSheet: React.FC<VoiceCaptureSheetProps> = ({
  open,
  phase,
  isHolding,
  isSupported,
  transcript,
  parsedPreview,
  errorMessage,
  timeFormat,
  onHoldStart,
  onHoldEnd,
  onTranscriptChange,
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
  const priorityLabel =
    parsedPreview?.priority === 'high'
      ? 'High priority'
      : parsedPreview?.priority === 'low'
        ? 'Normal priority'
        : 'Medium priority';

  const handlePadPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore if pointer capture unavailable
    }
    onHoldStart();
  };

  const handlePadPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    onHoldEnd();
  };

  const handlePadKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault();
      onHoldStart();
    }
  };

  const handlePadKeyUp = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onHoldEnd();
    }
  };

  const statusHeading = isListening
    ? 'Listening — release to finish'
    : phase === 'review' && canSave
      ? 'Ready to schedule'
      : phase === 'error'
        ? 'Voice capture unavailable'
        : 'Hold to speak your reminder';

  const sheetContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Voice reminder capture"
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glass-elevated animate-sheet-up flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl">
        {/* Mobile grab handle */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold text-white">{statusHeading}</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {isListening
                ? 'Speak naturally with a time, day, or priority'
                : 'Uses smart natural-language parsing before saving'}
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
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* Live Audio Cadence Visualizer & Push-to-Talk Pad */}
          <div className="flex flex-col items-center text-center">
            <button
              type="button"
              onPointerDown={handlePadPointerDown}
              onPointerUp={handlePadPointerUp}
              onPointerCancel={handlePadPointerUp}
              onKeyDown={handlePadKeyDown}
              onKeyUp={handlePadKeyUp}
              aria-pressed={isListening || isHolding}
              aria-label={isListening ? 'Release to finish speaking' : 'Hold to speak reminder'}
              className={`group relative flex h-24 w-24 select-none touch-none items-center justify-center rounded-full border transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0A84FF] ${
                isListening
                  ? 'scale-105 border-[#FF453A]/70 bg-gradient-to-b from-[#FF6961] to-[#FF453A] text-white shadow-[0_14px_38px_rgba(255,69,58,0.5),inset_0_1px_0_rgba(255,255,255,0.45)]'
                  : 'border-white/30 bg-gradient-to-b from-[#4BA3FF] to-[#0A84FF] text-white shadow-[0_14px_34px_rgba(10,132,255,0.42),inset_0_1px_0_rgba(255,255,255,0.5)] hover:brightness-105 active:scale-95'
              }`}
            >
              {isListening && (
                <span
                  aria-hidden="true"
                  className="animate-alarm-ripple pointer-events-none absolute inset-0 rounded-full border-2 border-[#FF453A]/75"
                />
              )}
              <Mic className="h-9 w-9" />
            </button>

            {/* 5-bar compositor-only cadence visualizer */}
            <div
              aria-hidden="true"
              className="mt-4 flex h-7 items-center justify-center gap-1.5"
            >
              {BAR_DELAYS.map((delay, idx) => (
                <span
                  key={idx}
                  style={{ animationDelay: delay }}
                  className={`h-6 w-1.5 rounded-full transition-colors duration-150 ${
                    isListening
                      ? 'voice-bar-active bg-[#FF6961]'
                      : canSave
                        ? 'scale-y-[0.35] bg-[#30D158]/70'
                        : 'scale-y-[0.3] bg-white/20'
                  }`}
                />
              ))}
            </div>

            <p className="mt-2 text-xs font-medium text-slate-300">
              {isListening
                ? 'Recording live… lift your finger or release mouse when done'
                : isSupported
                  ? 'Press & hold mic button to speak (or edit text below)'
                  : 'Type your reminder below — smart parsing is active'}
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
          <label className="block">
            <span className="text-xs font-medium text-slate-400">
              {isListening ? 'Live transcript' : 'Heard transcript (tap to tweak)'}
            </span>
            <input
              ref={inputRef}
              type="text"
              maxLength={120}
              value={transcript}
              onChange={(e) => onTranscriptChange(e.target.value)}
              placeholder='Try "Take vitamins daily at 8:30am"'
              className="mt-1.5 min-h-[46px] w-full rounded-xl border border-white/[0.12] bg-[#060812]/80 px-3.5 text-base text-white placeholder:text-slate-500 focus:border-[#0A84FF] focus:outline-none sm:text-sm"
            />
          </label>

          {/* Live Parsed Reminder Preview Card */}
          {parsedPreview ? (
            <div className="rounded-2xl border border-white/[0.14] bg-white/[0.04] p-4">
              <p className="text-xs font-medium text-emerald-300">Parsed preview</p>
              <div className="mt-2.5 flex items-center gap-3.5">
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
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-300">
                    <span className="inline-flex items-center gap-1 font-mono font-semibold text-white tabular-nums">
                      {parsedPreview.isAlarm ? (
                        <AlarmClock className="h-3.5 w-3.5 text-red-400" />
                      ) : (
                        <Bell className="h-3.5 w-3.5 text-sky-300" />
                      )}
                      {formatTimeDisplay(parsedPreview.time, timeFormat)}
                    </span>
                    <span aria-hidden="true" className="text-slate-500">·</span>
                    <span>{scheduleLabel}</span>
                    <span aria-hidden="true" className="text-slate-500">·</span>
                    <span>{parsedPreview.isAlarm ? 'Loud Alarm' : 'Notification'}</span>
                    {parsedPreview.tag && (
                      <>
                        <span aria-hidden="true" className="text-slate-500">·</span>
                        <span>#{parsedPreview.tag}</span>
                      </>
                    )}
                    {parsedPreview.priority === 'high' && (
                      <>
                        <span aria-hidden="true" className="text-slate-500">·</span>
                        <span className="font-semibold text-amber-300">{priorityLabel}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs font-medium text-slate-400">Example phrases you can say</p>
              <div className="mt-2 flex flex-col gap-1.5">
                {VOICE_EXAMPLE_PHRASES.map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() => onTranscriptChange(phrase)}
                    className="flex min-h-[44px] items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 text-left text-xs text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                  >
                    <span className="truncate">&ldquo;{phrase}&rdquo;</span>
                    <span className="ml-2 shrink-0 text-[11px] font-semibold text-sky-300">Try</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Thumb-Zone Action Footer */}
        <div className="flex flex-col gap-2.5 border-t border-white/[0.08] px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:py-4">
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
                <span>Edit Details</span>
              </button>
            )}
          </div>

          <button
            type="button"
            disabled={!canSave}
            onClick={() => {
              if (!canSave) return;
              onConfirmSave(transcript.trim());
              onClose();
            }}
            className="liquid-primary-btn inline-flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-xl px-5 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-45 sm:w-auto sm:flex-1 whitespace-nowrap"
          >
            <Check className="h-4 w-4" />
            <span>Save Reminder</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(sheetContent, document.body) : sheetContent;
};
