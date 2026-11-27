import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Check, Download, Mic, Radio, Sparkles, Square, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import type { LiveAssistantSource } from '../lib/liveAssistant';
import { buildAssistantDeepLink } from '../lib/assistantIntents';
import { isNativeApp } from '../lib/nativeBridge';
import { detectDeviceOs, getPlatformAssistantProfile } from '../lib/platform';
import type { TriggerIslandFn } from '../types';
import { IosSwitch } from './IosSwitch';

export interface LiveVoiceController {
  isSupported: boolean;
  siriConnected: boolean;
  googleAssistantConnected: boolean;
  handsFreeEnabled: boolean;
  oneTapActive: boolean;
  activeSource: LiveAssistantSource;
  awaitingFollowUp: boolean;
  liveTranscript: string;
  errorMessage: string | null;
  activateSiriLive: () => void;
  activateGoogleAssistantLive: () => void;
  activateNeutralVoiceLive: () => void;
  finishOneTapSpeakNow: () => void;
  cancelOneTapSpeak: () => void;
  setHandsFree: (enabled: boolean, preferredSource?: LiveAssistantSource) => void;
  toggleHandsFree: (preferredSource?: LiveAssistantSource) => void;
}

interface VoiceShortcutsModalProps {
  open: boolean;
  liveAssistant: LiveVoiceController;
  onExecuteAssistantUrl: (url: string) => void;
  onTriggerIsland?: TriggerIslandFn;
  onClose: () => void;
}

const INSTANT_EXAMPLES: Array<{ label: string; phrase: string }> = [
  { label: 'Medicine 9 PM', phrase: 'Take medicine at 9pm' },
  { label: 'Alarm 6:30 AM', phrase: 'Wake me up tomorrow at 6:30am' },
  { label: 'Call Mom (30m)', phrase: 'Call Mom in 30 minutes' },
  { label: 'Report 5 PM', phrase: 'Submit report at 5pm' },
];

