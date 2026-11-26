import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rulesText = fs.readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8');

test('Firestore rules enforce default-deny global safety net and rules_version 2', () => {
  assert.match(rulesText, /rules_version\s*=\s*'2'/);
  assert.match(rulesText, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}/);
});

test('Firestore rules enforce Dirty Dozen security invariants (verified owner, strict keys, bounds, immutability, request.time)', () => {
  assert.match(rulesText, /request\.auth\.token\.email_verified == true/);
  assert.match(rulesText, /function isValidId\(id\)/);
  assert.match(rulesText, /function isValidUserProfile\(data, userId\)/);
  assert.match(rulesText, /function isValidReminder\(data, userId, reminderId\)/);
  assert.match(rulesText, /data\.title\.size\(\) <= 120/);
  assert.match(rulesText, /data\.note\.size\(\) <= 400/);
  assert.match(rulesText, /data\.days\.size\(\) <= 7/);
  assert.match(rulesText, /data\.subtasks\.size\(\) <= 25/);
  assert.match(rulesText, /incoming\(\)\.createdAt == request\.time/);
  assert.match(rulesText, /incoming\(\)\.updatedAt == request\.time/);
  assert.match(rulesText, /incoming\(\)\.ownerId == existing\(\)\.ownerId/);
  assert.match(rulesText, /incoming\(\)\.diff\(existing\(\)\)\.affectedKeys\(\)\.hasOnly\(/);
  assert.match(rulesText, /allow list: if isOwner\(userId\)[\s\S]*existing\(\)\.ownerId == request\.auth\.uid/);
  assert.match(rulesText, /exists\(\/databases\/\$\(database\)\/documents\/users\/\$\(userId\)\)/);
});
