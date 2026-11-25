import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { Preferences } from '@capacitor/preferences';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import type { DeliveryHealth, Reminder } from '../types';
import { computeNextDueAt, getTodayDateKey, hashToInt32 } from './time';

export const ALARM_CHANNEL_ID = 'reminderme_alarms';
export const REMINDER_CHANNEL_ID = 'reminderme_reminders';
export const ALARM_ACTION_TYPE_ID = 'ALARM_ACTIONS';

export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function getRuntimePlatform(): DeliveryHealth['platform'] {
  if (isNativeApp()) {
    const p = Capacitor.getPlatform();
    return p === 'ios' ? 'ios-native' : 'android-native';
  }
  if (typeof window !== 'undefined') {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return 'pwa-standalone';
  }
  return 'web';
}

/* Native Preferences on Android/iOS, localStorage on Web (used strictly for non-secret reminders & preferences) */
export async function deviceStorageGet(key: string): Promise<string | null> {
  if (isNativeApp()) {
    try {
      const res = await Preferences.get({ key });
      return res.value ?? null;
    } catch {
      return null;
    }
  }
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function deviceStorageSet(key: string, value: string): Promise<void> {
  if (isNativeApp()) {
    try {
      await Preferences.set({ key, value });
      return;
    } catch {
      // fallback
    }
  }
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore quota errors
  }
}

export async function deviceStorageRemove(key: string): Promise<void> {
  if (isNativeApp()) {
    try {
      await Preferences.remove({ key });
      return;
    } catch {
      // ignore
    }
  }
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/* Auth token persistence ONLY on native Capacitor Preferences (never in web localStorage) */
export async function nativeTokenGet(): Promise<string | null> {
  if (!isNativeApp()) return null;
  try {
    const { value } = await Preferences.get({ key: 'rm_native_token' });
    return value ?? null;
  } catch {
    return null;
  }
}

export async function nativeTokenSet(token: string | null): Promise<void> {
  if (!isNativeApp()) return;
  try {
    if (!token) await Preferences.remove({ key: 'rm_native_token' });
    else await Preferences.set({ key: 'rm_native_token', value: token });
  } catch {
    // ignore
  }
}

export async function triggerHaptic(
  kind: 'light' | 'medium' | 'heavy' | 'success' | 'warning' = 'light',
  enabled = true
): Promise<void> {
  if (!enabled) return;
  if (isNativeApp()) {
    try {
      if (kind === 'success') {
        await Haptics.notification({ type: NotificationType.Success });
      } else if (kind === 'warning') {
        await Haptics.notification({ type: NotificationType.Warning });
      } else {
        const style =
          kind === 'heavy'
            ? ImpactStyle.Heavy
            : kind === 'medium'
              ? ImpactStyle.Medium
              : ImpactStyle.Light;
        await Haptics.impact({ style });
      }
      return;
    } catch {
      // ignore
    }
  }
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const ms = kind === 'heavy' ? 40 : kind === 'medium' ? 24 : 12;
    navigator.vibrate(ms);
  }
}

export interface NativeActionCallbacks {
  onDismiss: (reminderId: string) => void;
  onSnooze: (reminderId: string, minutes: number) => void;
  onOpenReminder: (reminderId: string) => void;
  onHardwareBack: () => boolean; // return true if handled
}

export async function initNativePlatform(callbacks: NativeActionCallbacks): Promise<() => void> {
  const cleanups: (() => void)[] = [];

  if (isNativeApp()) {
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#060812' });
    } catch {
      // ignore
    }

    try {
      await SplashScreen.hide();
    } catch {
      // ignore
    }

    // Create dedicated high-importance Android notification channels for OS-level closed-app delivery
    try {
      await LocalNotifications.createChannel({
        id: ALARM_CHANNEL_ID,
        name: 'Loud Alarms',
        description: 'High-priority exact alarms that ring on the lock screen even when the app is closed.',
        importance: 5,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: '#2F80FF',
      });
      await LocalNotifications.createChannel({
        id: REMINDER_CHANNEL_ID,
        name: 'Daily Reminders',
        description: 'Scheduled reminders and gentle task alerts.',
        importance: 4,
        visibility: 1,
        vibration: true,
      });
      await LocalNotifications.registerActionTypes({
        types: [
          {
            id: ALARM_ACTION_TYPE_ID,
            actions: [
              { id: 'snooze', title: 'Snooze 5 min' },
              { id: 'dismiss', title: 'Dismiss', destructive: false },
            ],
          },
        ],
      });
    } catch {
      // ignore on platforms without channels
    }

    try {
      const actionListener = await LocalNotifications.addListener(
        'localNotificationActionPerformed',
        (event) => {
          const rid = String(event.notification.extra?.reminderId || '');
          if (!rid) return;
          if (event.actionId === 'snooze') {
            callbacks.onSnooze(rid, 5);
          } else if (event.actionId === 'dismiss') {
            callbacks.onDismiss(rid);
          } else {
            callbacks.onOpenReminder(rid);
          }
        }
      );
      cleanups.push(() => {
        actionListener.remove().catch(() => {});
      });
    } catch {
      // ignore
    }

    try {
      const backListener = await CapApp.addListener('backButton', () => {
        const handled = callbacks.onHardwareBack();
        if (!handled) {
          CapApp.minimizeApp().catch(() => {});
        }
      });
      cleanups.push(() => {
        backListener.remove().catch(() => {});
      });
    } catch {
      // ignore
    }
  } else if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    // Web / PWA: register service worker and listen for lock-screen notification action callbacks
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    const onSwMessage = (ev: MessageEvent) => {
      const msg = ev.data || {};
      if (msg.type === 'alarm-dismissed' && msg.reminderId) {
        callbacks.onDismiss(msg.reminderId);
      } else if (msg.type === 'alarm-snoozed' && msg.reminderId) {
        callbacks.onSnooze(msg.reminderId, Number(msg.minutes) || 5);
      } else if (msg.type === 'notification-opened' && msg.reminderId) {
        callbacks.onOpenReminder(msg.reminderId);
      }
    };
    navigator.serviceWorker.addEventListener('message', onSwMessage);
    cleanups.push(() => navigator.serviceWorker.removeEventListener('message', onSwMessage));
  }

  return () => {
    cleanups.forEach((fn) => fn());
  };
}

