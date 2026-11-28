export type FirebaseAuthActionKind = 'use-email-fallback' | 'none';

export interface ParsedFirebaseAuthError {
  code: string;
  title: string;
  message: string;
  actionKind: FirebaseAuthActionKind;
}

function extractFirebaseErrorCode(err: unknown): string {
  if (
    err &&
    typeof err === 'object' &&
    'code' in err &&
    typeof (err as { code?: unknown }).code === 'string'
  ) {
    return (err as { code: string }).code.toLowerCase();
  }
  const msg = err instanceof Error ? err.message : String(err ?? '');
  const match = msg.match(/\((auth\/[a-z0-9-]+)\)/i) || msg.match(/(auth\/[a-z0-9-]+)/i);
  return match ? match[1].toLowerCase() : '';
}

function logAuthDiagnostic(code: string, detail: string) {
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(`[Auth Diagnostic] (${code || 'auth/unknown'}) ${detail}`);
  }
}

export function buildGoogleOAuthTestingError(
  _context: { hostname?: string; projectId?: string } = {}
): ParsedFirebaseAuthError {
  return {
    code: 'auth/oauth-access-denied',
    title: 'Google Sign-In Unavailable',
    message:
      'Google Sign-In could not be completed on this device right now. Sign in or create an account with Email & Password instead — your reminders, alarms, and Voice Notes sync the exact same way.',
    actionKind: 'use-email-fallback',
  };
}

export function mapFirebaseAuthError(
  err: unknown,
  context: { hostname?: string; projectId?: string } = {}
): ParsedFirebaseAuthError {
  const code = extractFirebaseErrorCode(err);
  const rawMessage = err instanceof Error ? err.message : String(err ?? 'Authentication failed');
  const hostname = context.hostname?.trim() || '';

  if (
    code === 'auth/oauth-access-denied' ||
    /access_denied|verification process|developer-approved testers|error 403|disallowed_useragent/i.test(
      rawMessage
    )
  ) {
    logAuthDiagnostic(code || 'auth/oauth-access-denied', rawMessage);
    return buildGoogleOAuthTestingError(context);
  }

  switch (code) {
    case 'auth/native-google-unavailable':
      logAuthDiagnostic(code, rawMessage);
      return {
        code,
        title: 'Google Sign-In Unavailable',
        message:
          'Google Sign-In is not available in this mobile build yet. Please sign in or create an account with Email & Password to sync your alarms and reminders.',
        actionKind: 'use-email-fallback',
      };

    case 'auth/unauthorized-domain':
      logAuthDiagnostic(
        code,
        `Unauthorized auth domain "${hostname || 'unknown'}" — add domain in Firebase Auth settings or use native Google Sign-In on mobile.`
      );
      return {
        code,
        title: 'Google Sign-In Unavailable',
        message:
          'Google Sign-In could not be completed right now. Please sign in or create an account with Email & Password instead.',
        actionKind: 'use-email-fallback',
      };

    case 'auth/operation-not-allowed':
      logAuthDiagnostic(code, rawMessage);
      return {
        code,
        title: 'Sign-In Temporarily Unavailable',
        message:
          'This sign-in option is currently unavailable. Please try again later or choose another sign-in method.',
        actionKind: 'none',
      };

    case 'auth/popup-blocked':
      return {
        code,
        title: 'Sign-In Window Blocked',
        message:
          'Your browser blocked the Google sign-in window. Allow popups or sign in using Email & Password instead.',
        actionKind: 'use-email-fallback',
      };

    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return {
        code,
        title: 'Sign-In Cancelled',
        message:
          'The sign-in window was closed before finishing. Try again whenever you are ready.',
        actionKind: 'none',
      };

    case 'auth/email-already-in-use':
      return {
        code,
        title: 'Account Already Exists',
        message:
          'An account with this email already exists. Switch to Sign In or tap Forgot password.',
        actionKind: 'none',
      };

    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return {
        code,
        title: 'Incorrect Email or Password',
        message: 'Check your email and password, or tap Forgot password to reset it.',
        actionKind: 'none',
      };

    case 'auth/invalid-email':
      return {
        code,
        title: 'Invalid Email Address',
        message: 'Please enter a valid email address (for example, name@example.com).',
        actionKind: 'none',
      };

    case 'auth/weak-password':
      return {
        code,
        title: 'Password Too Weak',
        message: 'Choose a stronger password with at least 6 characters.',
        actionKind: 'none',
      };

    case 'auth/too-many-requests':
      return {
        code,
        title: 'Too Many Attempts',
        message:
          'Sign-in is temporarily paused due to repeated attempts. Wait a minute or reset your password.',
        actionKind: 'none',
      };

    case 'auth/network-request-failed':
      return {
        code,
        title: 'No Internet Connection',
        message: 'Could not connect right now. Check your internet connection and try again.',
        actionKind: 'none',
      };

    default:
      logAuthDiagnostic(code || 'auth/unknown', rawMessage);
      return {
        code: code || 'auth/unknown',
        title: 'Authentication Error',
        message: 'We could not complete sign-in right now. Please try again or use Email & Password.',
        actionKind: 'none',
      };
  }
}