export const VoiceShortcutsModal: React.FC<VoiceShortcutsModalProps> = ({
  open,
  liveAssistant,
  onExecuteAssistantUrl,
  onTriggerIsland,
  onClose,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const native = isNativeApp();
  const deviceOs = useMemo(() => detectDeviceOs(), []);
  const profile = useMemo(() => getPlatformAssistantProfile(deviceOs), [deviceOs]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const currentOrigin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://reminder.makeuperfect.in';

  const handlePrimaryActivate = () => {
    if (deviceOs === 'ios') {
      liveAssistant.activateSiriLive();
    } else if (deviceOs === 'android') {
      liveAssistant.activateGoogleAssistantLive();
    } else {
      liveAssistant.activateNeutralVoiceLive();
    }
    onClose();
  };

  const handleOneTapExample = (phrase: string) => {
    const assistant: 'siri' | 'google-assistant' =
      deviceOs === 'ios' ? 'siri' : 'google-assistant';
    const url = buildAssistantDeepLink(
      currentOrigin,
      {
        id: deviceOs === 'ios' ? 'sc_siri_add' : 'sc_gassist_add',
        assistant,
        action: 'add',
        defaultAlertMode: 'auto',
        autoSave: true,
      },
      phrase
    );
    onExecuteAssistantUrl(url);
    onClose();
  };

  const handleInstallForAssistant = async () => {
    const accepted = await install();
    if (accepted) {
      onTriggerIsland?.('success', {
        title: 'App Installed',
        message: 'Home-screen shortcut is now ready',
      });
    }
  };

  const isConnected =
    deviceOs === 'ios'
      ? liveAssistant.siriConnected
      : deviceOs === 'android'
        ? liveAssistant.googleAssistantConnected
        : liveAssistant.handsFreeEnabled;

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={profile.sectionTitle}
      onClick={onClose}
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-elevated animate-sheet-up flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl"
      >
        <div className="pt-2.5 sm:hidden">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.1] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold text-white">{profile.sectionTitle}</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              No setup needed — tap once and speak to auto-save with EMO confirmation.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close voice assistant"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.05] text-slate-300 hover:bg-white/[0.12] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 overflow-y-auto px-5 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6">
          {/* Active Live Listening Feedback Card */}
          {liveAssistant.oneTapActive && (
            <div className="rounded-2xl border border-sky-400/45 bg-sky-500/15 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 animate-pulse items-center justify-center rounded-full bg-[#FF453A] text-white shadow-[0_0_20px_rgba(255,69,58,0.55)]">
                    <Mic className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white">{profile.listeningTitle}</p>
                    <p className="truncate text-xs text-sky-200/90">
                      {liveAssistant.liveTranscript ||
                        'Say e.g. “Take medicine at 9pm” or “Wake me at 6:30am”'}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {liveAssistant.liveTranscript && (
                    <button
                      type="button"
                      onClick={() => {
                        liveAssistant.finishOneTapSpeakNow();
                        onClose();
                      }}
                      className="liquid-primary-btn ios-spring-press flex min-h-[40px] items-center gap-1 rounded-xl px-3 text-xs font-semibold text-white"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Save</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={liveAssistant.cancelOneTapSpeak}
                    aria-label="Stop listening"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Notice if Mic Blocked */}
          {liveAssistant.errorMessage && (
            <div className="rounded-2xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
              {liveAssistant.errorMessage}
            </div>
          )}

          {/* Single OS-Specific 1-Tap Assistant Button */}
          <button
            type="button"
            onClick={handlePrimaryActivate}
            className={`ios-spring-press group flex min-h-[76px] w-full items-center gap-3.5 rounded-2xl border p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] transition-all hover:brightness-110 ${
              deviceOs === 'ios'
                ? 'border-indigo-400/35 bg-gradient-to-br from-indigo-500/25 via-sky-500/20 to-fuchsia-500/20 hover:border-indigo-300/55'
                : deviceOs === 'android'
                  ? 'border-emerald-400/35 bg-gradient-to-br from-sky-500/20 via-emerald-500/20 to-amber-500/15 hover:border-emerald-300/55'
                  : 'border-sky-400/35 bg-gradient-to-br from-sky-500/22 via-blue-500/15 to-cyan-500/20 hover:border-sky-300/55'
            }`}
          >
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white ${
                deviceOs === 'ios'
                  ? 'bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-[0_8px_20px_rgba(99,102,241,0.45)]'
                  : deviceOs === 'android'
                    ? 'bg-gradient-to-br from-sky-500 via-emerald-500 to-amber-400 shadow-[0_8px_20px_rgba(16,185,129,0.4)]'
                    : 'bg-gradient-to-br from-[#0A84FF] to-cyan-500 shadow-[0_8px_20px_rgba(10,132,255,0.4)]'
              }`}
            >
              {deviceOs === 'android' ? (
                <Sparkles className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-base font-bold text-white">
                  {profile.buttonLabel}
                </span>
                {isConnected && <Check className="h-4 w-4 shrink-0 text-emerald-400" />}
              </div>
              <p className="mt-0.5 text-xs text-slate-300">
                Tap once &amp; speak — auto-saves live with EMO confirmation
              </p>
            </div>
          </button>

          {/* 1-Tap Hands-Free Wake-Word Toggle */}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.12] bg-white/[0.04] p-4">
            <div className="flex min-w-0 items-start gap-3">
              <span
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                  liveAssistant.handsFreeEnabled
                    ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-300'
                    : 'border-white/[0.12] bg-white/[0.06] text-slate-300'
                }`}
              >
                <Radio className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">{profile.handsFreeTitle}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                  Keep listening while reminderme is open — just say{' '}
                  <strong className="text-slate-200">{profile.wakeExample}</strong>.
                </p>
              </div>
            </div>
            <IosSwitch
              checked={liveAssistant.handsFreeEnabled}
              onChange={(next) => liveAssistant.setHandsFree(next, profile.source)}
              ariaLabel={`Enable ${profile.handsFreeTitle}`}
              accent="emerald"
            />
          </div>

          {/* 1-Tap Instant Demo Commands */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
            <p className="text-xs font-semibold text-slate-300">
              Try a 1-tap instant command (saves right now with EMO eyes)
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {INSTANT_EXAMPLES.map((item) => (
                <button
                  key={item.phrase}
                  type="button"
                  onClick={() => handleOneTapExample(item.phrase)}
                  className="ios-spring-press min-h-[44px] rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 py-2 text-left transition-colors hover:border-sky-400/40 hover:bg-sky-500/15"
                >
                  <p className="truncate text-xs font-semibold text-white">{item.label}</p>
                  <p className="truncate text-[11px] text-slate-400">“{item.phrase}”</p>
                </button>
              ))}
            </div>
          </div>

          {/* Optional 1-Tap App Install */}
          {!native && !isInstalled && isInstallable && (
            <button
              type="button"
              onClick={() => void handleInstallForAssistant()}
              className="ios-spring-press flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-4 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25"
            >
              <Download className="h-4 w-4" />
              <span>Install App on Home Screen</span>
            </button>
          )}

          <p className="text-center text-[11px] leading-relaxed text-slate-500">
            {profile.footerHint}
          </p>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};