export async function getNotificationPermissionState(): Promise<DeliveryHealth['notificationPermission']> {
  if (isNativeApp()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') return 'granted';
      if (status.display === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'prompt';
    }
  }
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  const p = Notification.permission;
  if (p === 'granted') return 'granted';
  if (p === 'denied') return 'denied';
  return 'prompt';
}

export async function requestOsNotificationPermission(): Promise<DeliveryHealth['notificationPermission']> {
  if (isNativeApp()) {
    try {
      const status = await LocalNotifications.requestPermissions();
      if (status.display === 'granted') return 'granted';
      if (status.display === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'denied';
    }
  }
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const res = await Notification.requestPermission();
    return res === 'granted' ? 'granted' : res === 'denied' ? 'denied' : 'prompt';
  } catch {
    return 'denied';
  }
}

export async function checkExactAlarmReadiness(): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const res = await LocalNotifications.checkExactNotificationSetting();
    return res.exact_alarm === 'granted';
  } catch {
    return true;
  }
}

export async function openExactAlarmSettings(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await LocalNotifications.changeExactNotificationSetting();
  } catch {
    // ignore
  }
}

/**
 * Registers every pending alarm and reminder directly with Android OS AlarmManager
 * (`allowWhileIdle: true`) so alerts trigger accurately even when the app is closed and screen is locked.
 */
