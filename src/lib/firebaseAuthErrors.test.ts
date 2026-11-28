import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGoogleOAuthTestingError, mapFirebaseAuthError } from './firebaseAuthErrors';

test('mapFirebaseAuthError hides internal hostnames and console links for auth/unauthorized-domain', () => {
  const err = Object.assign(new Error('Firebase: Error (auth/unauthorized-domain).'), {
    code: 'auth/unauthorized-domain',
  });
  const parsed = mapFirebaseAuthError(err, {
    hostname: 'localhost',
    projectId: 'gen-lang-client-0663798259',
  });

  assert.equal(parsed.code, 'auth/unauthorized-domain');
  assert.equal(parsed.actionKind, 'use-email-fallback');
  assert.equal(parsed.title, 'Google Sign-In Unavailable');
  assert.doesNotMatch(parsed.message, /localhost|firebase|console/i);
});

test('mapFirebaseAuthError maps native mobile Google unavailability cleanly to Email fallback', () => {
  const err = Object.assign(new Error('Native Google Sign-In unavailable'), {
    code: 'auth/native-google-unavailable',
  });
  const parsed = mapFirebaseAuthError(err);

  assert.equal(parsed.code, 'auth/native-google-unavailable');
  assert.equal(parsed.actionKind, 'use-email-fallback');
  assert.match(parsed.message, /Email & Password/i);
  assert.doesNotMatch(parsed.message, /firebase|localhost|capacitor/i);
});

test('mapFirebaseAuthError hides developer setup details for auth/operation-not-allowed', () => {
  const parsed = mapFirebaseAuthError(
    new Error('Firebase: Error (auth/operation-not-allowed).'),
    { projectId: 'gen-lang-client-0663798259' }
  );

  assert.equal(parsed.code, 'auth/operation-not-allowed');
  assert.equal(parsed.actionKind, 'none');
  assert.doesNotMatch(parsed.message, /firebase|console/i);
});

test('mapFirebaseAuthError maps common credential, duplicate, weak password, and popup errors cleanly', () => {
  assert.equal(
    mapFirebaseAuthError({ code: 'auth/email-already-in-use' }).title,
    'Account Already Exists'
  );
  assert.equal(
    mapFirebaseAuthError({ code: 'auth/invalid-credential' }).title,
    'Incorrect Email or Password'
  );
  assert.equal(mapFirebaseAuthError({ code: 'auth/weak-password' }).title, 'Password Too Weak');
  assert.equal(
    mapFirebaseAuthError({ code: 'auth/popup-blocked' }).actionKind,
    'use-email-fallback'
  );
  assert.equal(
    mapFirebaseAuthError({ code: 'auth/popup-closed-by-user' }).title,
    'Sign-In Cancelled'
  );
});

test('mapFirebaseAuthError maps Google OAuth access_denied and WebView disallowed_useragent blocks cleanly', () => {
  const parsed = mapFirebaseAuthError(
    new Error(
      'Access blocked: gen-lang-client-0663798259.firebaseapp.com has not completed the Google verification process. Error 403: access_denied'
    ),
    { projectId: 'gen-lang-client-0663798259' }
  );
  assert.equal(parsed.actionKind, 'use-email-fallback');
  assert.equal(parsed.title, 'Google Sign-In Unavailable');
  assert.doesNotMatch(parsed.message, /firebase|gen-lang-client/i);

  const webviewBlocked = mapFirebaseAuthError(new Error('Error 403: disallowed_useragent'));
  assert.equal(webviewBlocked.actionKind, 'use-email-fallback');

  const direct = buildGoogleOAuthTestingError({ projectId: 'gen-lang-client-0663798259' });
  assert.equal(direct.actionKind, 'use-email-fallback');
  assert.equal(direct.title, 'Google Sign-In Unavailable');
});

test('mapFirebaseAuthError never exposes raw internal error messages for unknown failures', () => {
  const parsed = mapFirebaseAuthError(
    new Error('Firebase: Internal token exchange failure at https://localhost')
  );
  assert.equal(parsed.code, 'auth/unknown');
  assert.equal(parsed.actionKind, 'none');
  assert.equal(parsed.title, 'Authentication Error');
  assert.doesNotMatch(parsed.message, /firebase|localhost|token/i);
});
