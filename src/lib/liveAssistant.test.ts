import test from 'node:test';
import assert from 'node:assert/strict';
import { extractWakeCommand, parseDirectAssistantSpeech } from './liveAssistant';

test('extractWakeCommand parses Hey Siri add reminder command with payload', () => {
  const res = extractWakeCommand('Hey Siri, add a reminder in reminderme to take medicine at 9pm');
  assert.ok(res);
  assert.equal(res.source, 'siri');
  assert.equal(res.commandText, 'take medicine at 9pm');
  assert.equal(res.isAlarmHint, false);
  assert.equal(res.needsFollowUp, false);
});

test('extractWakeCommand parses Hey Google alarm command and sets isAlarmHint', () => {
  const res = extractWakeCommand('Hey Google set an alarm in reminder me for 6:30am');
  assert.ok(res);
  assert.equal(res.source, 'google-assistant');
  assert.equal(res.commandText, '6:30am');
  assert.equal(res.isAlarmHint, true);
  assert.equal(res.needsFollowUp, false);
});

test('extractWakeCommand requests follow-up when only wake phrase and trigger are spoken', () => {
  const res = extractWakeCommand('Hey Siri, add a reminder in reminderme');
  assert.ok(res);
  assert.equal(res.source, 'siri');
  assert.equal(res.commandText, '');
  assert.equal(res.needsFollowUp, true);
});

test('extractWakeCommand handles Hey reminderme and ignores normal background chatter', () => {
  const matched = extractWakeCommand('Hey reminderme call Mom in 30 minutes');
  assert.ok(matched);
  assert.equal(matched.source, 'voice');
  assert.equal(matched.commandText, 'call Mom in 30 minutes');
  assert.equal(matched.needsFollowUp, false);

  const chatter = extractWakeCommand('I am making coffee in the kitchen right now');
  assert.equal(chatter, null);
});

test('parseDirectAssistantSpeech strips optional wake words or parses direct speech cleanly', () => {
  const direct = parseDirectAssistantSpeech('Take vitamin D tomorrow at 8:30am', 'siri');
  assert.ok(direct);
  assert.equal(direct.source, 'siri');
  assert.equal(direct.commandText, 'Take vitamin D tomorrow at 8:30am');

  const withPrefix = parseDirectAssistantSpeech(
    'OK Google remind me in reminderme to pay rent at 5pm',
    'voice'
  );
  assert.ok(withPrefix);
  assert.equal(withPrefix.source, 'google-assistant');
  assert.equal(withPrefix.commandText, 'pay rent at 5pm');
});
