export type FirebaseAuthActionKind =
  | 'authorized-domain'
  | 'enable-email-provider'
  | 'oauth-testing-mode'
  | 'popup-blocked'
  | 'none';

export interface ParsedFirebaseAuthError {
  code: string;
  title: string;
  message: string;
  actionKind: FirebaseAuthActionKind;
  hostname?: string;
  projectId?: string;
  consoleUrl?: string;
}

function extractFirebaseErrorCode(err: unknown): string {
  if (
    err &&
    typeof err === 'object' &&
    'code' in err &&
    typeof (err as { code?: unknown }).code === 'string'
  ) {
    return (err as { code: string }).code;
  }
  const msg = err instanceof Error ? err.message : String(err ?? '');
  const match = msg.match(/\((auth\/[a-z0-9-]+)\)/i) || msg.match(/(auth\/[a-z0-9-]+)/i);
  return match ? match[1].toLowerCase() : '';
}

export function buildGoogleOAuthTestingError(
  context: { hostname?: string; projectId?: string } = {}
): ParsedFirebaseAuthError {
  const hostname = context.hostname?.trim() || '';
  const projectId = context.projectId?.trim() || '';

  return {
    code: 'auth/oauth-access-denied',
    title: 'Can’t Proceed with Google Sign-In?',
    message:
      'If Google Sign-In is blocked or unavailable on your account or browser, you can sign in or create an account with Email & Password instead — your reminders, alarms, and Voice Notes sync the exact same way.',
    actionKind: 'oauth-testing-mode',
    hostname,
    projectId,
  };
}

export function mapFirebaseAuthError(
  err: unknown,
  context: { hostname?: string; projectId?: string } = {}
): ParsedFirebaseAuthError {
  const code = extractFirebaseErrorCode(err);
  const rawMessage = err instanceof Error ? err.message : String(err ?? 'Authentication failed');
  const hostname = context.hostname?.trim() || 'your-domain.github.io';
  const projectId = context.projectId?.trim() || '';
  const consoleBase = projectId
    ? `https://console.firebase.google.com/project/${projectId}/authentication`
    : 'https://console.firebase.google.com/';

  if (
    code === 'auth/oauth-access-denied' ||
    /access_denied|verification process|developer-approved testers|error 403/i.test(rawMessage)
  ) {
    return buildGoogleOAuthTestingError({ hostname, projectId });
  }

  switch (code) {
    case 'auth/unauthorized-domain':
      return {
        code,
        title: 'Domain Not Authorized in Firebase',
        message: `"${hostname}" needs to be added to your Firebase Auth Authorized Domains list before Google Sign-In can open here.`,
        actionKind: 'authorized-domain',
        hostname,
        projectId,
        consoleUrl: `${consoleBase}/settings`,
      };

    case 'auth/operation-not-allowed':
      return {
        code,
        title: 'Email & Password Not Enabled Yet',
        message:
          'Turn on the Email/Password sign-in provider once in your Firebase Console to allow creating and logging into accounts with email.',
        actionKind: 'enable-email-provider',
        hostname,
        projectId,
        consoleUrl: `${consoleBase}/providers`,
      };

    case 'auth/popup-blocked':
      return {
        code,
        title: 'Sign-In Popup Blocked',
        message:
          'Your browser blocked the Google sign-in window. Allow popups for this site or sign in using Email & Password below.',
        actionKind: 'popup-blocked',
      };

    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return {
        code,
        title: 'Sign-In Cancelled',
        message:
          'The Google sign-in window was closed before finishing. Try again whenever you are ready.',
        actionKind: 'none',
      };

    case 'auth/email-already-in-use':
      return {
        code,
        title: 'Account Already Exists',
        message:
          'An account with this email already exists. Switch to Sign In or use Forgot password.',
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
          'Temporarily paused due to repeated attempts. Wait a minute or reset your password.',
        actionKind: 'none',
      };

    case 'auth/network-request-failed':
      return {
        code,
        title: 'No Internet Connection',
        message: 'Could not reach Firebase right now. Check your connection and try again.',
        actionKind: 'none',
      };

    default:
      return {
        code: code || 'auth/unknown',
        title: 'Sign-In Error',
        message:
          rawMessage.replace(/^Firebase:\s*/i, '').trim() ||
          'Authentication failed. Please try again.',
        actionKind: 'none',
      };
  }
}
