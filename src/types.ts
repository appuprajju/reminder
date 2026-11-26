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

export type AmbientSoundId = 'off' | 'rain' | 'brown-noise' | 'ocean' | 'warm-pad';

export type TabId = 'today' | 'schedule' | 'insights' | 'profile';

export type FilterMode = 'all' | 'alarms' | 'todo' | 'done';

export interface SubtaskItem {
  id: string;
  title: string;
  done: boolean;
}

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
  subtasks?: SubtaskItem[];
  googleCalendarEventId?: string | null;
  createdAt: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  tz: string;
  createdAt: number;
  admin?: boolean;
  photoURL?: string | null;
  authProvider?: 'firebase' | 'server';
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

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  startIso: string;
  endIso?: string;
  dateKey: string; // YYYY-MM-DD
  timeHm: string; // HH:mm (or '09:00' for all-day)
  allDay: boolean;
  htmlLink?: string;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  snippet: string;
  dateIso: string;
  isStarred: boolean;
}

export interface RoutinePack {
  id: string;
  name: string;
  subtitle: string;
  emoji: string;
  items: {
    title: string;
    note: string;
    time: string;
    days: number[] | null;
    emoji: string;
    color: string;
    priority: Priority;
    tag: string;
    isAlarm: boolean;
    subtasks?: { title: string }[];
  }[];
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

export type EmoExpression = 'excited' | 'happy' | 'sleepy' | 'curious' | 'warning' | 'sad';

export type DynamicIslandTriggerType = 'created' | 'success' | 'alert';

export interface DynamicIslandTriggerOptions {
  title?: string;
  message?: string;
  durationMs?: number;
  undoLabel?: string;
  onUndo?: () => void;
}

export type TriggerIslandFn = (
  type: DynamicIslandTriggerType,
  options?: DynamicIslandTriggerOptions
) => void;

export interface ToastMessage {
  id: string;
  text: string;
  title?: string;
  expression?: EmoExpression;
  tone?: 'info' | 'success' | 'warning' | 'danger';
  undoLabel?: string;
  onUndo?: () => void;
}
