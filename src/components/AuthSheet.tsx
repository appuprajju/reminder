import React, { useState } from 'react';
import { X } from 'lucide-react';

interface AuthSheetProps {
  open: boolean;
  onSignIn: (email: string, password: string) => Promise<unknown>;
  onSignUp: (name: string, email: string, password: string) => Promise<unknown>;
  onClose: () => void;
}

export const AuthSheet: React.FC<AuthSheetProps> = ({ open, onSignIn, onSignUp, onClose }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="glass-elevated animate-sheet-up w-full max-w-md rounded-t-3xl p-6 pb-safe sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">
              {mode === 'login' ? 'Sign In to Sync' : 'Create Account'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Sync reminders across devices &amp; enable cloud push backup.
            </p>
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

        <div className="mt-5 space-y-3.5">
          {mode === 'signup' && (
            <label className="block">
              <span className="text-xs font-medium text-slate-400">Name</span>
              <input
                type="text"
                maxLength={40}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-base text-white focus:border-[#2F80FF] focus:outline-none sm:text-sm"
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
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-base text-white focus:border-[#2F80FF] focus:outline-none sm:text-sm"
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
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-base text-white focus:border-[#2F80FF] focus:outline-none sm:text-sm"
            />
          </label>

          {error && (
            <p role="alert" className="text-xs font-medium text-red-400">
              {error}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={busy}
          className="mt-5 min-h-[48px] w-full rounded-xl bg-[#2F80FF] text-sm font-semibold text-white transition-colors hover:bg-[#256FE6] disabled:opacity-50"
        >
          {busy ? 'Working...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError('');
            }}
            className="min-h-[36px] font-semibold text-[#60A5FA] hover:underline"
          >
            {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[36px] text-slate-400 hover:text-slate-200"
          >
            Stay in Guest Mode
          </button>
        </div>
      </form>
    </div>
  );
};
