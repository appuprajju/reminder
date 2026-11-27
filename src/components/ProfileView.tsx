import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BellRing,
  Calendar,
  CalendarArrowDown,
  Command,
  Download,
  FileJson,
  HelpCircle,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Play,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Square,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  ALARM_SOUNDS,
  NOTIF_SOUNDS,
  deleteCustomRingtone,
  fileToBase64,
  playNotificationChime,
  previewAlarmSound,
  saveCustomRingtone,
  stopPreviewSound,
} from '../lib/audio';
import { FIREBASE_PROJECT_ID } from '../lib/firebase';
import {
  buildGoogleOAuthTestingError,
  mapFirebaseAuthError,
  type ParsedFirebaseAuthError,
} from '../lib/firebaseAuthErrors';
import {
  clearNativeCustomRingtone,
  isNativeApp,
  openExactAlarmSettings,
  syncNativeCustomRingtone,
} from '../lib/nativeBridge';
import { detectDeviceOs, getPlatformAssistantProfile } from '../lib/platform';
import type {
  AlarmSoundId,
  DeliveryHealth,
  NotifSoundId,
  UserPreferences,
  UserProfile,
} from '../types';
import { AuthRecoveryBanner } from './AuthRecoveryBanner';
import { useDynamicIsland } from './DynamicIsland';
import { GoogleSignInButton } from './GoogleSignInButton';
import { IosSwitch } from './IosSwitch';
import { SpringSegmentedControl } from './SpringSegmentedControl';

