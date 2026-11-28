import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlarmClock,
  Check,
  Copy,
  Mic,
  Pin,
  PinOff,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { APP_LANGUAGES, getSpeechRecognitionLocale } from '../lib/indianLanguages';
import { triggerHaptic } from '../lib/nativeBridge';
import { deriveNoteTitle } from '../lib/notes';
import type { VoiceNote } from '../types';

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getSpeechCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

interface VoiceNoteSheetProps {
  open: boolean;
  editing: VoiceNote | null;
  autoStartListening?: boolean;
  defaultLanguage?: string;
  vibrate: boolean;
  onSave: (draft: {
    id?: string;
    title: string;
    content: string;
    pinned: boolean;
    durationSec?: number;
  }) => void;
  onDelete?: (id: string) => void;
  onConvertToReminder?: (note: { title: string; content: string }) => void;
  onCopied?: () => void;
  onClose: () => void;
}

export const VoiceNoteSheet: React.FC<VoiceNoteSheetProps> = ({
  open,
  editing,
  autoStartListening = false,
  defaultLanguage = 'en-IN',
  vibrate,
  onSave,
  onDelete,
  onConvertToReminder,
  onCopied,
  onClose,
}) => {
  const isSpeechSupported = useMemo(() => getSpeechCtor() !== null, []);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [interimText, setInterimText] = useState('');
  const [pinned, setPinned] = useState(false);
  const [lang, setLang] = useState(defaultLanguage);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedState, setCopiedState] = useState(false);

  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const shouldKeepListeningRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const langRef = useRef(lang);
  langRef.current = lang;

  const stopDictation = useCallback((abort = false) => {
    shouldKeepListeningRef.current = false;
    setIsRecording(false);
    setInterimText('');
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const rec = recRef.current;
    if (!rec) return;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    recRef.current = null;
    try {
      if (abort) rec.abort();
      else rec.stop();
    } catch {
      // ignore
    }
  }, []);

  const startDictation = useCallback(() => {
    const Ctor = getSpeechCtor();
    if (!Ctor) {
      setErrorMsg('Voice dictation requires Chrome, Edge, or Safari. You can still type your note below.');
      return;
    }

    stopDictation(true);
    setErrorMsg(null);
    shouldKeepListeningRef.current = true;
    setIsRecording(true);
    triggerHaptic('light', vibrate);

    timerRef.current = window.setInterval(() => {
      setRecordSeconds((s) => s + 1);
    }, 1000);

    const launch = () => {
      if (!shouldKeepListeningRef.current) return;
      try {
        const rec = new Ctor();
        rec.lang = getSpeechRecognitionLocale(langRef.current);
        rec.continuous = true;
        rec.interimResults = true;
        rec.maxAlternatives = 1;
        recRef.current = rec;

        rec.onresult = (event) => {
          let finalChunk = '';
          let interimChunk = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const res = event.results[i];
            const piece = res?.[0]?.transcript || '';
            if (res?.isFinal) {
              finalChunk += `${piece} `;
            } else {
              interimChunk += `${piece} `;
            }
          }

          if (finalChunk.trim()) {
            const cleanFinal = finalChunk.trim();
            setContent((prev) => {
              const sep = prev.trim().length > 0 ? (/[.!?]$/.test(prev.trim()) ? ' ' : ' ') : '';
              return `${prev.trim()}${sep}${cleanFinal}`;
            });
          }
          setInterimText(interimChunk.trim());
        };

        rec.onerror = (event) => {
          const code = event?.error || 'unknown';
          if (code === 'no-speech' || code === 'aborted') return;
          if (code === 'not-allowed' || code === 'service-not-allowed') {
            setErrorMsg('Microphone permission blocked. Allow mic access in your browser bar.');
            stopDictation(true);
          } else {
            setErrorMsg('Voice dictation paused. Tap the mic to continue speaking.');
            stopDictation(true);
          }
        };

        rec.onend = () => {
          recRef.current = null;
          setInterimText('');
          if (shouldKeepListeningRef.current) {
            window.setTimeout(launch, 220);
          }
        };

        rec.start();
      } catch {
        setErrorMsg('Could not access microphone. Tap the mic button to try again.');
        stopDictation(true);
      }
    };

    launch();
  }, [stopDictation, vibrate]);

  useEffect(() => {
    if (!open) {
      stopDictation(true);
      return;
    }
    if (editing) {
      setTitle(editing.title);
      setContent(editing.content);
      setPinned(editing.pinned);
      setRecordSeconds(editing.durationSec || 0);
    } else {
      setTitle('');
      setContent('');
      setPinned(false);
      setRecordSeconds(0);
    }
    setLang(defaultLanguage);
    setInterimText('');
    setErrorMsg(null);
    setCopiedState(false);

    if (autoStartListening && !editing && isSpeechSupported) {
      const id = window.setTimeout(() => startDictation(), 160);
      return () => window.clearTimeout(id);
    }
  }, [autoStartListening, defaultLanguage, editing, isSpeechSupported, open, startDictation, stopDictation]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopDictation(true);
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, open, stopDictation]);

  if (!open) return null;

  const fullContent = [content.trim(), interimText.trim()].filter(Boolean).join(' ');
  const canSave = fullContent.length > 0 || title.trim().length > 0;

  const formatTimer = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    stopDictation(true);
    const finalBody = fullContent || title.trim();
    onSave({
      id: editing?.id,
      title: deriveNoteTitle(title, finalBody),
      content: finalBody,
      pinned,
      durationSec: recordSeconds > 0 ? recordSeconds : editing?.durationSec,
    });
    onClose();
  };

  const handleCopy = async () => {
    const text = [title.trim(), fullContent].filter(Boolean).join('\n\n');
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedState(true);
      onCopied?.();
      window.setTimeout(() => setCopiedState(false), 1800);
    } catch {
      // ignore
    }
  };

  const sheet = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editing ? 'Edit voice note' : 'New voice note'}
      onClick={() => {
        stopDictation(true);
        onClose();
      }}
      className="fixed inset-0 z-[85] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <form
        onSubmit={handleSave}
        onClick={(e) => e.stopPropagation()}
        className="glass-elevated animate-sheet-up flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl"
      >
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold text-white">
              {editing ? 'Voice Note' : 'Voice Note Maker'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Speak naturally to capture ideas, meeting points, or lists.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPinned((p) => !p)}
              aria-label={pinned ? 'Unpin note' : 'Pin note'}
              aria-pressed={pinned}
              className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
                pinned
                  ? 'border-amber-400/45 bg-amber-500/20 text-amber-300'
                  : 'border-white/[0.1] bg-white/[0.04] text-slate-400 hover:bg-white/[0.1] hover:text-white'
              }`}
            >
              {pinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                stopDictation(true);
                onClose();
              }}
              aria-label="Close voice note maker"
              className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-white/[0.08] hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Live Voice Dictation Control Bar */}
          <div
            className={`rounded-2xl border p-4 transition-colors ${
              isRecording
                ? 'border-red-400/45 bg-red-500/12'
                : 'border-white/[0.1] bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => (isRecording ? stopDictation(false) : startDictation())}
                disabled={!isSpeechSupported}
                className={`ios-spring-press flex min-h-[48px] items-center gap-2.5 rounded-2xl px-4 text-sm font-semibold text-white transition-all disabled:opacity-45 ${
                  isRecording
                    ? 'bg-[#FF453A] shadow-[0_8px_24px_rgba(255,69,58,0.45)]'
                    : 'liquid-primary-btn'
                }`}
              >
                {isRecording ? (
                  <>
                    <Square className="h-4 w-4 fill-current" />
                    <span>Stop Dictating</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" />
                    <span>{content.trim() ? 'Speak More' : 'Start Dictating'}</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                {isRecording && (
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-red-300 tabular-nums">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
                    {formatTimer(recordSeconds)}
                  </span>
                )}
                <select
                  aria-label="Dictation language"
                  value={lang}
                  onChange={(e) => {
                    setLang(e.target.value);
                    if (isRecording) {
                      stopDictation(true);
                      window.setTimeout(() => startDictation(), 150);
                    }
                  }}
                  className="min-h-[40px] max-w-[190px] rounded-xl border border-white/[0.12] bg-[#060812]/80 px-2.5 text-xs font-semibold text-slate-200 focus:border-[#0A84FF] focus:outline-none"
                >
                  {APP_LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nativeName === l.name ? l.name : `${l.nativeName} · ${l.name}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {interimText && (
              <p className="mt-3 rounded-xl border border-sky-400/25 bg-sky-500/10 px-3 py-2 text-xs text-sky-200 italic">
                Listening: “{interimText}…”
              </p>
            )}

            {errorMsg && (
              <p className="mt-3 rounded-xl border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                {errorMsg}
              </p>
            )}
          </div>

          {/* Editable Note Title */}
          <label className="block">
            <span className="text-xs font-medium text-slate-400">Title (auto-generated if blank)</span>
            <input
              type="text"
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting notes, Grocery list, Quick idea..."
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-base text-white placeholder:text-slate-500 focus:border-[#0A84FF] focus:outline-none sm:text-sm"
            />
          </label>

          {/* Editable Multi-Line Note Body */}
          <label className="block">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Note Content</span>
              <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                {fullContent.length} chars
              </span>
            </div>
            <textarea
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tap Start Dictating above or type your note here..."
              className="mt-1.5 w-full resize-none rounded-2xl border border-white/[0.1] bg-[#060812]/80 p-3.5 text-base leading-relaxed text-white placeholder:text-slate-500 focus:border-[#0A84FF] focus:outline-none sm:text-sm"
            />
          </label>

          {/* Quick Utility Actions */}
          {canSave && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="ios-spring-press inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.05] px-3.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.1]"
              >
                {copiedState ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-300" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>

              {onConvertToReminder && (
                <button
                  type="button"
                  onClick={() => {
                    stopDictation(true);
                    const finalBody = fullContent || title.trim();
                    onConvertToReminder({
                      title: deriveNoteTitle(title, finalBody),
                      content: finalBody,
                    });
                    onClose();
                  }}
                  className="ios-spring-press inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-sky-400/30 bg-sky-500/15 px-3.5 text-xs font-semibold text-sky-100 hover:bg-sky-500/25"
                >
                  <AlarmClock className="h-3.5 w-3.5 text-sky-300" />
                  <span>Turn into Reminder</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="flex items-center justify-between gap-2.5 border-t border-white/[0.08] px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:py-4">
          {editing && onDelete ? (
            <button
              type="button"
              onClick={() => {
                stopDictation(true);
                onDelete(editing.id);
                onClose();
              }}
              className="ios-spring-press flex min-h-[48px] items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 text-sm font-semibold text-red-400 hover:bg-red-500/20"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                stopDictation(true);
                onClose();
              }}
              className="ios-spring-press min-h-[48px] rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 text-sm font-semibold text-slate-300 hover:bg-white/[0.08]"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={!canSave}
            className="liquid-primary-btn ios-spring-press min-h-[48px] flex-1 rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-45"
          >
            {editing ? 'Save Note' : 'Save Voice Note'}
          </button>
        </div>
      </form>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(sheet, document.body) : sheet;
};
