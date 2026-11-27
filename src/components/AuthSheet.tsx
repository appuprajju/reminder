import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { FIREBASE_PROJECT_ID } from '../lib/firebase';
import {
  buildGoogleOAuthTestingError,
  mapFirebaseAuthError,
  type ParsedFirebaseAuthError,
} from '../lib/firebaseAuthErrors';
import type { TriggerIslandFn } from '../types';
import { AuthRecoveryBanner } from './AuthRecoveryBanner';
import { GoogleSignInButton } from './GoogleSignInButton';
import { SpringSegmentedControl } from './SpringSegmentedControl';

interface AuthSheetProps {
  open: boolean;
  onGoogleSignIn: () => Promise<unknown>;
  onSignIn: (email: string, password: string) => Promise<unknown>;
  onSignUp: (name: string, email: string, password: string) => Promise<unknown>;
  onResetPassword: (email: string) => Promise<unknown>;
  onTriggerIsland?: TriggerIslandFn;
  onClose: () => void;
}

export const AuthSheet: React.FC<AuthSheetProps> = ({
  open,
  onGoogleSignIn,
  onSignIn,
  onSignUp,
  onResetPassword,
  onTriggerIsland,
  onClose,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<ParsedFirebaseAuthError | null>(null);
  const [showBlockedHelp, setShowBlockedHelp] = useState(false);
  const [resetNotice, setResetNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const oauthTestingGuidance = buildGoogleOAuthTestingError({
    hostname: currentHostname,
    projectId: FIREBASE_PROJECT_ID,
  });

  const focusEmailFallback = () => {
    setShowBlockedHelp(false);
    setAuthError(null);
    setMode('signup');
    window.setTimeout(() => {
      emailInputRef.current?.focus();
    }, 60);
  };

  const reportError = (err: unknown, fromGoogle = false) => {
    const parsed = mapFirebaseAuthError(err, {
      hostname: currentHostname,
      projectId: FIREBASE_PROJECT_ID,
    });
    if (fromGoogle && parsed.code === 'auth/popup-closed-by-user') {
      // Google displays Error 403 inside its own popup; when closed, Firebase only reports popup-closed-by-user
      setShowBlockedHelp(true);
      setAuthError(null);
      return;
    }
    setAuthError(parsed);
    if (parsed.code !== 'auth/popup-closed-by-user') {
      onTriggerIsland?.('alert', {
        title: parsed.title,
        message: parsed.message,
      });
    }
  };

  const handleGoogleClick = async () => {
    setAuthError(null);
    setShowBlockedHelp(false);
    setResetNotice('');
    setBusy(true);
    try {
      await onGoogleSignIn();
      onClose();
    } catch (err) {
      reportError(err, true);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setResetNotice('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setAuthError({
        code: 'auth/invalid-email',
        title: 'Email Required',
        message: 'Enter your email address to continue.',
        actionKind: 'none',
      });
      return;
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        await onSignIn(cleanEmail, password);
      } else {
        await onSignUp(name.trim(), cleanEmail, password);
      }
      setPassword('');
      onClose();
    } catch (err) {
      reportError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    setAuthError(null);
    setResetNotice('');
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setAuthError({
        code: 'auth/invalid-email',
        title: 'Enter Your Email First',
        message: 'Type your account email above, then tap Forgot password to get a reset link.',
        actionKind: 'none',
      });
      return;
    }

    setBusy(true);
    try {
      await onResetPassword(cleanEmail);
      setResetNotice(`Password reset link sent to ${cleanEmail}. Check your inbox or spam folder.`);
    } catch (err) {
      reportError(err);
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
              Sign in with Google or Email &amp; Password via Firebase—works on web, GitHub Pages,
              and mobile with no separate server.
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
            Instant Google account login · Connect Calendar &amp; Gmail anytime
          </p>
          <div className="mt-1.5 flex justify-center">
            <button
              type="button"
              onClick={() => setShowBlockedHelp((v) => !v)}
              className="min-h-[36px] px-2 text-[11px] font-medium text-amber-300/90 hover:text-amber-200 hover:underline"
            >
              {showBlockedHelp
                ? 'Hide sign-in tip'
                : 'Can’t proceed with Google Sign-In? Tip'}
            </button>
          </div>
          {showBlockedHelp && (
            <AuthRecoveryBanner
              error={oauthTestingGuidance}
              onUseEmailFallback={focusEmailFallback}
            />
          )}
        </div>

        {/* Hairline Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/[0.1]" />
          <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
            or continue with email
          </span>
          <div className="h-px flex-1 bg-white/[0.1]" />
        </div>

        {/* Native Firebase Email & Password Sign In / Create Account */}
        <SpringSegmentedControl<'login' | 'signup'>
          ariaLabel="Email authentication mode"
          fullWidth
          value={mode}
          onChange={(next) => {
            setMode(next);
            setAuthError(null);
            setResetNotice('');
          }}
          options={[
            { id: 'login', label: 'Sign In' },
            { id: 'signup', label: 'Create Account' },
          ]}
        />

        <form onSubmit={handleSubmit} className="mt-4 space-y-3" noValidate>
          {mode === 'signup' && (
            <label className="block">
              <span className="text-xs font-medium text-slate-400">Name</span>
              <input
                type="text"
                maxLength={60}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-base text-white placeholder:text-slate-500 focus:border-[#0A84FF] focus:outline-none sm:text-sm"
              />
            </label>
          )}

          <label className="block">
            <span className="text-xs font-medium text-slate-400">Email</span>
            <input
              ref={emailInputRef}
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-base text-white placeholder:text-slate-500 focus:border-[#0A84FF] focus:outline-none sm:text-sm"
            />
          </label>

          <div>
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="auth-sheet-password"
                className="text-xs font-medium text-slate-400"
              >
                Password
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleForgotPassword}
                  className="min-h-[36px] px-1 text-xs font-semibold text-sky-300 hover:underline disabled:opacity-50 whitespace-nowrap"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <input
              id="auth-sheet-password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="mt-1 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-base text-white placeholder:text-slate-500 focus:border-[#0A84FF] focus:outline-none sm:text-sm"
            />
          </div>

          {resetNotice && (
            <p
              role="status"
              className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3.5 py-2.5 text-xs leading-relaxed font-medium text-emerald-200"
            >
              {resetNotice}
            </p>
          )}

          {authError && (
            <AuthRecoveryBanner
              error={authError}
              onUseEmailFallback={
                authError.actionKind === 'oauth-testing-mode' ? focusEmailFallback : undefined
              }
              onCopiedDomain={(host) =>
                onTriggerIsland?.('success', {
                  title: 'Domain Copied',
                  message: `${host} copied to clipboard`,
                })
              }
            />
          )}

          <button
            type="submit"
            disabled={busy}
            className="liquid-primary-btn ios-spring-press mt-1 min-h-[48px] w-full rounded-xl text-sm font-semibold text-white disabled:opacity-50 whitespace-nowrap"
          >
            {busy ? 'Working…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-2 text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            Continue in Guest Mode
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};
