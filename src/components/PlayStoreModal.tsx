import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Shield, Smartphone, X } from 'lucide-react';

interface PlayStoreModalProps {
  mode: 'privacy' | 'playstore' | null;
  onClose: () => void;
}

const BUILD_COMMANDS = `# 1. Deploy Serverless Cloudflare Edge Backend (Zero Node server needed):
cd worker && npm install
npx wrangler d1 execute reminder-db --remote --file=./schema.sql
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
npx wrangler deploy

# 2. Build & Package Native Android Release (.aab for Play Console):
cd .. && VITE_API_BASE_URL=https://api.makeuperfect.in npm run build
npx cap sync android
cd android && ./gradlew bundleRelease`;

const PERMISSIONS_LIST = [
  {
    name: 'POST_NOTIFICATIONS',
    reason: 'Delivers scheduled reminder and alarm alerts on Android 13+.',
  },
  {
    name: 'SCHEDULE_EXACT_ALARM / USE_EXACT_ALARM',
    reason: 'Triggers OS AlarmManager at the exact minute while the app is closed and screen is locked.',
  },
  {
    name: 'RECEIVE_BOOT_COMPLETED',
    reason: 'Restores pending OS alarm schedules automatically after a phone restart.',
  },
  {
    name: 'USE_FULL_SCREEN_INTENT & WAKE_LOCK',
    reason: 'Wakes the locked screen for high-priority loud alarms so you can snooze or dismiss immediately.',
  },
  {
    name: 'VIBRATE',
    reason: 'Provides tactile haptics and alarm vibration alerts.',
  },
];

export const PlayStoreModal: React.FC<PlayStoreModalProps> = ({ mode, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!mode) return null;

  const copyCommands = () => {
    navigator.clipboard?.writeText(BUILD_COMMANDS).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glass-elevated animate-sheet-up flex max-h-[88dvh] w-full max-w-2xl flex-col rounded-t-3xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div className="flex items-center gap-2.5">
            {mode === 'privacy' ? (
              <Shield className="h-5 w-5 text-[#60A5FA]" />
            ) : (
              <Smartphone className="h-5 w-5 text-emerald-400" />
            )}
            <h2 className="text-lg font-bold text-white">
              {mode === 'privacy' ? 'Privacy Policy' : 'Google Play Store Launch Kit'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-white/[0.08] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 text-sm leading-relaxed text-slate-300">
          {mode === 'privacy' ? (
            <>
              <p className="text-xs text-slate-400">
                Effective November 25, 2026 · Developer: Prajwal M (&lt;/yourstudio&gt;) · Public
                URL: <span className="font-mono text-slate-200">/privacy</span>
              </p>
              <p>
                <strong className="text-white">reminderme</strong> operates offline-first on your
                device with optional cloud synchronization. No account is required to schedule
                alarms, timers, or reminders locally.
              </p>
              <div>
                <h3 className="text-sm font-bold text-white">1. On-Device Data (Guest Mode)</h3>
                <p className="mt-1 text-slate-400">
                  Reminders, custom ringtones, preferences, and local streaks stay solely on your
                  device via native storage and IndexedDB.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">2. Optional Cloud Sync &amp; Push</h3>
                <p className="mt-1 text-slate-400">
                  When you create an account, we store your email, display name, salted scrypt
                  password hash, timezone, synced reminder schedules, and device push subscription
                  strictly to deliver alarms across devices.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">3. Device Permissions</h3>
                <p className="mt-1 text-slate-400">
                  Notification, Exact Alarm, Boot Recovery, and Vibration permissions are used
                  exclusively for timely alarm delivery when the app is closed and the screen is
                  locked. Optional Microphone access is used only during Voice Quick-Add and never
                  recorded or transmitted to our servers.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">4. Data Control &amp; Deletion</h3>
                <p className="mt-1 text-slate-400">
                  We never sell or share user data with advertisers. You can export JSON backups or
                  delete your reminders at any time. Contact{' '}
                  <span className="text-[#60A5FA]">admin@reminderme.app</span> for account removal.
                </p>
              </div>
              <a
                href="/privacy"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-xs font-semibold text-[#60A5FA] hover:bg-white/[0.08]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open Standalone /privacy Page for Play Console</span>
              </a>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5">
                  <p className="text-xs text-slate-400">Android Package ID</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-white">
                    in.makeuperfect.reminderme
                  </p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5">
                  <p className="text-xs text-slate-400">Target Release Format</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-emerald-400">
                    Signed Android App Bundle (.aab)
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">1. Build &amp; Package Commands</h3>
                  <button
                    type="button"
                    onClick={copyCommands}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-[#60A5FA] hover:bg-white/[0.06]"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="mt-2 overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#060812] p-4 font-mono text-xs leading-relaxed text-slate-200">
                  {BUILD_COMMANDS}
                </pre>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">
                  2. Closed-App &amp; Lock-Screen Android Permissions
                </h3>
                <div className="mt-2 divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4">
                  {PERMISSIONS_LIST.map((perm) => (
                    <div key={perm.name} className="py-2.5">
                      <p className="font-mono text-xs font-semibold text-slate-100">{perm.name}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{perm.reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">3. Play Console Submission Checklist</h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs text-slate-300">
                  <li>Generate an upload keystore in Android Studio (Build &rarr; Generate Signed Bundle).</li>
                  <li>Add <span className="font-mono text-slate-100">google-services.json</span> to <span className="font-mono text-slate-100">android/app/</span> to activate FCM remote push alongside OS AlarmManager.</li>
                  <li>Set Privacy Policy URL in Play Console to <span className="font-mono text-slate-100">https://your-domain/privacy</span>.</li>
                  <li>Declare Core Functionality for <span className="font-mono text-slate-100">USE_EXACT_ALARM</span> (Alarm Clock &amp; Calendar Reminder App).</li>
                  <li>See <span className="font-mono text-slate-100">PLAY_STORE_GUIDE.md</span> in the project root for store graphics specs &amp; Data Safety answers.</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
