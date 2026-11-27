import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGoogleOAuthTestingError, mapFirebaseAuthError } from './firebaseAuthErrors';

test('mapFirebaseAuthError detects auth/unauthorized-domain and includes hostname and Console URL', () => {
  const err = Object.assign(new Error('Firebase: Error (auth/unauthorized-domain).'), {
    code: 'auth/unauthorized-domain',
  });
  const parsed = mapFirebaseAuthError(err, {
    hostname: 'prajwal.github.io',
    projectId: 'gen-lang-client-0663798259',
  });

  assert.equal(parsed.code, 'auth/unauthorized-domain');
  assert.equal(parsed.actionKind, 'authorized-domain');
  assert.equal(parsed.hostname, 'prajwal.github.io');
  assert.equal(
    parsed.consoleUrl,
    'https://console.firebase.google.com/project/gen-lang-client-0663798259/authentication/settings'
  );
  assert.match(parsed.message, /prajwal\.github\.io/);
});

test('mapFirebaseAuthError detects auth/operation-not-allowed for Email/Password enablement', () => {
  const parsed = mapFirebaseAuthError(
    new Error('Firebase: Error (auth/operation-not-allowed).'),
    { projectId: 'gen-lang-client-0663798259' }
  );

  assert.equal(parsed.code, 'auth/operation-not-allowed');
  assert.equal(parsed.actionKind, 'enable-email-provider');
  assert.equal(
    parsed.consoleUrl,
    'https://console.firebase.google.com/project/gen-lang-client-0663798259/authentication/providers'
  );
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
  assert.equal(mapFirebaseAuthError({ code: 'auth/popup-blocked' }).actionKind, 'popup-blocked');
  assert.equal(
    mapFirebaseAuthError({ code: 'auth/popup-closed-by-user' }).title,
    'Sign-In Cancelled'
  );
});

test('mapFirebaseAuthError maps Google OAuth access_denied blocks to a user-friendly email fallback tip', () => {
  const parsed = mapFirebaseAuthError(
    new Error(
      'Access blocked: gen-lang-client-0663798259.firebaseapp.com has not completed the Google verification process. Error 403: access_denied'
    ),
    { projectId: 'gen-lang-client-0663798259' }
  );
  assert.equal(parsed.actionKind, 'oauth-testing-mode');
  assert.equal(parsed.title, 'Can’t Proceed with Google Sign-In?');
  assert.equal(parsed.consoleUrl, undefined);

  const direct = buildGoogleOAuthTestingError({ projectId: 'gen-lang-client-0663798259' });
  assert.equal(direct.actionKind, 'oauth-testing-mode');
  assert.equal(direct.title, 'Can’t Proceed with Google Sign-In?');
  assert.equal(direct.consoleUrl, undefined);
});

test('mapFirebaseAuthError strips raw Firebase prefix for unknown errors', () => {
  const parsed = mapFirebaseAuthError(new Error('Firebase: Unexpected auth failure'));
  assert.equal(parsed.code, 'auth/unknown');
  assert.equal(parsed.actionKind, 'none');
  assert.equal(parsed.message, 'Unexpected auth failure');
});
