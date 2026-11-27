import test from 'node:test';
import assert from 'node:assert/strict';
import { detectDeviceOs, getPlatformAssistantProfile } from './platform';

test('detectDeviceOs detects iOS on iPhone, iPad, iPadOS Safari, and Capacitor iOS', () => {
  assert.equal(
    detectDeviceOs({
      nativePlatform: 'web',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)',
      maxTouchPoints: 5,
    }),
    'ios'
  );

  assert.equal(
    detectDeviceOs({
      nativePlatform: 'web',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
      platform: 'MacIntel',
      maxTouchPoints: 5,
    }),
    'ios'
  );

  assert.equal(detectDeviceOs({ nativePlatform: 'ios' }), 'ios');
});

test('detectDeviceOs detects Android on mobile Chrome and Capacitor Android', () => {
  assert.equal(
    detectDeviceOs({
      nativePlatform: 'web',
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36',
      maxTouchPoints: 5,
    }),
    'android'
  );

  assert.equal(detectDeviceOs({ nativePlatform: 'android' }), 'android');
});

test('detectDeviceOs detects Desktop on macOS/Windows browsers without mobile UA', () => {
  assert.equal(
    detectDeviceOs({
      nativePlatform: 'web',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/125.0.0.0',
      platform: 'MacIntel',
      maxTouchPoints: 0,
    }),
    'desktop'
  );

  assert.equal(
    detectDeviceOs({
      nativePlatform: 'web',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0.0.0',
      maxTouchPoints: 0,
    }),
    'desktop'
  );
});

test('getPlatformAssistantProfile maps strictly OS-specific labels without cross-OS leakage', () => {
  const ios = getPlatformAssistantProfile('ios');
  assert.equal(ios.buttonLabel, 'Hey Siri');
  assert.equal(ios.sectionTitle.toLowerCase().includes('google'), false);

  const android = getPlatformAssistantProfile('android');
  assert.equal(android.buttonLabel, 'Hey Google');
  assert.equal(android.sectionTitle.toLowerCase().includes('siri'), false);

  const desktop = getPlatformAssistantProfile('desktop');
  assert.equal(desktop.buttonLabel, 'Hands-Free Voice');
  assert.equal(desktop.sectionTitle.toLowerCase().includes('siri'), false);
  assert.equal(desktop.sectionTitle.toLowerCase().includes('google'), false);
});
