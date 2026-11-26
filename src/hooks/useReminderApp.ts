import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, setApiBaseUrl, setAuthToken } from '../lib/api';
import { playNotificationChime, startAlarmSound, stopAlarmSound } from '../lib/audio';
import {
  clearWorkspaceAccessToken,
  ensureFirestoreUserProfile,
  getWorkspaceAccessToken,
  initFirebaseAuth,
  isFirestoreEnabled,
  signInWithGoogleWorkspace,
  signOutFirebase,
  subscribeFirestoreReminders,
  subscribeWorkspaceToken,
  syncAllRemindersToFirestore,
} from '../lib/firebase';
import { buildReminderIcs, buildScheduleIcs, downloadIcsFile } from '../lib/icsExport';
import {
  checkExactAlarmReadiness,
  deviceStorageGet,
  deviceStorageSet,
  getNotificationPermissionState,
  getRuntimePlatform,
  initNativePlatform,
  scheduleDelayedLockScreenTest,
  subscribeDevicePush,
  syncOsSchedules,
  triggerHaptic,
} from '../lib/nativeBridge';
import { computeNextDueAt, getTodayDateKey } from '../lib/time';
import {
  WorkspaceAuthError,
  createGoogleCalendarEvent,
  fetchRecentGmailMessages,
  fetchUpcomingCalendarEvents,
  sendGmailMessage,
} from '../lib/workspaceApi';
import type {
  AlarmSoundId,
  AnalyticsSummary,
  DeliveryHealth,
  EmoExpression,
  GmailMessageSummary,
  GoogleCalendarEvent,
  LocalActivityEvent,
  Reminder,
  RoutinePack,
  ToastMessage,
  UserPreferences,
  UserProfile,
} from '../types';
import { useOnlineStatus } from './usePWAInstall';

const KEY_REMINDERS = 'rm_reminders_v3';
const KEY_PREFS = 'rm_prefs_v3';
const KEY_EVENTS = 'rm_events_v3';
const KEY_PENDING_SYNC = 'rm_pending_sync_v3';
const KEY_SIGNED_IN_HINT = 'rm_signed_in_hint_v3';

const DEFAULT_PREFS: UserPreferences = {
  timeFormat: '12h',
  autoDeleteCompleted: false,
  defaultNotifSound: 'glass',
  defaultAlarmSound: 'radar',
  alarmDurationSec: 30,
  vibrate: true,
  customTags: ['Health', 'Work', 'Focus', 'Personal'],
  customAudioName: null,
  serverBaseUrl: '',
};

function createStarterReminders(): Reminder[] {
  const now = new Date();
  const base = now.getTime();
  return [
    {
      id: 'starter-morning-water',
      title: 'Morning hydration & vitamins',
      note: 'Full glass of water before coffee',
      time: '08:00',
      dueAt: computeNextDueAt('08:00', null, now),
      days: null,
      emoji: '💧',
      color: '#0A84FF',
      priority: 'high',
      tag: 'Health',
      isAlarm: true,
      sound: 'morning',
      doneDate: null,
      subtasks: [
        { id: 'st-water-1', title: 'Drink 500ml water', done: false },
        { id: 'st-water-2', title: 'Take daily vitamins', done: false },
      ],
      createdAt: base - 3000,
    },
    {
      id: 'starter-deep-focus',
      title: 'Deep work sprint',
      note: 'Silence distractions for 25 minutes',
      time: '10:30',
      dueAt: computeNextDueAt('10:30', [1, 2, 3, 4, 5], now),
      days: [1, 2, 3, 4, 5],
      emoji: '🎯',
      color: '#6366F1',
      priority: 'med',
      tag: 'Work',
      isAlarm: false,
      sound: null,
      doneDate: null,
      subtasks: [],
      createdAt: base - 2000,
    },
    {
      id: 'starter-evening-winddown',
      title: 'Evening screen-off alarm',
      note: 'Prepare tomorrow’s top 3 priorities',
      time: '22:00',
      dueAt: computeNextDueAt('22:00', null, now),
      days: null,
      emoji: '🌙',
      color: '#30D158',
      priority: 'low',
      tag: 'Personal',
      isAlarm: true,
      sound: 'gong',
      doneDate: null,
      subtasks: [],
      createdAt: base - 1000,
    },
  ];
}

function makeId(prefix = 'r') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function formatServerAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/failed to fetch|networkerror|load failed|timed out/i.test(msg)) {
    return 'No custom backend server is reachable on this host. Use "Sign in with Google" above for instant serverless cloud sync.';
  }
  return msg || 'Authentication failed';
}

