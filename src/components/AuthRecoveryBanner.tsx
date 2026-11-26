import React, { useState } from 'react';
import { AlertTriangle, Check, Copy, ExternalLink } from 'lucide-react';
import type { ParsedFirebaseAuthError } from '../lib/firebaseAuthErrors';

interface AuthRecoveryBannerProps {
  error: ParsedFirebaseAuthError;
  onCopiedDomain?: (hostname: string) => void;
}

export const AuthRecoveryBanner: React.FC<AuthRecoveryBannerProps> = ({
  error,
  onCopiedDomain,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyHost = async () => {
    if (!error.hostname) return;
    try {
      await navigator.clipboard.writeText(error.hostname);
      setCopied(true);
      onCopiedDomain?.(error.hostname);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback for mobile WebViews without clipboard API
      setCopied(false);
    }
  };

  const isSetupAction =
    error.actionKind === 'authorized-domain' ||
    error.actionKind === 'enable-email-provider' ||
    error.actionKind === 'oauth-testing-mode';

  return (
    <div
      role="alert"
      data-testid="auth-recovery-banner"
      data-auth-code={error.code}
      className={`mt-4 rounded-2xl border p-3.5 text-xs leading-relaxed ${
        isSetupAction
          ? 'border-amber-400/30 bg-amber-500/10 text-amber-100'
          : 'border-red-400/25 bg-red-500/10 text-red-200'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle
          className={`mt-0.5 h-4 w-4 shrink-0 ${
            isSetupAction ? 'text-amber-300' : 'text-red-400'
          }`}
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">{error.title}</p>
          <p className="mt-1 text-slate-300">{error.message}</p>
        </div>
      </div>

      {error.actionKind === 'authorized-domain' && error.hostname && (
        <div className="mt-3 space-y-2.5 border-t border-white/[0.1] pt-3">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.12] bg-[#060812]/80 px-3 py-2">
            <span className="truncate font-mono text-xs text-sky-300">{error.hostname}</span>
            <button
              type="button"
              onClick={handleCopyHost}
              className="ios-spring-press flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.08] px-2.5 text-xs font-semibold text-white hover:bg-white/[0.16] whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-sky-300" />
                  <span>Copy Domain</span>
                </>
              )}
            </button>
          </div>

          <ol className="list-decimal space-y-1 pl-4 text-[11px] text-slate-300">
            <li>
              Open Firebase Console → <strong className="text-white">Authentication</strong> →{' '}
              <strong className="text-white">Settings</strong> →{' '}
              <strong className="text-white">Authorized domains</strong>.
            </li>
            <li>
              Tap <strong className="text-white">Add domain</strong> and paste{' '}
              <span className="font-mono text-sky-300">{error.hostname}</span>.
            </li>
            <li>Save and tap Sign in with Google again.</li>
          </ol>

          {error.consoleUrl && (
            <a
              href={error.consoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ios-spring-press flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-amber-300/30 bg-amber-400/15 px-3 text-xs font-semibold text-amber-100 hover:bg-amber-400/25 whitespace-nowrap"
            >
              <span>Open Firebase Authorized Domains</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}

      {error.actionKind === 'enable-email-provider' && (
        <div className="mt-3 space-y-2.5 border-t border-white/[0.1] pt-3">
          <ol className="list-decimal space-y-1 pl-4 text-[11px] text-slate-300">
            <li>
              Open Firebase Console → <strong className="text-white">Authentication</strong> →{' '}
              <strong className="text-white">Sign-in method</strong>.
            </li>
            <li>
              Click <strong className="text-white">Email/Password</strong>, toggle{' '}
              <strong className="text-white">Enable</strong>, and save.
            </li>
          </ol>

          {error.consoleUrl && (
            <a
              href={error.consoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ios-spring-press flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-amber-300/30 bg-amber-400/15 px-3 text-xs font-semibold text-amber-100 hover:bg-amber-400/25 whitespace-nowrap"
            >
              <span>Open Firebase Sign-in Providers</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}

      {error.actionKind === 'oauth-testing-mode' && (
        <div className="mt-3 space-y-2.5 border-t border-white/[0.1] pt-3">
          <ol className="list-decimal space-y-1 pl-4 text-[11px] text-slate-300">
            <li>
              Open Google Cloud Console → <strong className="text-white">OAuth consent screen</strong>{' '}
              → <strong className="text-white">Audience</strong>.
            </li>
            <li>
              Either add your friend’s Gmail under <strong className="text-white">Test users</strong>,
              or click <strong className="text-white">Publish App</strong> so any Google account can
              sign in.
            </li>
          </ol>

          {error.consoleUrl && (
            <a
              href={error.consoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ios-spring-press flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-amber-300/30 bg-amber-400/15 px-3 text-xs font-semibold text-amber-100 hover:bg-amber-400/25 whitespace-nowrap"
            >
              <span>Open Google OAuth Audience</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}
    </div>
  );
};