interface ProfileViewProps {
  user: UserProfile | null;
  isOnline: boolean;
  syncStatus: string;
  prefs: UserPreferences;
  deliveryHealth: DeliveryHealth;
  hasWorkspaceAccess: boolean;
  calendarCount: number;
  gmailCount: number;
  onUpdatePrefs: (patch: Partial<UserPreferences>) => void;
  onGoogleSignIn: () => Promise<unknown>;
  onConnectGoogleWorkspace?: () => Promise<unknown>;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onSyncNow: () => void;
  onRefreshWorkspace: () => void;
  onRequestDailyDigest: () => void;
  onExportAllIcs: () => void;
  onEnableNotifications: () => void;
  onSchedule10sTest: () => void;
  onInstantAlarmTest: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onOpenVoiceShortcuts?: () => void;
  onToast: (msg: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  isOnline,
  syncStatus,
  prefs,
  deliveryHealth,
  hasWorkspaceAccess,
  calendarCount,
  gmailCount,
  onUpdatePrefs,
  onGoogleSignIn,
  onConnectGoogleWorkspace,
  onOpenAuth,
  onSignOut,
  onSyncNow,
  onRefreshWorkspace,
  onRequestDailyDigest,
  onExportAllIcs,
  onEnableNotifications,
  onSchedule10sTest,
  onInstantAlarmTest,
  onExportBackup,
  onImportBackup,
  onOpenVoiceShortcuts,
  onToast,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { onTriggerIsland } = useDynamicIsland();
  const deviceOs = useMemo(() => detectDeviceOs(), []);
  const assistantProfile = useMemo(() => getPlatformAssistantProfile(deviceOs), [deviceOs]);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState<ParsedFirebaseAuthError | null>(null);
  const [previewingAlarm, setPreviewingAlarm] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      stopPreviewSound();
    };
  }, []);

  const toggleOAuthTestingHelp = () => {
    setGoogleAuthError((prev) =>
      prev?.actionKind === 'oauth-testing-mode'
        ? null
        : buildGoogleOAuthTestingError({
            hostname: typeof window !== 'undefined' ? window.location.hostname : '',
            projectId: FIREBASE_PROJECT_ID,
          })
    );
  };

  const runGoogleAuth = async (fn: () => Promise<unknown>) => {
    setGoogleBusy(true);
    setGoogleAuthError(null);
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    try {
      await fn();
    } catch (err) {
      const parsed = mapFirebaseAuthError(err, {
        hostname,
        projectId: FIREBASE_PROJECT_ID,
      });
      if (parsed.code === 'auth/popup-closed-by-user') {
        setGoogleAuthError(
          buildGoogleOAuthTestingError({
            hostname,
            projectId: FIREBASE_PROJECT_ID,
          })
        );
      } else {
        setGoogleAuthError(parsed);
        onTriggerIsland('alert', {
          title: parsed.title,
          message: parsed.message,
        });
      }
    } finally {
      setGoogleBusy(false);
    }
  };

  const handleDirectGoogleSignIn = () => runGoogleAuth(onGoogleSignIn);
  const handleWorkspaceConnect = () =>
    runGoogleAuth(onConnectGoogleWorkspace ?? onGoogleSignIn);

  const handlePreviewAlarmRingtone = async () => {
    if (previewingAlarm) {
      stopPreviewSound();
      setPreviewingAlarm(false);
      return;
    }

    setPreviewingAlarm(true);
    const result = await previewAlarmSound(prefs.defaultAlarmSound, {
      customAudioName: prefs.customAudioName,
      onEnded: () => setPreviewingAlarm(false),
    });

    if (result.error) {
      setPreviewingAlarm(false);
      onTriggerIsland('alert', {
        title: 'Ringtone Preview',
        message: result.error,
      });
      return;
    }

    onTriggerIsland('alert', {
      title: result.usedCustom ? 'Custom Ringtone Preview' : 'Alarm Preview',
      message: `Playing ${result.label}`,
      durationMs: result.usedCustom ? 4200 : 2800,
    });
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopPreviewSound();
    setPreviewingAlarm(false);
    try {
      const name = await saveCustomRingtone(file);
      // Also mirror custom ringtone into native Android storage (up to 8MB) for closed-app lock-screen playback
      if (file.size <= 8 * 1024 * 1024) {
        try {
          const b64 = await fileToBase64(file);
          await syncNativeCustomRingtone(name, b64);
        } catch {
          // ignore native mirror failure
        }
      }
      onUpdatePrefs({ customAudioName: name, defaultAlarmSound: 'custom' });
      onTriggerIsland('success', {
        title: 'Custom Ringtone Ready',
        message: name,
      });
      onToast(`Saved custom ringtone: ${name}`);
    } catch {
      onToast('Could not store selected audio file.');
    }
    e.target.value = '';
  };

  const handleDeleteCustomAudio = async () => {
    stopPreviewSound();
    setPreviewingAlarm(false);
    await deleteCustomRingtone();
    await clearNativeCustomRingtone();
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
      {/* Left Column: Account + Google Workspace & Calendar Hub + OS Delivery */}
      <div className="flex flex-col gap-6 lg:col-span-6">
        {/* Account & Firebase Cloud Sync Card */}
        <section className="glass-surface rounded-3xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {user?.photoURL && (
                <img
                  src={user.photoURL}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="h-11 w-11 shrink-0 rounded-full border border-white/25 object-cover"
                />
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-400">Account &amp; Cloud Sync</p>
                <h2 className="font-display mt-0.5 truncate text-lg font-bold text-slate-50">
                  {user ? user.name : 'Offline Guest Mode'}
                </h2>
                <p className="mt-0.5 truncate text-xs text-slate-400">
                  {user
                    ? `${user.email} · ${
                        !isOnline
                          ? 'Offline (queued)'
                          : user.authProvider === 'firebase'
                            ? syncStatus === 'synced'
                              ? 'Firebase Cloud Synced'
                              : syncStatus === 'syncing'
                                ? 'Firebase Syncing…'
                                : 'Google Account · Saved on device'
                            : syncStatus
                      }`
                    : 'Saved locally · Sign in with Google for Calendar, Gmail & sync'}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {user ? (
                <>
                  <button
                    type="button"
                    onClick={onSyncNow}
                    aria-label="Sync now"
                    className="ios-spring-press flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-200 hover:bg-white/[0.1]"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="ios-spring-press flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.1] whitespace-nowrap"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="liquid-primary-btn ios-spring-press flex min-h-[44px] items-center gap-1.5 rounded-xl px-4 text-xs font-semibold text-white whitespace-nowrap"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>

          {!user && (
            <div className="mt-4">
              <GoogleSignInButton
                onClick={handleDirectGoogleSignIn}
                disabled={googleBusy}
                label={googleBusy ? 'Connecting to Google…' : 'Sign in with Google'}
              />
              <button
                type="button"
                onClick={toggleOAuthTestingHelp}
                className="mt-2 inline-flex min-h-[36px] w-full items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium text-amber-200/90 transition-colors hover:bg-amber-500/10 hover:text-amber-100"
              >
                <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                <span>Can&rsquo;t proceed with Google Sign-In? Use Email instead</span>
              </button>
            </div>
          )}

          {googleAuthError && (
            <AuthRecoveryBanner
              error={googleAuthError}
              onUseEmailFallback={onOpenAuth}
              onCopiedDomain={(host) =>
                onTriggerIsland('success', {
                  title: 'Domain Copied',
                  message: `${host} copied to clipboard`,
                })
              }
            />
          )}

          {/* Google Workspace & Apple Calendar Integration Hub */}
          <div className="mt-4 border-t border-white/[0.08] pt-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-sky-300" />
                <span className="text-xs font-semibold text-slate-100">
                  Google Calendar, Gmail &amp; Apple Calendar
                </span>
              </div>
              {hasWorkspaceAccess && (
                <button
                  type="button"
                  onClick={onRefreshWorkspace}
                  className="ios-spring-press inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 text-xs font-semibold text-sky-300 hover:bg-white/[0.1]"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Sync</span>
                </button>
              )}
            </div>

            {hasWorkspaceAccess ? (
              <p className="mt-1.5 text-xs text-slate-400">
                Connected · <span className="font-mono text-slate-200">{calendarCount}</span> calendar
                events · <span className="font-mono text-slate-200">{gmailCount}</span> inbox emails
              </p>
            ) : (
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                If Google shows an amber “app hasn’t been verified” notice for Gmail &amp; Calendar,
                scroll down and tap <strong className="text-slate-200">Continue</strong> — or use{' '}
                <strong className="text-slate-200">Email Digest</strong> and{' '}
                <strong className="text-slate-200">Export .ics</strong> directly with zero warning.
              </p>
            )}

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {!hasWorkspaceAccess ? (
                <button
                  type="button"
                  disabled={googleBusy}
                  onClick={handleWorkspaceConnect}
                  className="ios-spring-press flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/15 px-3.5 text-xs font-semibold text-sky-100 hover:bg-sky-500/25 disabled:opacity-50"
                >
                  <Calendar className="h-4 w-4 text-sky-300" />
                  <span>
                    {googleBusy
                      ? 'Connecting…'
                      : user
                        ? 'Connect Live Calendar & Gmail'
                        : 'Connect Google Workspace'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onRequestDailyDigest}
                  className="ios-spring-press flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.05] px-3.5 text-xs font-semibold text-slate-100 hover:bg-white/[0.1]"
                >
                  <Mail className="h-4 w-4 text-amber-300" />
                  <span>Email Daily Digest</span>
                </button>
              )}

              <button
                type="button"
                onClick={onExportAllIcs}
                className="ios-spring-press flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.05] px-3.5 text-xs font-semibold text-slate-100 hover:bg-white/[0.1]"
              >
                <CalendarArrowDown className="h-4 w-4 text-emerald-300" />
                <span>Export Calendar (.ics)</span>
              </button>
            </div>

            {!hasWorkspaceAccess && (
              <button
                type="button"
                onClick={onRequestDailyDigest}
                className="ios-spring-press mt-2 flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.09]"
              >
                <Mail className="h-3.5 w-3.5 text-amber-300" />
                <span>Open Daily Digest in Gmail (No Verification Needed)</span>
              </button>
            )}
          </div>
        </section>

        {/* Closed-App & Lock-Screen OS Delivery Diagnostics */}
        <section className="glass-surface rounded-3xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-slate-50">
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
              className="liquid-primary-btn ios-spring-press flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold text-white"
            >
              <BellRing className="h-4 w-4" />
              <span>Enable OS &amp; Push Alerts</span>
            </button>
            <button
              type="button"
              onClick={onSchedule10sTest}
              className="ios-spring-press flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.05] px-4 text-xs font-semibold text-slate-100 transition-colors hover:bg-white/[0.1]"
            >
              <Lock className="h-4 w-4 text-amber-300" />
              <span>10s Lock-Screen Test</span>
            </button>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onInstantAlarmTest}
              className="ios-spring-press flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/[0.08]"
            >
              <Play className="h-3.5 w-3.5 text-red-400" />
              <span>Preview Ringing Screen</span>
            </button>
            {isNativeApp() && (
              <button
                type="button"
                onClick={() => openExactAlarmSettings()}
                className="ios-spring-press flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/[0.08]"
              >
                <Smartphone className="h-3.5 w-3.5 text-[#60A5FA]" />
                <span>Exact Alarm Settings</span>
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Right Column: Audio & Ringtone Engine + Apple Spring Preferences + Backup */}
      <div className="flex flex-col gap-6 lg:col-span-6">
        <section className="glass-surface rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-slate-50">
              Sounds &amp; Alarm Ringtones
            </h2>
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
                onClick={() => void handlePreviewAlarmRingtone()}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
                  previewingAlarm
                    ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                    : 'text-[#60A5FA] hover:bg-white/[0.06]'
                }`}
              >
                {previewingAlarm ? (
                  <>
                    <Square className="h-3 w-3 fill-current" />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 fill-current" />
                    <span>Preview</span>
                  </>
                )}
              </button>
            </div>
            <select
              id="pref-alarm-sound"
              value={prefs.defaultAlarmSound}
              onChange={(e) => {
                stopPreviewSound();
                setPreviewingAlarm(false);
                onUpdatePrefs({ defaultAlarmSound: e.target.value as AlarmSoundId });
              }}
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.08] bg-[#060812]/80 px-3.5 text-sm text-slate-100 focus:border-[#0A84FF] focus:outline-none"
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
                className="ios-spring-press flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 text-xs font-semibold text-slate-100 hover:bg-white/[0.1]"
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
                onClick={() => {
                  playNotificationChime(prefs.defaultNotifSound);
                  onTriggerIsland('success', {
                    title: 'Chime Preview',
                    message: `Playing ${NOTIF_SOUNDS.find((s) => s.id === prefs.defaultNotifSound)?.label ?? 'notification'} chime`,
                  });
                }}
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
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.08] bg-[#060812]/80 px-3.5 text-sm text-slate-100 focus:border-[#0A84FF] focus:outline-none"
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
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.08] bg-[#060812]/80 px-3.5 text-sm text-slate-100 focus:border-[#0A84FF] focus:outline-none"
            >
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds (Default)</option>
              <option value={60}>1 minute</option>
              <option value={120}>2 minutes</option>
              <option value={0}>Continuous until dismissed</option>
            </select>
          </div>
        </section>

        {/* General Preferences (Tactile Apple iOS Switches) & JSON Backup */}
        <section className="glass-surface rounded-3xl p-5">
          <h2 className="font-display text-base font-bold text-slate-50">
            App Preferences &amp; Data
          </h2>

          <div className="mt-4 divide-y divide-white/[0.06]">
            <div className="flex min-h-[56px] items-center justify-between gap-3 py-2">
              <div>
                <p className="text-sm font-medium text-slate-200">Haptic feedback &amp; vibration</p>
                <p className="text-xs text-slate-400">Tactile feedback on alarms and completions</p>
              </div>
              <IosSwitch
                checked={prefs.vibrate}
                onChange={(next) => onUpdatePrefs({ vibrate: next })}
                ariaLabel="Haptic feedback and vibration"
                accent="emerald"
              />
            </div>

            <div className="flex min-h-[56px] items-center justify-between gap-3 py-2">
              <div>
                <p className="text-sm font-medium text-slate-200">
                  Auto-delete completed one-day tasks
                </p>
                <p className="text-xs text-slate-400">Automatically clear one-off reminders</p>
              </div>
              <IosSwitch
                checked={prefs.autoDeleteCompleted}
                onChange={(next) => onUpdatePrefs({ autoDeleteCompleted: next })}
                ariaLabel="Auto-delete completed one-day tasks"
                accent="azure"
              />
            </div>

            <div className="flex min-h-[56px] items-center justify-between gap-3 py-2">
              <span className="text-sm font-medium text-slate-200">Clock format</span>
              <SpringSegmentedControl<'12h' | '24h'>
                ariaLabel="Clock format"
                size="sm"
                value={prefs.timeFormat}
                onChange={(fmt) => onUpdatePrefs({ timeFormat: fmt })}
                options={[
                  { id: '12h', label: '12H' },
                  { id: '24h', label: '24H' },
                ]}
              />
            </div>
          </div>

          {onOpenVoiceShortcuts && (
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.08] pt-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200">
                  {assistantProfile.sectionTitle}
                </p>
                <p className="text-xs text-slate-400">{assistantProfile.profileSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={onOpenVoiceShortcuts}
                className="ios-spring-press flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-3.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/25 whitespace-nowrap"
              >
                <Command className="h-3.5 w-3.5 text-emerald-300" />
                <span>Open Live</span>
              </button>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-white/[0.08] pt-4">
            <button
              type="button"
              onClick={onExportBackup}
              className="ios-spring-press flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-xs font-semibold text-slate-200 hover:bg-white/[0.09]"
            >
              <FileJson className="h-4 w-4 text-[#60A5FA]" />
              <span>Export JSON</span>
            </button>
            <button
              type="button"
              onClick={() => backupInputRef.current?.click()}
              className="ios-spring-press flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-xs font-semibold text-slate-200 hover:bg-white/[0.09]"
            >
              <Upload className="h-4 w-4 text-emerald-400" />
              <span>Import JSON</span>
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

          {/* In-App PWA Install Prompt (auto-hidden when already standalone/native) */}
          {!isInstalled && (isInstallable || isIOS) && (
            <div className="mt-3 border-t border-white/[0.08] pt-3">
              {isInstallable ? (
                <button
                  type="button"
                  onClick={() => install()}
                  className="ios-spring-press flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/20 px-4 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30"
                >
                  <Download className="h-4 w-4" />
                  <span>Install App on Home Screen</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowIOSGuide((s) => !s)}
                    className="ios-spring-press flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 text-xs font-semibold text-slate-200 hover:bg-white/[0.08]"
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
    </div>
  );
};