export function useReminderApp(onHardwareBack: () => boolean) {
  const isOnline = useOnlineStatus();
  const [hydrated, setHydrated] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFS);
  const [events, setEvents] = useState<LocalActivityEvent[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [workspaceToken, setWorkspaceToken] = useState<string | null>(() => getWorkspaceAccessToken());
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'offline' | 'error'>('idle');
  const [pendingSync, setPendingSync] = useState(false);
  const [ringingReminder, setRingingReminder] = useState<Reminder | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [deliveryHealth, setDeliveryHealth] = useState<DeliveryHealth>({
    platform: getRuntimePlatform(),
    notificationPermission: 'prompt',
    exactAlarmReady: false,
    pushSubscribed: false,
    pushDevices: 0,
    osScheduledCount: 0,
    swRegistered: false,
    lastServerSync: null,
  });

  // Google Workspace live state (Calendar & Gmail)
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [gmailMessages, setGmailMessages] = useState<GmailMessageSummary[]>([]);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailError, setGmailError] = useState<string | null>(null);

  const firedInSessionRef = useRef<Set<string>>(new Set());
  const remindersRef = useRef<Reminder[]>([]);
  const prefsRef = useRef<UserPreferences>(DEFAULT_PREFS);
  const userRef = useRef<UserProfile | null>(null);
  const cloudIdsRef = useRef<Set<string>>(new Set());
  const firestoreUnsubRef = useRef<(() => void) | null>(null);
  const firestoreReadyRef = useRef<boolean>(false);

  remindersRef.current = reminders;
  prefsRef.current = prefs;
  userRef.current = user;

  const pushToast = useCallback(
    (
      text: string,
      opts?: {
        title?: string;
        tone?: ToastMessage['tone'];
        expression?: EmoExpression;
        undoLabel?: string;
        onUndo?: () => void;
      }
    ) => {
      const id = makeId('t');
      setToasts((prev) => [...prev.slice(-2), { id, text, ...opts }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, opts?.onUndo ? 5600 : 3400);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const recordEvent = useCallback((type: string, meta?: Record<string, unknown>) => {
    const ev: LocalActivityEvent = { type, ts: Date.now(), meta };
    setEvents((prev) => {
      const next = [...prev.slice(-499), ev];
      deviceStorageSet(KEY_EVENTS, JSON.stringify(next));
      return next;
    });
    if (userRef.current?.authProvider === 'server' && navigator.onLine) {
      api.sendEvents([ev]).catch(() => {});
    }
  }, []);

  const refreshDeliveryHealth = useCallback(async (overrideDevices?: number) => {
    const [perm, exact] = await Promise.all([
      getNotificationPermissionState(),
      checkExactAlarmReadiness(),
    ]);
    let swRegistered = false;
    let pushSub = false;
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        swRegistered = !!reg;
        if (reg && 'pushManager' in reg) {
          const sub = await reg.pushManager.getSubscription();
          pushSub = !!sub;
        }
      } catch {
        // ignore
      }
    }
    const osScheduledCount = await syncOsSchedules(remindersRef.current);
    setDeliveryHealth((prev) => ({
      ...prev,
      platform: getRuntimePlatform(),
      notificationPermission: perm,
      exactAlarmReady: exact,
      swRegistered,
      pushSubscribed: overrideDevices !== undefined ? overrideDevices > 0 : pushSub || prev.pushSubscribed,
      pushDevices: overrideDevices !== undefined ? overrideDevices : prev.pushDevices,
      osScheduledCount,
    }));
  }, []);

  const syncTimerRef = useRef<number | null>(null);

  const syncWithCloud = useCallback(async (listToSync: Reminder[]) => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    if (!navigator.onLine) {
      setPendingSync(true);
      setSyncStatus('offline');
      deviceStorageSet(KEY_PENDING_SYNC, '1');
      return;
    }

    setSyncStatus('syncing');
    try {
      if (currentUser.authProvider === 'firebase') {
        if (!isFirestoreEnabled || !firestoreReadyRef.current) {
          setSyncStatus('idle');
          return;
        }
        await syncAllRemindersToFirestore(currentUser.id, listToSync, cloudIdsRef.current);
        cloudIdsRef.current = new Set(listToSync.map((r) => r.id));
      } else {
        await api.saveReminders(listToSync);
      }
      setPendingSync(false);
      setSyncStatus('synced');
      deviceStorageSet(KEY_PENDING_SYNC, '0');
      setDeliveryHealth((prev) => ({ ...prev, lastServerSync: Date.now() }));
    } catch {
      setPendingSync(true);
      setSyncStatus('error');
      deviceStorageSet(KEY_PENDING_SYNC, '1');
    }
  }, []);

  const scheduleCloudSync = useCallback(
    (listToSync: Reminder[]) => {
      if (!userRef.current) return;
      if (syncTimerRef.current !== null) {
        window.clearTimeout(syncTimerRef.current);
      }
      syncTimerRef.current = window.setTimeout(() => {
        syncTimerRef.current = null;
        void syncWithCloud(listToSync);
      }, 320);
    },
    [syncWithCloud]
  );

  useEffect(() => {
    const flushPending = () => {
      if (syncTimerRef.current !== null) {
        window.clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
        void syncWithCloud(remindersRef.current);
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushPending();
    };
    window.addEventListener('pagehide', flushPending);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flushPending);
      document.removeEventListener('visibilitychange', onVisibility);
      if (syncTimerRef.current !== null) window.clearTimeout(syncTimerRef.current);
    };
  }, [syncWithCloud]);

  const commitReminders = useCallback(
    (updater: (prev: Reminder[]) => Reminder[], shouldSync = true) => {
      setReminders((prev) => {
        const next = updater(prev);
        deviceStorageSet(KEY_REMINDERS, JSON.stringify(next));
        syncOsSchedules(next).then((count) => {
          setDeliveryHealth((h) => ({ ...h, osScheduledCount: count }));
        });
        if (shouldSync && userRef.current) {
          scheduleCloudSync(next);
        }
        return next;
      });
    },
    [scheduleCloudSync]
  );

  const updatePrefs = useCallback((patch: Partial<UserPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      deviceStorageSet(KEY_PREFS, JSON.stringify(next));
      if (patch.serverBaseUrl !== undefined) {
        setApiBaseUrl(patch.serverBaseUrl);
      }
      return next;
    });
  }, []);

  /* Google Workspace Live Loaders */
  const refreshCalendarEvents = useCallback(async (tokenOverride?: string | null) => {
    const token = tokenOverride ?? getWorkspaceAccessToken();
    if (!token) {
      setCalendarEvents([]);
      return;
    }
    setCalendarLoading(true);
    setCalendarError(null);
    try {
      const items = await fetchUpcomingCalendarEvents(token, 14);
      setCalendarEvents(items);
    } catch (err) {
      if (err instanceof WorkspaceAuthError) {
        clearWorkspaceAccessToken();
      }
      setCalendarError(err instanceof Error ? err.message : 'Could not load Google Calendar');
    } finally {
      setCalendarLoading(false);
    }
  }, []);

  const refreshGmailMessages = useCallback(async (tokenOverride?: string | null) => {
    const token = tokenOverride ?? getWorkspaceAccessToken();
    if (!token) {
      setGmailMessages([]);
      return;
    }
    setGmailLoading(true);
    setGmailError(null);
    try {
      const msgs = await fetchRecentGmailMessages(token, 8);
      setGmailMessages(msgs);
    } catch (err) {
      if (err instanceof WorkspaceAuthError) {
        clearWorkspaceAccessToken();
      }
      setGmailError(err instanceof Error ? err.message : 'Could not load Gmail messages');
    } finally {
      setGmailLoading(false);
    }
  }, []);

  useEffect(() => {
    return subscribeWorkspaceToken((tok) => {
      setWorkspaceToken(tok);
    });
  }, []);

  /* Core CRUD + Subtask + Routine Actions */
  const upsertReminder = useCallback(
    (draft: Omit<Reminder, 'id' | 'createdAt' | 'dueAt' | 'doneDate'> & { id?: string }) => {
      const existing = draft.id ? remindersRef.current.find((r) => r.id === draft.id) : null;
      const dueAt = computeNextDueAt(draft.time, draft.days);
      const item: Reminder = {
        id: existing ? existing.id : makeId('r'),
        title: draft.title.trim() || 'Reminder',
        note: draft.note.trim(),
        time: draft.time,
        dueAt,
        dueAtUtc: new Date(dueAt).toISOString(),
        sent: false,
        days: draft.days && draft.days.length > 0 ? draft.days : null,
        oneTimeDate: draft.oneTimeDate || null,
        emoji: draft.emoji || (draft.isAlarm ? '⏰' : '🔔'),
        color: draft.color || '#0A84FF',
        priority: draft.priority || 'med',
        tag: draft.tag || null,
        isAlarm: draft.isAlarm,
        sound: draft.isAlarm ? draft.sound || prefsRef.current.defaultAlarmSound : null,
        doneDate: existing ? existing.doneDate : null,
        snoozedUntil: null,
        subtasks: draft.subtasks !== undefined ? draft.subtasks : existing?.subtasks || [],
        googleCalendarEventId:
          draft.googleCalendarEventId !== undefined
            ? draft.googleCalendarEventId
            : existing?.googleCalendarEventId || null,
        createdAt: existing ? existing.createdAt : Date.now(),
      };

      commitReminders((prev) => {
        if (existing) return prev.map((r) => (r.id === existing.id ? item : r));
        return [item, ...prev];
      });
      triggerHaptic('light', prefsRef.current.vibrate);
      recordEvent(existing ? 'reminder_edit' : 'reminder_add', { isAlarm: item.isAlarm });
      pushToast(
        existing ? `"${item.title}" updated` : `${item.title} · ${item.time}`,
        {
          title: existing ? 'Schedule Updated' : item.isAlarm ? 'Alarm Created' : 'Reminder Created',
          tone: 'success',
          expression: existing ? 'happy' : 'excited',
        }
      );
      return item;
    },
    [commitReminders, pushToast, recordEvent]
  );

  const toggleSubtask = useCallback(
    (reminderId: string, subtaskId: string) => {
      triggerHaptic('light', prefsRef.current.vibrate);
      const target = remindersRef.current.find((r) => r.id === reminderId);
      const updatedSubtasks = target?.subtasks?.map((st) =>
        st.id === subtaskId ? { ...st, done: !st.done } : st
      );
      commitReminders((prev) =>
        prev.map((r) => {
          if (r.id !== reminderId || !r.subtasks) return r;
          return {
            ...r,
            subtasks: r.subtasks.map((st) =>
              st.id === subtaskId ? { ...st, done: !st.done } : st
            ),
          };
        })
      );
      if (
        updatedSubtasks &&
        updatedSubtasks.length > 0 &&
        updatedSubtasks.every((st) => st.done) &&
        target?.subtasks?.some((st) => !st.done)
      ) {
        pushToast(`All ${updatedSubtasks.length} steps finished for "${target.title}"`, {
          title: 'Checklist Done',
          tone: 'success',
          expression: 'happy',
        });
      }
    },
    [commitReminders, pushToast]
  );

  const applyRoutinePack = useCallback(
    (pack: RoutinePack) => {
      const existingTitles = new Set(
        remindersRef.current.map((r) => r.title.trim().toLowerCase())
      );
      const now = new Date();
      const newItems: Reminder[] = [];

      pack.items.forEach((tpl, idx) => {
        if (existingTitles.has(tpl.title.trim().toLowerCase())) return;
        const dueAt = computeNextDueAt(tpl.time, tpl.days, now);
        newItems.push({
          id: makeId(`rt${idx}`),
          title: tpl.title,
          note: tpl.note,
          time: tpl.time,
          dueAt,
          dueAtUtc: new Date(dueAt).toISOString(),
          sent: false,
          days: tpl.days,
          oneTimeDate: null,
          emoji: tpl.emoji,
          color: tpl.color,
          priority: tpl.priority,
          tag: tpl.tag,
          isAlarm: tpl.isAlarm,
          sound: tpl.isAlarm ? prefsRef.current.defaultAlarmSound : null,
          doneDate: null,
          snoozedUntil: null,
          subtasks: (tpl.subtasks || []).map((s, sIdx) => ({
            id: makeId(`st${sIdx}`),
            title: s.title,
            done: false,
          })),
          createdAt: Date.now() - idx * 10,
        });
      });

      if (newItems.length === 0) {
        pushToast(`${pack.name} reminders are already in your schedule`, { tone: 'info' });
        return;
      }

      commitReminders((prev) => [...newItems, ...prev]);
      triggerHaptic('success', prefsRef.current.vibrate);
      recordEvent('routine_apply', { routine: pack.id, count: newItems.length });
      pushToast(`Added ${newItems.length} ${pack.name} reminder${newItems.length > 1 ? 's' : ''}`, {
        title: 'Routine Ready',
        tone: 'success',
        expression: 'excited',
      });
    },
    [commitReminders, pushToast, recordEvent]
  );

  const toggleCompleteReminder = useCallback(
    (id: string) => {
      const target = remindersRef.current.find((r) => r.id === id);
      if (!target) return;
      const todayKey = getTodayDateKey();
      const wasDone = target.doneDate === todayKey;
      const snapshot = [...remindersRef.current];

      if (!wasDone) {
        triggerHaptic('success', prefsRef.current.vibrate);
        recordEvent('reminder_done', { id });
        const isOneDay = !!target.oneTimeDate || (Array.isArray(target.days) && target.days.length === 1);
        if (prefsRef.current.autoDeleteCompleted && isOneDay) {
          commitReminders((prev) => prev.filter((r) => r.id !== id));
          pushToast(`Completed & cleared "${target.title}"`, {
            title: 'Completed',
            tone: 'success',
            expression: 'happy',
            undoLabel: 'Undo',
            onUndo: () => commitReminders(() => snapshot),
          });
        } else {
          const nextDue = computeNextDueAt(target.time, target.days, new Date(Date.now() + 12 * 3600000));
          commitReminders((prev) =>
            prev.map((r) =>
              r.id === id
                ? { ...r, doneDate: todayKey, snoozedUntil: null, dueAt: nextDue, sent: false }
                : r
            )
          );
          pushToast(`Completed "${target.title}"`, {
            title: 'Completed',
            tone: 'success',
            expression: 'happy',
            undoLabel: 'Undo',
            onUndo: () => commitReminders(() => snapshot),
          });
        }
        if (userRef.current?.authProvider === 'server' && navigator.onLine) {
          api.markDone(id, 'app').catch(() => {});
        }
      } else {
        triggerHaptic('light', prefsRef.current.vibrate);
        commitReminders((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, doneDate: null, dueAt: computeNextDueAt(r.time, r.days) } : r
          )
        );
      }

      if (ringingReminder?.id === id) {
        stopAlarmSound();
        setRingingReminder(null);
      }
    },
    [commitReminders, pushToast, recordEvent, ringingReminder]
  );

  const snoozeReminder = useCallback(
    (id: string, minutes = 5) => {
      const target = remindersRef.current.find((r) => r.id === id);
      if (!target) return;
      const snoozeAt = Date.now() + minutes * 60000;
      triggerHaptic('medium', prefsRef.current.vibrate);
      commitReminders((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, snoozedUntil: snoozeAt, dueAt: snoozeAt, dueAtUtc: new Date(snoozeAt).toISOString(), sent: false }
            : r
        )
      );
      recordEvent('reminder_snooze', { id, minutes });
      if (userRef.current?.authProvider === 'server' && navigator.onLine) {
        api.snooze(id, minutes, 'app').catch(() => {});
      }
      if (ringingReminder?.id === id) {
        stopAlarmSound();
        setRingingReminder(null);
      }
      pushToast(`"${target.title}" paused for ${minutes} min`, {
        title: 'Snoozed',
        tone: 'info',
        expression: 'sleepy',
      });
    },
    [commitReminders, pushToast, recordEvent, ringingReminder]
  );

  const deleteReminder = useCallback(
    (id: string) => {
      const target = remindersRef.current.find((r) => r.id === id);
      if (!target) return;
      const snapshot = [...remindersRef.current];
      triggerHaptic('warning', prefsRef.current.vibrate);
      commitReminders((prev) => prev.filter((r) => r.id !== id));
      recordEvent('reminder_delete', { id });
      pushToast(`Removed "${target.title}"`, {
        title: 'Deleted',
        tone: 'danger',
        expression: 'sad',
        undoLabel: 'Undo',
        onUndo: () => commitReminders(() => snapshot),
      });
    },
    [commitReminders, pushToast, recordEvent]
  );

  const triggerRingingNow = useCallback((r: Reminder) => {
    setRingingReminder(r);
    if (r.isAlarm) {
      startAlarmSound(
        (r.sound as AlarmSoundId) || prefsRef.current.defaultAlarmSound,
        prefsRef.current.alarmDurationSec,
        prefsRef.current.vibrate
      );
    } else {
      playNotificationChime(prefsRef.current.defaultNotifSound);
      triggerHaptic('medium', prefsRef.current.vibrate);
    }
  }, []);

  const dismissRinging = useCallback(() => {
    if (!ringingReminder) return;
    const id = ringingReminder.id;
    stopAlarmSound();
    setRingingReminder(null);
    if (id !== 'test-alarm') {
      toggleCompleteReminder(id);
    }
  }, [ringingReminder, toggleCompleteReminder]);

  const snoozeRinging = useCallback(
    (minutes = 5) => {
      if (!ringingReminder) return;
      const id = ringingReminder.id;
      stopAlarmSound();
      setRingingReminder(null);
      if (id !== 'test-alarm') {
        snoozeReminder(id, minutes);
      } else {
        pushToast(`Test alarm snoozed for ${minutes} min`, { tone: 'info' });
      }
    },
    [pushToast, ringingReminder, snoozeReminder]
  );

  /* Google Calendar & Gmail Confirmed Execution Helpers */
  const executeAddReminderToGoogleCalendar = useCallback(
    async (reminder: Reminder) => {
      const token = getWorkspaceAccessToken();
      if (!token) {
        throw new WorkspaceAuthError('Reconnect Google to export reminders to Google Calendar.');
      }
      const created = await createGoogleCalendarEvent(token, reminder);
      commitReminders((prev) =>
        prev.map((r) => (r.id === reminder.id ? { ...r, googleCalendarEventId: created.id } : r))
      );
      recordEvent('gcal_export', { id: reminder.id });
      pushToast(`Added "${reminder.title}" to Google Calendar`, {
        title: 'Calendar Synced',
        tone: 'success',
        expression: 'happy',
      });
      void refreshCalendarEvents(token);
      return created;
    },
    [commitReminders, pushToast, recordEvent, refreshCalendarEvents]
  );

  const executeSendGmail = useCallback(
    async (payload: { to: string; subject: string; bodyText: string }) => {
      const token = getWorkspaceAccessToken();
      if (!token) {
        throw new WorkspaceAuthError('Reconnect Google to send emails via Gmail.');
      }
      const sent = await sendGmailMessage(token, payload);
      recordEvent('gmail_send', { to: payload.to });
      pushToast(`Email sent to ${payload.to}`, {
        title: 'Email Sent',
        tone: 'success',
        expression: 'happy',
      });
      return sent;
    },
    [pushToast, recordEvent]
  );

  /* Apple Calendar (.ics) Exports */
  const exportSingleIcs = useCallback(
    (reminder: Reminder) => {
      const content = buildReminderIcs(reminder);
      const slug = reminder.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40);
      downloadIcsFile(content, `reminderme-${slug || 'event'}.ics`);
      recordEvent('ics_export', { count: 1 });
      pushToast('Ready to import in Apple Calendar', {
        title: 'Calendar Exported',
        tone: 'success',
        expression: 'happy',
      });
    },
    [pushToast, recordEvent]
  );

  const exportAllIcs = useCallback(() => {
    if (remindersRef.current.length === 0) {
      pushToast('No reminders to export yet', { tone: 'warning', expression: 'warning' });
      return;
    }
    const content = buildScheduleIcs(remindersRef.current);
    downloadIcsFile(content, `reminderme-schedule-${getTodayDateKey()}.ics`);
    recordEvent('ics_export', { count: remindersRef.current.length });
    pushToast(`Exported ${remindersRef.current.length} reminders (.ics)`, {
      title: 'Schedule Exported',
      tone: 'success',
      expression: 'happy',
    });
  }, [pushToast, recordEvent]);

  /* Firebase Google Sign-In & Firestore Live Subscription */
  const attachFirestoreSync = useCallback(
    async (fbUser: { uid: string; email: string | null; displayName: string | null }) => {
      firestoreUnsubRef.current?.();
      firestoreUnsubRef.current = null;
      firestoreReadyRef.current = false;

      if (!isFirestoreEnabled) {
        setSyncStatus('idle');
        return;
      }

      try {
        const ready = await ensureFirestoreUserProfile(
          fbUser as Parameters<typeof ensureFirestoreUserProfile>[0],
          prefsRef.current
        );
        if (!ready) {
          firestoreReadyRef.current = false;
          setSyncStatus('idle');
          return;
        }
        firestoreReadyRef.current = true;
      } catch {
        // Firestore might be unreachable or rules pending; still allow Google auth & Workspace APIs
        firestoreReadyRef.current = false;
        setSyncStatus('idle');
        return;
      }

      let firstSnap = true;
      firestoreUnsubRef.current = subscribeFirestoreReminders(
        fbUser.uid,
        (cloudReminders) => {
          cloudIdsRef.current = new Set(cloudReminders.map((r) => r.id));
          if (firstSnap) {
            firstSnap = false;
            if (cloudReminders.length === 0 && remindersRef.current.length > 0) {
              void syncAllRemindersToFirestore(fbUser.uid, remindersRef.current, cloudIdsRef.current)
                .then(() => {
                  cloudIdsRef.current = new Set(remindersRef.current.map((r) => r.id));
                  setSyncStatus('synced');
                  setDeliveryHealth((prev) => ({ ...prev, lastServerSync: Date.now() }));
                })
                .catch(() => {});
              return;
            }
          }
          if (cloudReminders.length > 0) {
            setReminders(cloudReminders);
            deviceStorageSet(KEY_REMINDERS, JSON.stringify(cloudReminders));
            void syncOsSchedules(cloudReminders).then((count) => {
              setDeliveryHealth((h) => ({ ...h, osScheduledCount: count }));
            });
          }
          setSyncStatus('synced');
          setDeliveryHealth((prev) => ({ ...prev, lastServerSync: Date.now() }));
        },
        () => {
          firestoreReadyRef.current = false;
        }
      );
    },
    []
  );

  const signInWithGoogle = useCallback(async () => {
    const { user: fbUser, accessToken } = await signInWithGoogleWorkspace();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const profile: UserProfile = {
      id: fbUser.uid,
      email: fbUser.email || '',
      name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
      tz,
      createdAt: Date.now(),
      photoURL: fbUser.photoURL,
      authProvider: 'firebase',
    };
    setUser(profile);
    setSyncStatus(isFirestoreEnabled ? 'syncing' : 'idle');
    void attachFirestoreSync(fbUser);
    if (accessToken) {
      void refreshCalendarEvents(accessToken);
      void refreshGmailMessages(accessToken);
    }
    pushToast(
      accessToken
        ? `${profile.name} · Calendar & Gmail connected`
        : `Welcome back, ${profile.name}`,
      { title: 'Google Connected', tone: 'success', expression: 'happy' }
    );
    return profile;
  }, [attachFirestoreSync, pushToast, refreshCalendarEvents, refreshGmailMessages]);

  /* Legacy Custom Backend Auth (graceful error instead of raw Failed to fetch) */
  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        const res = await api.login({ email, password, tz });
        if (res.token) await setAuthToken(res.token);
        const serverUser: UserProfile = { ...res.user, authProvider: 'server' };
        setUser(serverUser);
        if (Array.isArray(res.reminders) && res.reminders.length > 0) {
          commitReminders(() => res.reminders, false);
        } else if (remindersRef.current.length > 0) {
          await api.saveReminders(remindersRef.current).catch(() => {});
        }
        setSyncStatus('synced');
        deviceStorageSet(KEY_SIGNED_IN_HINT, '1');
        setDeliveryHealth((prev) => ({ ...prev, lastServerSync: Date.now() }));
        pushToast(`Signed in as ${res.user.name}`, { tone: 'success' });
        return serverUser;
      } catch (err) {
        throw new Error(formatServerAuthError(err));
      }
    },
    [commitReminders, pushToast]
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        const res = await api.signup({ name, email, password, tz, reminders: remindersRef.current });
        if (res.token) await setAuthToken(res.token);
        const serverUser: UserProfile = { ...res.user, authProvider: 'server' };
        setUser(serverUser);
        if (Array.isArray(res.reminders)) {
          commitReminders(() => res.reminders, false);
        }
        setSyncStatus('synced');
        deviceStorageSet(KEY_SIGNED_IN_HINT, '1');
        setDeliveryHealth((prev) => ({ ...prev, lastServerSync: Date.now() }));
        pushToast('Account created & synced', { tone: 'success' });
        return serverUser;
      } catch (err) {
        throw new Error(formatServerAuthError(err));
      }
    },
    [commitReminders, pushToast]
  );

  const signOut = useCallback(async () => {
    const provider = userRef.current?.authProvider;
    firestoreUnsubRef.current?.();
    firestoreUnsubRef.current = null;
    firestoreReadyRef.current = false;
    cloudIdsRef.current = new Set();

    if (provider === 'firebase') {
      try {
        await signOutFirebase();
      } catch {
        // ignore
      }
    } else {
      try {
        await api.logout();
      } catch {
        // ignore
      }
    }
    await setAuthToken(null);
    deviceStorageSet(KEY_SIGNED_IN_HINT, '0');
    setUser(null);
    setCalendarEvents([]);
    setGmailMessages([]);
    setSyncStatus('idle');
    pushToast('Signed out — continuing in offline Guest Mode', { tone: 'info' });
  }, [pushToast]);

  const enableNotificationsAndPush = useCallback(async () => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const result = await subscribeDevicePush(
      async () => {
        if (userRef.current?.authProvider !== 'server') return null;
        const { publicKey } = await api.pushKey();
        return publicKey;
      },
      async (sub) => {
        const { devices } = await api.pushSubscribe(sub, tz);
        return devices;
      },
      async (token, platform) => {
        if (userRef.current?.authProvider !== 'server') return 1;
        const { devices } = await api.pushFcm(token, platform, tz);
        return devices;
      }
    );
    await refreshDeliveryHealth(result.devices);
    pushToast(result.message, { tone: result.ok ? 'success' : 'warning' });
    return result;
  }, [pushToast, refreshDeliveryHealth]);

  const runDelayedLockScreenTest = useCallback(
    async (delaySec = 10) => {
      const res = await scheduleDelayedLockScreenTest(
        delaySec,
        userRef.current?.authProvider === 'server' && navigator.onLine
          ? async (sec) => {
              const out = await api.pushTest(sec);
              return !!(out.scheduled || out.sent);
            }
          : undefined
      );
      pushToast(res.message, { tone: res.ok ? 'success' : 'warning' });
      return res;
    },
    [pushToast]
  );

  const triggerInstantTestAlarm = useCallback(() => {
    const testRem: Reminder = {
      id: 'test-alarm',
      title: 'Lock-Screen Alarm Test',
      note: 'Slide right to dismiss or slide left to snooze',
      time: new Date().toTimeString().slice(0, 5),
      dueAt: Date.now(),
      days: null,
      emoji: '⏰',
      color: '#EF4444',
      priority: 'high',
      tag: 'Test',
      isAlarm: true,
      sound: prefsRef.current.defaultAlarmSound,
      doneDate: null,
      createdAt: Date.now(),
    };
    triggerRingingNow(testRem);
  }, [triggerRingingNow]);

  /* Backup Export / Import */
  const exportBackupJson = useCallback(() => {
    const payload = {
      app: 'reminderme',
      version: 3,
      exportedAt: new Date().toISOString(),
      reminders: remindersRef.current,
      prefs: prefsRef.current,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reminderme-backup-${getTodayDateKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast('Backup exported to device', { tone: 'success' });
  }, [pushToast]);

  const importBackupJson = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed.reminders)) {
          throw new Error('Invalid backup file format');
        }
        commitReminders(() => parsed.reminders);
        if (parsed.prefs && typeof parsed.prefs === 'object') {
          updatePrefs(parsed.prefs);
        }
        pushToast(`Imported ${parsed.reminders.length} reminders`, { tone: 'success' });
      } catch {
        pushToast('Could not import backup file', { tone: 'danger' });
      }
    },
    [commitReminders, pushToast, updatePrefs]
  );

  /* Local Analytics Summary */
  const localAnalytics: AnalyticsSummary = useMemo(() => {
    const byFeature: Record<string, number> = {};
    const byDay: Record<string, { events: number; done: number }> = {};
    for (const e of events) {
      byFeature[e.type] = (byFeature[e.type] || 0) + 1;
      const day = new Date(e.ts).toISOString().slice(0, 10);
      if (!byDay[day]) byDay[day] = { events: 0, done: 0 };
      byDay[day].events++;
      if (e.type === 'reminder_done' || e.type === 'push_done') byDay[day].done++;
    }
    const last7: { day: string; events: number; done: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      last7.push({ day: d, events: byDay[d]?.events || 0, done: byDay[d]?.done || 0 });
    }
    return {
      totalEvents: events.length,
      users: 1,
      reminders: reminders.length,
      features: Object.entries(byFeature)
        .sort((a, b) => b[1] - a[1])
        .map(([feature, count]) => ({ feature, count })),
      last7,
    };
  }, [events, reminders.length]);

  /* Firebase Auth State Listener */
  useEffect(() => {
    const unsub = initFirebaseAuth((fbUser, token) => {
      if (fbUser) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        setUser({
          id: fbUser.uid,
          email: fbUser.email || '',
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
          tz,
          createdAt: Date.now(),
          photoURL: fbUser.photoURL,
          authProvider: 'firebase',
        });
        void attachFirestoreSync(fbUser);
        if (token) {
          void refreshCalendarEvents(token);
          void refreshGmailMessages(token);
        }
      } else if (userRef.current?.authProvider === 'firebase') {
        firestoreUnsubRef.current?.();
        firestoreUnsubRef.current = null;
        firestoreReadyRef.current = false;
        setUser(null);
        setCalendarEvents([]);
        setGmailMessages([]);
        setSyncStatus('idle');
      }
    });
    return () => {
      unsub();
      firestoreUnsubRef.current?.();
    };
  }, [attachFirestoreSync, refreshCalendarEvents, refreshGmailMessages]);

  /* Initial Hydration + Native Bridge Init */
  useEffect(() => {
    let active = true;
    (async () => {
      const [rawRem, rawPrefs, rawEvents, rawPending, signedInHint] = await Promise.all([
        deviceStorageGet(KEY_REMINDERS),
        deviceStorageGet(KEY_PREFS),
        deviceStorageGet(KEY_EVENTS),
        deviceStorageGet(KEY_PENDING_SYNC),
        deviceStorageGet(KEY_SIGNED_IN_HINT),
      ]);

      if (!active) return;

      let loadedPrefs = DEFAULT_PREFS;
      if (rawPrefs) {
        try {
          loadedPrefs = { ...DEFAULT_PREFS, ...JSON.parse(rawPrefs) };
        } catch {
          // ignore
        }
      }
      setPrefs(loadedPrefs);
      if (loadedPrefs.serverBaseUrl) setApiBaseUrl(loadedPrefs.serverBaseUrl);

      let loadedReminders: Reminder[] = [];
      if (rawRem) {
        try {
          const parsed = JSON.parse(rawRem);
          if (Array.isArray(parsed)) loadedReminders = parsed;
        } catch {
          // ignore
        }
      } else {
        loadedReminders = createStarterReminders();
        deviceStorageSet(KEY_REMINDERS, JSON.stringify(loadedReminders));
      }
      setReminders(loadedReminders);

      if (rawEvents) {
        try {
          const parsed = JSON.parse(rawEvents);
          if (Array.isArray(parsed)) setEvents(parsed);
        } catch {
          // ignore
        }
      }
      if (rawPending === '1') setPendingSync(true);
      setHydrated(true);

      // Only check legacy custom server session if explicitly signed in previously
      if (navigator.onLine && signedInHint === '1' && !userRef.current) {
        try {
          const me = await api.me();
          if (!active) return;
          setUser({ ...me.user, authProvider: 'server' });
          if (Array.isArray(me.reminders) && me.reminders.length > 0 && rawPending !== '1') {
            setReminders(me.reminders);
            deviceStorageSet(KEY_REMINDERS, JSON.stringify(me.reminders));
          }
          setSyncStatus('synced');
          setDeliveryHealth((prev) => ({
            ...prev,
            pushDevices: me.pushDevices || 0,
            pushSubscribed: (me.pushDevices || 0) > 0,
            lastServerSync: Date.now(),
          }));
        } catch {
          deviceStorageSet(KEY_SIGNED_IN_HINT, '0');
        }
      }

      await refreshDeliveryHealth();
    })();

    return () => {
      active = false;
    };
  }, [refreshDeliveryHealth]);

  /* Native Plugin & Hardware Back Init */
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    initNativePlatform({
      onDismiss: (rid) => toggleCompleteReminder(rid),
      onSnooze: (rid, mins) => snoozeReminder(rid, mins),
      onOpenReminder: (rid) => {
        const found = remindersRef.current.find((r) => r.id === rid);
        if (found) triggerRingingNow(found);
      },
      onHardwareBack,
    }).then((fn) => {
      cleanup = fn;
    });
    return () => {
      cleanup?.();
    };
  }, [onHardwareBack, snoozeReminder, toggleCompleteReminder, triggerRingingNow]);

  /* Flush pending sync automatically when coming back online */
  useEffect(() => {
    if (isOnline && user && pendingSync) {
      void syncWithCloud(remindersRef.current);
    } else if (!isOnline && user) {
      setSyncStatus('offline');
    }
  }, [isOnline, pendingSync, syncWithCloud, user]);

  /* Foreground-only active session alarm trigger */
  useEffect(() => {
    const checkForegroundDue = () => {
      if (document.visibilityState !== 'visible') return;
      const now = new Date();
      const todayKey = getTodayDateKey(now);
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const dow = now.getDay();

      for (const r of remindersRef.current) {
        if (r.doneDate === todayKey) continue;
        const snoozeDue = r.snoozedUntil && r.snoozedUntil <= now.getTime();
        const scheduleDue =
          !r.snoozedUntil &&
          r.time === hhmm &&
          (!r.oneTimeDate || r.oneTimeDate === todayKey) &&
          (!r.days || r.days.includes(dow));

        if (!snoozeDue && !scheduleDue) continue;
        const fireKey = `${r.id}:${todayKey}:${snoozeDue ? r.snoozedUntil : hhmm}`;
        if (firedInSessionRef.current.has(fireKey)) continue;
        firedInSessionRef.current.add(fireKey);
        triggerRingingNow(r);
        break;
      }
    };
    const id = window.setInterval(checkForegroundDue, 5000);
    return () => window.clearInterval(id);
  }, [triggerRingingNow]);

  return {
    hydrated,
    isOnline,
    reminders,
    prefs,
    user,
    workspaceToken,
    hasWorkspaceAccess: Boolean(workspaceToken),
    calendarEvents,
    calendarLoading,
    calendarError,
    gmailMessages,
    gmailLoading,
    gmailError,
    syncStatus,
    pendingSync,
    ringingReminder,
    toasts,
    deliveryHealth,
    localAnalytics,
    dismissToast,
    pushToast,
    updatePrefs,
    upsertReminder,
    toggleSubtask,
    applyRoutinePack,
    toggleCompleteReminder,
    snoozeReminder,
    deleteReminder,
    triggerRingingNow,
    dismissRinging,
    snoozeRinging,
    signInWithGoogle,
    signIn,
    signUp,
    signOut,
    syncNow: () => syncWithCloud(remindersRef.current),
    refreshCalendarEvents,
    refreshGmailMessages,
    executeAddReminderToGoogleCalendar,
    executeSendGmail,
    exportSingleIcs,
    exportAllIcs,
    enableNotificationsAndPush,
    runDelayedLockScreenTest,
    triggerInstantTestAlarm,
    refreshDeliveryHealth,
    exportBackupJson,
    importBackupJson,
  };
}
