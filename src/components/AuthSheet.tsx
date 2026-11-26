import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { GoogleSignInButton } from './GoogleSignInButton';

interface AuthSheetProps {
  open: boolean;
  onGoogleSignIn: () => Promise<unknown>;
  onSignIn: (email: string, password: string) => Promise<unknown>;
  onSignUp: (name: string, email: string, password: string) => Promise<unknown>;
  onClose: () => void;
}

export const AuthSheet: React.FC<AuthSheetProps> = ({
  open,
  onGoogleSignIn,
  onSignIn,
  onSignUp,
  onClose,
}) => {
  const [showCustomServer, setShowCustomServer] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const handleGoogleClick = async () => {
    setError('');
    setBusy(true);
    try {
      await onGoogleSignIn();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed';
      if (msg.includes('popup-closed-by-user')) {
        setError('Sign-in popup was closed before finishing. Try again anytime.');
      } else if (msg.includes('popup-blocked')) {
        setError('Your browser blocked the sign-in popup. Please allow popups for this site.');
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await onSignIn(email.trim(), password);
      } else {
        await onSignUp(name.trim(), email.trim(), password);
      }
      setPassword('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to reminderme"
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="glass-elevated animate-sheet-up max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-3xl">
        <div className="mb-3 flex justify-center sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-white/20" />
        </div>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              Sign In &amp; Cloud Sync
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Sync reminders across devices with Firebase and connect Google Calendar &amp; Gmail
              directly—no separate server needed.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-white/[0.08] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Primary Serverless Auth: Google Sign-In + Workspace */}
        <div className="mt-5">
          <GoogleSignInButton
            onClick={handleGoogleClick}
            disabled={busy}
            label={busy ? 'Connecting to Google…' : 'Sign in with Google'}
          />
          <p className="mt-2.5 text-center text-[11px] text-slate-400">
            Includes Firebase cloud sync · Google Calendar · Gmail reminders
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-400/25 bg-red-500/10 px-3.5 py-2.5 text-xs leading-relaxed font-medium text-red-300"
          >
            {error}
          </p>
        )}

        {/* Optional Collapsible Custom Backend Email/Password Auth */}
        <div className="mt-5 border-t border-white/[0.08] pt-4">
          <button
            type="button"
            onClick={() => {
              setShowCustomServer((s) => !s);
              setError('');
            }}
            className="flex min-h-[40px] w-full items-center justify-between rounded-xl px-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.05] hover:text-white"
          >
            <span>Use self-hosted / Cloudflare Worker account</span>
            {showCustomServer ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {showCustomServer && (
            <form onSubmit={handleSubmit} className="mt-3 space-y-3">
              {mode === 'signup' && (
                <label className="block">
                  <span className="text-xs font-medium text-slate-400">Name</span>
                  <input
                    type="text"
                    maxLength={40}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-base text-white focus:border-[#0A84FF] focus:outline-none sm:text-sm"
                  />
                </label>
              )}

              <label className="block">
                <span className="text-xs font-medium text-slate-400">Email</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-base text-white focus:border-[#0A84FF] focus:outline-none sm:text-sm"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-slate-400">Password</span>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-base text-white focus:border-[#0A84FF] focus:outline-none sm:text-sm"
                />
              </label>

              <button
                type="submit"
                disabled={busy}
                className="liquid-primary-btn ios-spring-press min-h-[46px] w-full rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? 'Working…' : mode === 'login' ? 'Sign In to Server' : 'Create Server Account'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setError('');
                }}
                className="min-h-[36px] text-xs font-semibold text-sky-300 hover:underline"
              >
                {mode === 'login' ? 'Need a server account? Sign up' : 'Already have one? Sign in'}
              </button>
            </form>
          )}
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-2 text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            Continue in Guest Mode
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};
