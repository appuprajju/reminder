import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_LANGUAGES,
  INDIA_STATES_AND_UTS,
  filterLanguagesByQuery,
  filterStatesByQuery,
  getLanguageOption,
  getLanguagesForState,
  getSpeechRecognitionLocale,
} from './indianLanguages';
import { getLocalizedGreeting, t } from './i18n';

test('INDIA_STATES_AND_UTS covers all 28 Indian states and 8 union territories (36 total)', () => {
  const states = INDIA_STATES_AND_UTS.filter((r) => r.kind === 'state');
  const uts = INDIA_STATES_AND_UTS.filter((r) => r.kind === 'ut');
  assert.equal(states.length, 28);
  assert.equal(uts.length, 8);
  assert.equal(INDIA_STATES_AND_UTS.length, 36);

  for (const region of INDIA_STATES_AND_UTS) {
    const langs = getLanguagesForState(region.id);
    assert.ok(langs.length >= 1, `Expected at least one language for ${region.name}`);
  }
});

test('APP_LANGUAGES includes all 22 Eighth Schedule Indian languages plus regional official languages', () => {
  const scheduled = APP_LANGUAGES.filter((l) => l.scheduled);
  assert.equal(scheduled.length, 22);

  // Spot-check major state languages and speech locales
  assert.equal(getLanguageOption('kn-IN').nativeName, 'ಕನ್ನಡ');
  assert.equal(getLanguageOption('ta-IN').nativeName, 'தமிழ்');
  assert.equal(getLanguageOption('te-IN').nativeName, 'తెలుగు');
  assert.equal(getLanguageOption('ml-IN').nativeName, 'മലയാളം');
  assert.equal(getLanguageOption('mr-IN').nativeName, 'मराठी');
  assert.equal(getLanguageOption('bn-IN').nativeName, 'বাংলা');
  assert.equal(getLanguageOption('gu-IN').nativeName, 'ગુજરાતી');
  assert.equal(getLanguageOption('pa-IN').nativeName, 'ਪੰਜਾਬੀ');
  assert.equal(getLanguageOption('or-IN').nativeName, 'ଓଡ଼ିଆ');
  assert.equal(getLanguageOption('as-IN').nativeName, 'অসমীয়া');
  assert.equal(getSpeechRecognitionLocale('kn-IN'), 'kn-IN');
  assert.equal(getSpeechRecognitionLocale('lus-IN'), 'en-IN');
});

test('search helpers find Indian states and languages by state name, English name, or native script', () => {
  assert.ok(filterStatesByQuery('Karnataka').some((s) => s.id === 'karnataka'));
  assert.ok(filterStatesByQuery('ಕನ್ನಡ').some((s) => s.id === 'karnataka'));
  assert.ok(filterStatesByQuery('Mizoram').some((s) => s.id === 'mizoram'));
  assert.ok(filterStatesByQuery('Ladakh').some((s) => s.id === 'ladakh'));
  assert.ok(filterLanguagesByQuery('Tamil').some((l) => l.id === 'ta-IN'));
  assert.ok(filterLanguagesByQuery('Kerala').some((l) => l.id === 'ml-IN'));
});

test('i18n helper returns authentic native script labels and falls back cleanly', () => {
  assert.equal(t('kn-IN', 'navToday'), 'ಇಂದು');
  assert.equal(t('hi-IN', 'newAlarm'), 'नया अलार्म');
  assert.equal(t('ta-IN', 'voiceNotes'), 'குரல் குறிப்புகள்');
  assert.equal(t('te-IN', 'recordNote'), 'రికార్డ్ నోట్');
  assert.equal(getLocalizedGreeting(new Date(2026, 0, 1, 8, 0), 'kn-IN'), 'ಶುಭೋದಯ');
  assert.equal(getLocalizedGreeting(new Date(2026, 0, 1, 8, 0), 'ml-IN'), 'സുപ്രഭാതം');
  assert.equal(t('unknown-code', 'navToday'), 'Today');
});
