export type Priority = 'high' | 'med' | 'low';

export type AlarmSoundId =
  | 'radar'
  | 'marimba'
  | 'apex'
  | 'digital-alarm'
  | 'morning'
  | 'synth'
  | 'gong'
  | 'custom';

export type NotifSoundId = 'glass' | 'digital' | 'bell' | 'zen' | 'droplet';

export type TabId = 'today' | 'schedule' | 'insights' | 'profile';

export type FilterMode = 'all' | 'alarms' | 'todo' | 'done';

export interface Reminder {
  id: string;
  title: string;
  note: string;
  time: string; // HH:mm (24h)
  dueAt: number; // UTC ms
  dueAtUtc?: string;
  sent?: boolean;
  days: number[] | null; // 0=Sun..6=Sat, null = daily/repeating or single occurrence handled via oneTimeDate
  oneTimeDate?: string | null; // YYYY-MM-DD for specific date
  emoji: string;
  color: string;
  priority: Priority;
  tag: string | null;
  isAlarm: boolean;
  sound: AlarmSoundId | string | null;
  doneDate: string | null; // YYYY-MM-DD
  snoozedUntil?: number | null;
  createdAt: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  tz: string;
  createdAt: number;
  admin?: boolean;
}

export interface UserPreferences {
  timeFormat: '12h' | '24h';
  autoDeleteCompleted: boolean;
  defaultNotifSound: NotifSoundId;
  defaultAlarmSound: AlarmSoundId;
  alarmDurationSec: number; // 0 = continuous
  vibrate: boolean;
  customTags: string[];
  customAudioName: string | null;
  serverBaseUrl: string;
}

export interface LocalActivityEvent {
  type: string;
  ts: number;
  meta?: Record<string, unknown>;
}

export interface AnalyticsSummary {
  totalEvents: number;
  users: number;
  reminders: number;
  pushDevices?: number;
  features: { feature: string; count: number }[];
  last7: { day: string; events: number; done: number }[];
  hoursUtc?: number[];
  perUser?: {
    email: string;
    name: string;
    reminders: number;
    devices: number;
    events: number;
    lastSeen: number;
  }[];
}

export interface DeliveryHealth {
  platform: 'android-native' | 'ios-native' | 'pwa-standalone' | 'web';
  notificationPermission: 'granted' | 'denied' | 'prompt' | 'unsupported';
  exactAlarmReady: boolean;
  pushSubscribed: boolean;
  pushDevices: number;
  osScheduledCount: number;
  swRegistered: boolean;
  lastServerSync: number | null;
}

export interface ToastMessage {
  id: string;
  text: string;
  tone?: 'info' | 'success' | 'warning' | 'danger';
  undoLabel?: string;
  onUndo?: () => void;
}
