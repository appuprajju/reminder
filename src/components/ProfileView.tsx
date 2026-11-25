import React, { useRef, useState } from 'react';
import {
  BellRing,
  Cloud,
  Download,
  ExternalLink,
  FileJson,
  Lock,
  LogIn,
  LogOut,
  Play,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
  Volume2,
  Zap,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { CLOUDFLARE_EDGE_URL, api, type BackendHealthResult } from '../lib/api';
import {
  ALARM_SOUNDS,
  NOTIF_SOUNDS,
  deleteCustomRingtone,
  playAlarmCycle,
  playNotificationChime,
  saveCustomRingtone,
} from '../lib/audio';
import { isNativeApp, openExactAlarmSettings } from '../lib/nativeBridge';
import type { AlarmSoundId, DeliveryHealth, NotifSoundId, UserPreferences, UserProfile } from '../types';

interface ProfileViewProps {
  user: UserProfile | null;
  isOnline: boolean;
  syncStatus: string;
  prefs: UserPreferences;
  deliveryHealth: DeliveryHealth;
  onUpdatePrefs: (patch: Partial<UserPreferences>) => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onSyncNow: () => void;
  onEnableNotifications: () => void;
  onSchedule10sTest: () => void;
  onInstantAlarmTest: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onOpenPrivacy: () => void;
  onOpenPlayStoreKit: () => void;
  onReplayIntro: () => void;
  onToast: (msg: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  isOnline,
  syncStatus,
  prefs,
  deliveryHealth,
  onUpdatePrefs,
  onOpenAuth,
  onSignOut,
  onSyncNow,
  onEnableNotifications,
  onSchedule10sTest,
  onInstantAlarmTest,
  onExportBackup,
  onImportBackup,
  onOpenPrivacy,
  onOpenPlayStoreKit,
  onReplayIntro,
  onToast,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<BackendHealthResult | null>(null);
  const [pingError, setPingError] = useState<string | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const handleTestBackendSpeed = async (overrideUrl?: string) => {
    setPinging(true);
    setPingError(null);
    try {
      const result = await api.ping(overrideUrl !== undefined ? overrideUrl : prefs.serverBaseUrl);
      setPingResult(result);
    } catch (err: unknown) {
      setPingResult(null);
      setPingError(err instanceof Error ? err.message : 'Backend unreachable');
    } finally {
      setPinging(false);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const name = await saveCustomRingtone(file);
      onUpdatePrefs({ customAudioName: name, defaultAlarmSound: 'custom' });
      onToast(`Saved custom ringtone: ${name}`);
    } catch {
      onToast('Could not store selected audio file.');
    }
    e.target.value = '';
  };

  const handleDeleteCustomAudio = async () => {
    await deleteCustomRingtone();
    onUpdatePrefs({
      customAudioName: null,
      defaultAlarmSound: prefs.defaultAlarmSound === 'custom' ? 'radar' : prefs.defaultAlarmSound,
    });
    onToast('Removed custom ringtone');
  };

  const platformLabel =
    deliveryHealth.platform === 'android-native'
      ? 'Android Native App (Capacitor)'
      : deliveryHealth.platform === 'ios-native'
        ? 'iOS Native App (Capacitor)'
        : deliveryHealth.platform === 'pwa-standalone'
          ? 'Installed App (Standalone)'
          : 'Web Preview';

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
      {/* Left Column: Account + OS Background & Lock-Screen Delivery Health */}
      <div className="flex flex-col gap-6 lg:col-span-6">
        {/* Account & Sync Card */}
        <section className="glass-surface rounded-3xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-400">Account &amp; Sync</p>
              <h2 className="mt-1 truncate text-lg font-bold text-slate-50">
                {user ? user.name : 'Offline Guest Mode'}
              </h2>
              <p className="mt-0.5 truncate text-xs text-slate-400">
                {user
                  ? `${user.email} · ${isOnline ? syncStatus : 'Offline (queued)'}`
                  : 'All schedules saved on device · Sign in for cloud push & sync'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {user ? (
                <>
                  <button
                    type="button"
                    onClick={onSyncNow}
                    aria-label="Sync now"
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-200 hover:bg-white/[0.1]"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.1] whitespace-nowrap"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#2F80FF] px-4 text-xs font-semibold text-white hover:bg-[#256FE6] whitespace-nowrap"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>

          {/* Serverless Cloudflare Edge / Custom Backend Selector */}
          <div className="mt-4 border-t border-white/[0.08] pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                <Cloud className="h-3.5 w-3.5 text-sky-400" />
                Cloud Sync Backend (Cloudflare Edge or Custom)
              </span>
              <button
                type="button"
                disabled={pinging}
                onClick={() => handleTestBackendSpeed()}
                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-sky-400/25 bg-sky-400/10 px-2.5 text-xs font-semibold text-sky-300 transition-colors hover:bg-sky-400/20 disabled:opacity-60"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>{pinging ? 'Testing…' : 'Test Speed'}</span>
              </button>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onUpdatePrefs({ serverBaseUrl: '' });
                  setPingResult(null);
                  setPingError(null);
                  onToast('Switched to Auto (Same Origin) backend');
                }}
                className={`min-h-[40px] rounded-xl border px-3 text-xs font-semibold transition-colors ${
                  !prefs.serverBaseUrl
                    ? 'border-sky-400/50 bg-sky-500/20 text-white'
                    : 'border-white/[0.08] bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]'
                }`}
              >
                Auto (Same Origin)
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdatePrefs({ serverBaseUrl: CLOUDFLARE_EDGE_URL });
                  setPingResult(null);
                  setPingError(null);
                  onToast('Switched to Cloudflare Edge Worker (api.makeuperfect.in)');
                }}
                className={`min-h-[40px] rounded-xl border px-3 text-xs font-semibold transition-colors ${
                  prefs.serverBaseUrl === CLOUDFLARE_EDGE_URL
                    ? 'border-sky-400/50 bg-sky-500/20 text-white'
                    : 'border-white/[0.08] bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]'
                }`}
              >
                Cloudflare Edge
              </button>
            </div>

            <label className="mt-2.5 block">
              <span className="sr-only">Cloud Sync Server URL</span>
              <input
                type="url"
                value={prefs.serverBaseUrl}
                onChange={(e) => {
                  onUpdatePrefs({ serverBaseUrl: e.target.value });
                  setPingResult(null);
                  setPingError(null);
                }}
                placeholder="https://api.makeuperfect.in (blank = same origin)"
                className="min-h-[44px] w-full rounded-xl border border-white/[0.08] bg-[#060812]/70 px-3.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-[#2F80FF] focus:outline-none"
              />
            </label>

            {pingResult && (
              <p className="mt-2 flex items-center justify-between rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                <span className="font-semibold">Connected · {pingResult.engine}</span>
                <span className="font-mono font-bold tabular-nums">{pingResult.latencyMs}ms</span>
              </p>
            )}
            {pingError && (
              <p className="mt-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {pingError}
              </p>
            )}
          </div>
        </section>

        {/* Closed-App & Lock-Screen OS Delivery Diagnostics */}
        <section className="glass-surface rounded-3xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-50">
                Background &amp; Lock-Screen Delivery
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Closed-app alarms rely on Android OS AlarmManager and server-side push
                infrastructure—never keeping the foreground app alive.
              </p>
            </div>
            <ShieldCheck className="h-5 w-5 shrink-0 text-[#60A5FA]" />
          </div>

          <dl className="mt-4 divide-y divide-white/[0.06] text-xs">
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-slate-400">Runtime Mode</dt>
              <dd className="font-medium text-slate-100">{platformLabel}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-slate-400">OS Notifications</dt>
              <dd
                className={`font-semibold ${
                  deliveryHealth.notificationPermission === 'granted'
                    ? 'text-emerald-400'
                    : deliveryHealth.notificationPermission === 'denied'
                      ? 'text-red-400'
                      : 'text-amber-300'
                }`}
              >
                {deliveryHealth.notificationPermission === 'granted'
                  ? 'Granted'
                  : deliveryHealth.notificationPermission === 'denied'
                    ? 'Blocked in Settings'
                    : 'Action Needed'}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-slate-400">Scheduled OS / Push Alerts</dt>
              <dd className="font-mono font-semibold text-slate-100 tabular-nums">
                {deliveryHealth.osScheduledCount} active
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-slate-400">Cloud Push Backup</dt>
              <dd className="font-medium text-slate-200">
                {deliveryHealth.pushSubscribed
                  ? `Subscribed (${Math.max(1, deliveryHealth.pushDevices)} device)`
                  : 'Not subscribed yet'}
              </dd>
            </div>
          </dl>

          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={onEnableNotifications}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#2F80FF] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#256FE6]"
            >
              <BellRing className="h-4 w-4" />
              <span>Enable OS &amp; Push Alerts</span>
            </button>
            <button
              type="button"
              onClick={onSchedule10sTest}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.05] px-4 text-xs font-semibold text-slate-100 transition-colors hover:bg-white/[0.1]"
            >
              <Lock className="h-4 w-4 text-amber-300" />
              <span>10s Lock-Screen Test</span>
            </button>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onInstantAlarmTest}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/[0.08]"
            >
              <Play className="h-3.5 w-3.5 text-red-400" />
              <span>Preview Ringing Screen</span>
            </button>
            {isNativeApp() && (
              <button
                type="button"
                onClick={() => openExactAlarmSettings()}
                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/[0.08]"
              >
                <Smartphone className="h-3.5 w-3.5 text-[#60A5FA]" />
                <span>Exact Alarm Settings</span>
              </button>
            )}
          </div>
        </section>

        {/* Play Store Release Kit & Privacy Policy */}
        <section className="glass-surface rounded-3xl p-5">
          <h2 className="text-base font-bold text-slate-50">Play Store Release &amp; Compliance</h2>
          <p className="mt-1 text-xs text-slate-400">
            Package ID <span className="font-mono text-slate-200">in.makeuperfect.reminderme</span> ·
            Built by Prajwal M &lt;/yourstudio&gt;
          </p>

          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={onOpenPlayStoreKit}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.07] px-4 text-xs font-semibold text-slate-100 hover:bg-white/[0.14]"
            >
              <Smartphone className="h-4 w-4 text-emerald-400" />
              <span>Play Store Launch Kit</span>
            </button>
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.07] px-4 text-xs font-semibold text-slate-100 hover:bg-white/[0.14]"
            >
              <ExternalLink className="h-4 w-4 text-sky-300" />
              <span>Privacy Policy</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onReplayIntro}
            className="mt-2.5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-sky-400/25 bg-gradient-to-r from-[#0A84FF]/25 via-[#BF5AF2]/20 to-[#0A84FF]/25 px-4 text-xs font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] transition-colors hover:brightness-110"
          >
            <Play className="h-3.5 w-3.5 text-sky-300" />
            <span>Watch Developer Intro</span>
          </button>

          {/* In-App PWA Install Prompt (auto-hidden when already standalone/native) */}
          {!isInstalled && (isInstallable || isIOS) && (
            <div className="mt-3 border-t border-white/[0.08] pt-3">
              {isInstallable ? (
                <button
                  type="button"
                  onClick={() => install()}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/20 px-4 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30"
                >
                  <Download className="h-4 w-4" />
                  <span>Install App on Home Screen</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowIOSGuide((s) => !s)}
                    className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 text-xs font-semibold text-slate-200 hover:bg-white/[0.08]"
                  >
                    <Download className="h-4 w-4" />
                    <span>Install on iPhone / iPad</span>
                  </button>
                  {showIOSGuide && (
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                      In Safari, tap <strong className="text-slate-200">Share</strong> then{' '}
                      <strong className="text-slate-200">Add to Home Screen</strong> to run
                      reminderme full-screen with push notifications.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Right Column: Audio & Ringtone Engine + Preferences + Backup */}
      <div className="flex flex-col gap-6 lg:col-span-6">
        <section className="glass-surface rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-50">Sounds &amp; Alarm Ringtones</h2>
            <Volume2 className="h-4 w-4 text-slate-400" />
          </div>

          {/* Default Alarm Ringtone */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <label htmlFor="pref-alarm-sound" className="text-xs font-medium text-slate-400">
                Default Alarm Ringtone
              </label>
              <button
                type="button"
                onClick={() => playAlarmCycle(prefs.defaultAlarmSound)}
                className="min-h-[36px] rounded-lg px-2.5 text-xs font-semibold text-[#60A5FA] hover:bg-white/[0.06]"
              >
                Preview
              </button>
            </div>
            <select
              id="pref-alarm-sound"
              value={prefs.defaultAlarmSound}
              onChange={(e) =>
                onUpdatePrefs({ defaultAlarmSound: e.target.value as AlarmSoundId })
              }
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.08] bg-[#060812]/80 px-3.5 text-sm text-slate-100 focus:border-[#2F80FF] focus:outline-none"
            >
              {ALARM_SOUNDS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} — {s.subtitle}
                </option>
              ))}
              {prefs.customAudioName && (
                <option value="custom">Device Audio: {prefs.customAudioName}</option>
              )}
            </select>
          </div>

          {/* Custom Device Audio File Picker */}
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-200">Custom Device Song / MP3</p>
              <p className="truncate text-xs text-slate-500">
                {prefs.customAudioName || 'Select any audio file stored on your device'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => audioInputRef.current?.click()}
                className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 text-xs font-semibold text-slate-100 hover:bg-white/[0.1]"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Choose</span>
              </button>
              {prefs.customAudioName && (
                <button
                  type="button"
                  onClick={handleDeleteCustomAudio}
                  aria-label="Remove custom ringtone"
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-red-400 hover:bg-red-500/15"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioUpload}
              className="hidden"
            />
          </div>

          {/* Notification Chime */}
          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <div className="flex items-center justify-between">
              <label htmlFor="pref-notif-sound" className="text-xs font-medium text-slate-400">
                Gentle Notification Chime
              </label>
              <button
                type="button"
                onClick={() => playNotificationChime(prefs.defaultNotifSound)}
                className="min-h-[36px] rounded-lg px-2.5 text-xs font-semibold text-[#60A5FA] hover:bg-white/[0.06]"
              >
                Preview
              </button>
            </div>
            <select
              id="pref-notif-sound"
              value={prefs.defaultNotifSound}
              onChange={(e) =>
                onUpdatePrefs({ defaultNotifSound: e.target.value as NotifSoundId })
              }
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.08] bg-[#060812]/80 px-3.5 text-sm text-slate-100 focus:border-[#2F80FF] focus:outline-none"
            >
              {NOTIF_SOUNDS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Ring Duration */}
          <div className="mt-4">
            <label htmlFor="pref-duration" className="text-xs font-medium text-slate-400">
              In-App Alarm Ring Duration
            </label>
            <select
              id="pref-duration"
              value={prefs.alarmDurationSec}
              onChange={(e) => onUpdatePrefs({ alarmDurationSec: Number(e.target.value) })}
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.08] bg-[#060812]/80 px-3.5 text-sm text-slate-100 focus:border-[#2F80FF] focus:outline-none"
            >
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds (Default)</option>
              <option value={60}>1 minute</option>
              <option value={120}>2 minutes</option>
              <option value={0}>Continuous until dismissed</option>
            </select>
          </div>
        </section>

        {/* General Preferences & JSON Backup */}
        <section className="glass-surface rounded-3xl p-5">
          <h2 className="text-base font-bold text-slate-50">App Preferences &amp; Data</h2>

          <div className="mt-4 divide-y divide-white/[0.06]">
            <label className="flex min-h-[52px] cursor-pointer items-center justify-between gap-3 py-2">
              <span className="text-sm text-slate-200">Haptic feedback &amp; vibration</span>
              <input
                type="checkbox"
                checked={prefs.vibrate}
                onChange={(e) => onUpdatePrefs({ vibrate: e.target.checked })}
                className="h-5 w-5 accent-[#2F80FF]"
              />
            </label>
            <label className="flex min-h-[52px] cursor-pointer items-center justify-between gap-3 py-2">
              <span className="text-sm text-slate-200">Auto-delete completed one-day tasks</span>
              <input
                type="checkbox"
                checked={prefs.autoDeleteCompleted}
                onChange={(e) => onUpdatePrefs({ autoDeleteCompleted: e.target.checked })}
                className="h-5 w-5 accent-[#2F80FF]"
              />
            </label>
            <div className="flex min-h-[52px] items-center justify-between gap-3 py-2">
              <span className="text-sm text-slate-200">Clock format</span>
              <div className="inline-flex rounded-xl border border-white/[0.08] bg-[#060812] p-1">
                {(['12h', '24h'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => onUpdatePrefs({ timeFormat: fmt })}
                    className={`min-h-[34px] rounded-lg px-3 text-xs font-semibold ${
                      prefs.timeFormat === fmt
                        ? 'bg-[#2F80FF] text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-white/[0.08] pt-4">
            <button
              type="button"
              onClick={onExportBackup}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-xs font-semibold text-slate-200 hover:bg-white/[0.09]"
            >
              <FileJson className="h-4 w-4 text-[#60A5FA]" />
              <span>Export Backup</span>
            </button>
            <button
              type="button"
              onClick={() => backupInputRef.current?.click()}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-xs font-semibold text-slate-200 hover:bg-white/[0.09]"
            >
              <Upload className="h-4 w-4 text-emerald-400" />
              <span>Import Backup</span>
            </button>
            <input
              ref={backupInputRef}
              type="file"
              accept=".json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImportBackup(file);
                e.target.value = '';
              }}
              className="hidden"
            />
          </div>
        </section>
      </div>
    </div>
  );
};
