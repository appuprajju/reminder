import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildIslandEventFromTrigger,
  getEyeAnimationCycle,
  getEyeCssClasses,
  resolveIslandMeta,
} from './emoExpression';

test('resolveIslandMeta picks excited EMO eyes when an alarm or reminder is created', () => {
  const meta = resolveIslandMeta({ text: 'Alarm scheduled', tone: 'success' });
  assert.equal(meta.expression, 'excited');
  assert.equal(meta.label, 'Scheduled');
});

test('resolveIslandMeta picks happy EMO eyes for completed reminders and sent emails', () => {
  const done = resolveIslandMeta({ text: 'Completed "Morning hydration"', tone: 'success' });
  assert.equal(done.expression, 'happy');

  const email = resolveIslandMeta({ text: 'Email sent to user@example.com', tone: 'success' });
  assert.equal(email.expression, 'happy');
});

test('resolveIslandMeta picks sleepy EMO eyes for snoozed reminders', () => {
  const snoozed = resolveIslandMeta({ text: 'Snoozed "Morning run" for 10 min', tone: 'info' });
  assert.equal(snoozed.expression, 'sleepy');
  assert.equal(snoozed.label, 'Snoozed');
});

test('resolveIslandMeta picks sad EMO eyes for deleted reminders and respects explicit overrides', () => {
  const deleted = resolveIslandMeta({ text: 'Deleted "Old task"', tone: 'danger' });
  assert.equal(deleted.expression, 'sad');

  const custom = resolveIslandMeta({
    title: 'Alarm Ready',
    text: 'Custom override',
    expression: 'excited',
  });
  assert.equal(custom.expression, 'excited');
  assert.equal(custom.label, 'Alarm Ready');
});

test('buildIslandEventFromTrigger maps created, success, and alert triggers to EMO expressions', () => {
  const created = buildIslandEventFromTrigger('created', undefined, 'evt-1');
  assert.equal(created.id, 'evt-1');
  assert.equal(created.expression, 'excited');
  assert.equal(resolveIslandMeta(created).expression, 'excited');

  const success = buildIslandEventFromTrigger(
    'success',
    { title: 'Synced', message: 'Calendar updated' },
    'evt-2'
  );
  assert.equal(success.expression, 'happy');
  assert.equal(success.title, 'Synced');
  assert.equal(success.text, 'Calendar updated');

  const alert = buildIslandEventFromTrigger('alert', { message: 'Alarm ringing now' }, 'evt-3');
  assert.equal(alert.expression, 'warning');
  assert.equal(alert.tone, 'warning');
  assert.equal(alert.text, 'Alarm ringing now');
});

test('getEyeAnimationCycle sequences blink, happy, excited, and alert steps per event type', () => {
  const createdSteps = getEyeAnimationCycle('excited').map((f) => f.step);
  assert.deepEqual(createdSteps, ['excited', 'blink', 'happy', 'blink']);

  const successSteps = getEyeAnimationCycle('happy').map((f) => f.step);
  assert.deepEqual(successSteps, ['happy', 'blink', 'excited', 'happy']);

  const alertSteps = getEyeAnimationCycle('warning').map((f) => f.step);
  assert.deepEqual(alertSteps, ['alert', 'blink', 'alert', 'curious']);

  assert.equal(getEyeCssClasses('excited').groupClass, 'emo-eyes-excited');
  assert.equal(getEyeCssClasses('happy').groupClass, 'emo-eyes-happy');
  assert.equal(getEyeCssClasses('alert').groupClass, 'emo-eyes-alert');
  assert.equal(getEyeCssClasses('blink').eyeClass, 'emo-eye-blink');
});
