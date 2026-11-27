import { Capacitor } from '@capacitor/core';
import type { DeviceOs } from '../types';
import type { LiveAssistantSource } from './liveAssistant';

export interface PlatformAssistantProfile {
  os: DeviceOs;
  source: LiveAssistantSource;
  buttonLabel: string;
  assistantName: string;
  sectionTitle: string;
  handsFreeTitle: string;
  wakeExample: string;
  listeningTitle: string;
  profileSubtitle: string;
  footerHint: string;
}

/**
 * Accurately detects whether the current user is on iOS (iPhone/iPad),
 * Android, or Desktop (neither iOS nor Android).
 */
export function detectDeviceOs(opts?: {
  nativePlatform?: string;
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
}): DeviceOs {
  let nativePlatform = opts?.nativePlatform;
  if (nativePlatform === undefined) {
    try {
      if (Capacitor.isNativePlatform()) {
        nativePlatform = Capacitor.getPlatform();
      }
    } catch {
      // web fallback
    }
  }

  if (nativePlatform === 'ios') return 'ios';
  if (nativePlatform === 'android') return 'android';

  const ua =
    opts?.userAgent ??
    (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '');
  const plat =
    opts?.platform ??
    (typeof navigator !== 'undefined' ? navigator.platform || '' : '');
  const touchPoints =
    opts?.maxTouchPoints ??
    (typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0);

  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  // Modern iPadOS reports Macintosh in UA with multi-touch support
  if ((/macintosh/i.test(ua) || /macintel/i.test(plat)) && touchPoints > 1) {
    return 'ios';
  }
  if (/android/i.test(ua)) return 'android';

  return 'desktop';
}

export function getPlatformAssistantProfile(os: DeviceOs): PlatformAssistantProfile {
  if (os === 'ios') {
    return {
      os: 'ios',
      source: 'siri',
      buttonLabel: 'Hey Siri',
      assistantName: 'Siri',
      sectionTitle: 'Live Siri Voice',
      handsFreeTitle: 'Hands-Free “Hey Siri”',
      wakeExample: '“Hey Siri, add a reminder to take medicine at 9pm”',
      listeningTitle: 'Hey Siri · Listening…',
      profileSubtitle: '1-tap live Siri voice & hands-free “Hey Siri”',
      footerHint:
        'Works live with 1 tap right here on iPhone & iPad. System-level lock-screen Siri Shortcuts activate automatically in the iOS app.',
    };
  }

  if (os === 'android') {
    return {
      os: 'android',
      source: 'google-assistant',
      buttonLabel: 'Hey Google',
      assistantName: 'Google Assistant',
      sectionTitle: 'Live Google Assistant',
      handsFreeTitle: 'Hands-Free “Hey Google”',
      wakeExample: '“Hey Google, add a reminder to take medicine at 9pm”',
      listeningTitle: 'Hey Google · Listening…',
      profileSubtitle: '1-tap live Google Assistant & hands-free “Hey Google”',
      footerHint:
        'Works live with 1 tap right here on Android. Lock-screen “Hey Google” App Actions activate automatically in the Android app.',
    };
  }

  return {
    os: 'desktop',
    source: 'voice',
    buttonLabel: 'Hands-Free Voice',
    assistantName: 'Hands-Free Voice',
    sectionTitle: 'Hands-Free Voice',
    handsFreeTitle: 'Hands-Free “Hey reminderme”',
    wakeExample: '“Hey reminderme, take medicine at 9pm”',
    listeningTitle: 'Hands-Free Voice · Listening…',
    profileSubtitle: '1-tap live voice commands & hands-free wake phrase',
    footerHint:
      'Works live in desktop Chrome, Edge, and Safari with 1 tap — no setup required.',
  };
}