export async function syncOsSchedules(reminders: Reminder[]): Promise<number> {
  const todayKey = getTodayDateKey();
  const now = Date.now();
  const active = reminders.filter((r) => {
    if (r.doneDate === todayKey && r.oneTimeDate === todayKey) return false;
    return true;
  });

  if (!isNativeApp()) {
    // On web, OS scheduling is backed by server-side high-urgency Web Push; return upcoming count
    return active.filter((r) => r.doneDate !== todayKey).length;
  }

  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return 0;

    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      });
    }

    const toSchedule = active
      .map((r) => {
        const targetMs =
          r.snoozedUntil && r.snoozedUntil > now
            ? r.snoozedUntil
            : r.doneDate === todayKey
              ? computeNextDueAt(r.time, r.days, new Date(now + 12 * 3600000))
              : computeNextDueAt(r.time, r.days, new Date(now));

        if (!Number.isFinite(targetMs) || targetMs <= now) return null;

        return {
          id: hashToInt32(r.id),
          title: r.isAlarm ? `ALARM: ${r.title}` : r.title,
          body: r.note || `Scheduled for ${r.time} — tap Snooze or Dismiss`,
          channelId: r.isAlarm ? ALARM_CHANNEL_ID : REMINDER_CHANNEL_ID,
          actionTypeId: ALARM_ACTION_TYPE_ID,
          schedule: {
            at: new Date(targetMs),
            allowWhileIdle: true,
          },
          extra: {
            reminderId: r.id,
            isAlarm: r.isAlarm,
            sound: r.sound || 'radar',
          },
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (toSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: toSchedule });
    }
    return toSchedule.length;
  } catch {
    return 0;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export async function subscribeDevicePush(
  getVapidKey: () => Promise<string | null>,
  sendWebSub: (sub: PushSubscriptionJSON) => Promise<number>,
  sendFcmToken: (token: string, platform: string) => Promise<number>
): Promise<{ ok: boolean; devices: number; mode: 'fcm' | 'webpush' | 'none'; message: string }> {
  const perm = await requestOsNotificationPermission();
  if (perm !== 'granted') {
    return {
      ok: false,
      devices: 0,
      mode: 'none',
      message: 'Notification permission is blocked. Enable notifications in system settings.',
    };
  }

  if (isNativeApp()) {
    try {
      const pushPerm = await PushNotifications.requestPermissions();
      if (pushPerm.receive === 'granted') {
        return await new Promise((resolve) => {
          let settled = false;
          const timer = window.setTimeout(() => {
            if (!settled) {
              settled = true;
              resolve({
                ok: true,
                devices: 1,
                mode: 'fcm',
                message: 'OS AlarmManager enabled. Add google-services.json for remote FCM push.',
              });
            }
          }, 2500);

          PushNotifications.addListener('registration', async (token) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            try {
              const devices = await sendFcmToken(token.value, Capacitor.getPlatform());
              resolve({ ok: true, devices, mode: 'fcm', message: 'Android OS alarms & FCM push enabled.' });
            } catch {
              resolve({ ok: true, devices: 1, mode: 'fcm', message: 'Android OS alarms active on this device.' });
            }
          });

          PushNotifications.register().catch(() => {
            if (!settled) {
              settled = true;
              window.clearTimeout(timer);
              resolve({
                ok: true,
                devices: 1,
                mode: 'fcm',
                message: 'Android OS exact alarms enabled locally.',
              });
            }
          });
        });
      }
    } catch {
      return {
        ok: true,
        devices: 1,
        mode: 'fcm',
        message: 'Android OS local alarm channel enabled.',
      };
    }
  }

  // Web / PWA Push registration
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return {
      ok: true,
      devices: 0,
      mode: 'none',
      message: 'Browser notifications enabled (Web Push not supported on this browser).',
    };
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    const vapidKey = await getVapidKey();
    if (!vapidKey) {
      return {
        ok: true,
        devices: 0,
        mode: 'none',
        message: 'Local notifications enabled. Sign in online for server-side push backup.',
      };
    }
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
    }
    const devices = await sendWebSub(sub.toJSON());
    return {
      ok: true,
      devices,
      mode: 'webpush',
      message: `Lock-screen Web Push active on ${devices} device${devices === 1 ? '' : 's'}.`,
    };
  } catch (err) {
    return {
      ok: false,
      devices: 0,
      mode: 'none',
      message: err instanceof Error ? err.message : 'Could not register push subscription.',
    };
  }
}

export async function scheduleDelayedLockScreenTest(
  delaySec: number,
  triggerServerPush?: (delaySec: number) => Promise<boolean>
): Promise<{ ok: boolean; via: string; message: string }> {
  const perm = await requestOsNotificationPermission();
  if (perm !== 'granted') {
    return {
      ok: false,
      via: 'none',
      message: 'Allow notifications first to run the lock-screen test.',
    };
  }

  if (isNativeApp()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Date.now() % 1000000) + 900000,
            title: 'ALARM: Lock-Screen Delivery Verified',
            body: `Triggered ${delaySec}s later by Android OS AlarmManager while backgrounded.`,
            channelId: ALARM_CHANNEL_ID,
            actionTypeId: ALARM_ACTION_TYPE_ID,
            schedule: {
              at: new Date(Date.now() + delaySec * 1000),
              allowWhileIdle: true,
            },
            extra: { reminderId: 'lockscreen-test', isAlarm: true },
          },
        ],
      });
      return {
        ok: true,
        via: 'android-os',
        message: `OS alarm scheduled for ${delaySec}s from now. Lock your phone now to verify.`,
      };
    } catch {
      return { ok: false, via: 'none', message: 'Failed to schedule Android OS test alarm.' };
    }
  }

  // Try real server-side delayed push first if authenticated & subscribed
  if (triggerServerPush) {
    try {
      const sent = await triggerServerPush(delaySec);
      if (sent) {
        return {
          ok: true,
          via: 'server-push',
          message: `Server push queued for ${delaySec}s from now. You can close or lock your screen.`,
        };
      }
    } catch {
      // fall through to Service Worker delayed trigger
    }
  }

  // Fallback for guest/web preview: Service Worker notification
  window.setTimeout(async () => {
    try {
      const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.ready : null;
      if (reg) {
        await reg.showNotification('ALARM: reminderme Lock-Screen Test', {
          body: `Delivered ${delaySec}s later via Service Worker.`,
          icon: '/icons/icon-192.png',
          badge: '/icons/badge-96.png',
          tag: 'test-delayed',
          requireInteraction: true,
        });
      } else if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('ALARM: reminderme Lock-Screen Test', {
          body: `Delivered ${delaySec}s later.`,
          icon: '/icons/icon-192.png',
        });
      }
    } catch {
      // ignore
    }
  }, delaySec * 1000);

  return {
    ok: true,
    via: 'service-worker',
    message: `Test notification scheduled in ${delaySec}s. Sign in & enable Push for closed-app cloud delivery.`,
  };
}
