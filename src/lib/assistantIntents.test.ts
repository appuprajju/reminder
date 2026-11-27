import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAssistantDeepLink,
  buildNativeSchemeUri,
  buildReminderFromAssistantIntent,
  parseAssistantIntentUrl,
} from './assistantIntents';

test('parseAssistantIntentUrl parses HTTPS Siri add intent with auto-save default', () => {
  const intent = parseAssistantIntentUrl(
    'https://makeuperfect.in/?action=add&source=siri&text=Take%20medicine%20at%209pm'
  );
  assert.ok(intent);
  assert.equal(intent.action, 'add');
  assert.equal(intent.source, 'siri');
  assert.equal(intent.mode, 'auto');
  assert.equal(intent.text, 'Take medicine at 9pm');
});

test('parseAssistantIntentUrl parses native reminderme:// Google Assistant scheme with alarm override', () => {
  const intent = parseAssistantIntentUrl(
    'reminderme://add?source=google-assistant&alert=alarm&text=Wake%20me%20up%20tomorrow%20at%206%3A30am'
  );
  assert.ok(intent);
  assert.equal(intent.action, 'add');
  assert.equal(intent.source, 'google-assistant');
  assert.equal(intent.alertOverride, 'alarm');

  const parsed = buildReminderFromAssistantIntent(intent, new Date('2026-11-26T10:00:00'));
  assert.equal(parsed.isAlarm, true);
  assert.equal(parsed.time, '06:30');
});

test('parseAssistantIntentUrl maps empty add payload cleanly to voice capture action', () => {
  const intent = parseAssistantIntentUrl('https://makeuperfect.in/?action=add&source=siri&text=');
  assert.ok(intent);
  assert.equal(intent.action, 'voice');
  assert.equal(intent.source, 'siri');
});

test('parseAssistantIntentUrl supports Web Share Target payload', () => {
  const intent = parseAssistantIntentUrl(
    'https://makeuperfect.in/?action=share&title=Dentist&text=tomorrow%204pm'
  );
  assert.ok(intent);
  assert.equal(intent.action, 'add');
  assert.equal(intent.source, 'share');
  assert.equal(intent.text, 'Dentist tomorrow 4pm');
});

test('parseAssistantIntentUrl returns null for normal navigation URLs', () => {
  assert.equal(parseAssistantIntentUrl('https://makeuperfect.in/?tab=schedule'), null);
  assert.equal(parseAssistantIntentUrl('https://makeuperfect.in/'), null);
});

test('buildAssistantDeepLink & buildNativeSchemeUri produce valid round-trip URLs', () => {
  const webUrl = buildAssistantDeepLink(
    'https://makeuperfect.in',
    {
      id: 'sc_siri_add',
      assistant: 'siri',
      action: 'add',
      defaultAlertMode: 'reminder',
      autoSave: true,
    },
    'Call Mom at 7pm'
  );
  const parsedWeb = parseAssistantIntentUrl(webUrl);
  assert.ok(parsedWeb);
  assert.equal(parsedWeb.text, 'Call Mom at 7pm');
  assert.equal(parsedWeb.alertOverride, 'reminder');
  assert.equal(parsedWeb.shortcutId, 'sc_siri_add');

  const nativeUri = buildNativeSchemeUri(
    {
      assistant: 'google-assistant',
      action: 'voice',
      defaultAlertMode: 'auto',
      autoSave: true,
    }
  );
  const parsedNative = parseAssistantIntentUrl(nativeUri);
  assert.ok(parsedNative);
  assert.equal(parsedNative.action, 'voice');
  assert.equal(parsedNative.source, 'google-assistant');
});
