import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { ParsedFirebaseAuthError } from '../lib/firebaseAuthErrors';

interface AuthRecoveryBannerProps {
  error: ParsedFirebaseAuthError;
  onUseEmailFallback?: () => void;
}

export const AuthRecoveryBanner: React.FC<AuthRecoveryBannerProps> = ({
  error,
  onUseEmailFallback,
}) => {
  const isFallbackHint = error.actionKind === 'use-email-fallback';

  return (
    <div
      role="alert"
      data-testid="auth-recovery-banner"
      data-auth-code={error.code}
      className={`mt-4 rounded-2xl border p-3.5 text-xs leading-relaxed ${
        isFallbackHint
          ? 'border-amber-400/30 bg-amber-500/10 text-amber-100'
          : 'border-red-400/25 bg-red-500/10 text-red-200'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle
          className={`mt-0.5 h-4 w-4 shrink-0 ${
            isFallbackHint ? 'text-amber-300' : 'text-red-400'
          }`}
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">{error.title}</p>
          <p className="mt-1 text-slate-300">{error.message}</p>
        </div>
      </div>

      {isFallbackHint && onUseEmailFallback && (
        <div className="mt-3 border-t border-white/[0.1] pt-3">
          <button
            type="button"
            onClick={onUseEmailFallback}
            className="ios-spring-press flex min-h-[44px] w-full items-center justify-center rounded-xl border border-sky-400/35 bg-sky-500/15 px-3 text-xs font-semibold text-sky-100 hover:bg-sky-500/25 whitespace-nowrap"
          >
            Sign In / Create Account with Email Instead
          </button>
        </div>
      )}
    </div>
  );
};
