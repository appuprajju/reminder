import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { AppShell, NAV_ITEMS, type AppShellHandle } from './components/AppShell';
import { ConfirmActionModal, type ConfirmActionSpec } from './components/ConfirmActionModal';
import { DeveloperIntro } from './components/DeveloperIntro';
import type { SheetDraft } from './components/ReminderSheet';
import { TodayView } from './components/TodayView';
import { useLiveVoiceAssistant } from './hooks/useLiveVoiceAssistant';
import { useReminderApp } from './hooks/useReminderApp';
import {
  buildReminderFromAssistantIntent,
  formatAssistantLabel,
  parseAssistantIntentUrl,
} from './lib/assistantIntents';
import { parseQuickInput, type ParsedQuickReminder } from './lib/parser';
import { formatDaysSummary, formatTimeDisplay } from './lib/time';
import {
  buildDirectGmailComposeUrl,
  buildDirectGoogleCalendarUrl,
  formatDailyDigestEmail,
  formatReminderEmail,
} from './lib/workspaceApi';
import type { GmailMessageSummary, GoogleCalendarEvent, Reminder, TabId } from './types';

// Lazy-load secondary tabs and sheets so initial mobile bundle renders instantly
const ScheduleView = lazy(() =>
  import('./components/ScheduleView').then((m) => ({ default: m.ScheduleView }))
);
const InsightsView = lazy(() =>
  import('./components/InsightsView').then((m) => ({ default: m.InsightsView }))
);
const ProfileView = lazy(() =>
  import('./components/ProfileView').then((m) => ({ default: m.ProfileView }))
);
const ReminderSheet = lazy(() =>
  import('./components/ReminderSheet').then((m) => ({ default: m.ReminderSheet }))
);
const FocusTimerSheet = lazy(() =>
  import('./components/FocusTimerSheet').then((m) => ({ default: m.FocusTimerSheet }))
);
const AuthSheet = lazy(() =>
  import('./components/AuthSheet').then((m) => ({ default: m.AuthSheet }))
);
const RingingAlarmOverlay = lazy(() =>
  import('./components/RingingAlarmOverlay').then((m) => ({ default: m.RingingAlarmOverlay }))
);
const IntroVideoModal = lazy(() =>
  import('./components/IntroVideoModal').then((m) => ({ default: m.IntroVideoModal }))
);
const IntroVideoHarness = lazy(() =>
  import('./components/IntroVideoHarness').then((m) => ({ default: m.IntroVideoHarness }))
);
const VoiceShortcutsModal = lazy(() =>
  import('./components/VoiceShortcutsModal').then((m) => ({ default: m.VoiceShortcutsModal }))
);

const INTRO_SEEN_KEY = 'rm_intro_seen_session';

function shouldShowIntroInitially(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    const action = (params.get('action') || '').toLowerCase();
    if (
      params.get('autostart') === '1' ||
      params.get('tab') ||
      action === 'new' ||
      action === 'add' ||
      action === 'voice' ||
      action === 'share' ||
      action === 'create'
    ) {
      return false;
    }
    return sessionStorage.getItem(INTRO_SEEN_KEY) !== '1';
  } catch {
    return true;
  }
}

const TabSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
    <div className="glass-surface h-48 animate-pulse rounded-3xl lg:col-span-6" />
    <div className="glass-surface h-48 animate-pulse rounded-3xl lg:col-span-6" />
  </div>
);

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [tabDirection, setTabDirection] = useState<'left' | 'right'>('right');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [sheetDraft, setSheetDraft] = useState<SheetDraft | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);
  const [focusReminder, setFocusReminder] = useState<Reminder | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [introVideoOpen, setIntroVideoOpen] = useState(false);
  const [voiceShortcutsOpen, setVoiceShortcutsOpen] = useState(false);
  const [voiceAutoTriggerSeq, setVoiceAutoTriggerSeq] = useState(0);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionSpec | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [showIntro, setShowIntro] = useState<boolean>(shouldShowIntroInitially);
  const voiceCloseRef = useRef<(() => void) | null>(null);
  const appShellRef = useRef<AppShellHandle | null>(null);
  const startupIntentHandledRef = useRef<string | null>(null);

  const isRenderIntroHarness =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('renderIntro') === '1';

  const registerVoiceClose = useCallback((fn: (() => void) | null) => {
    voiceCloseRef.current = fn;
  }, []);

  const selectTab = useCallback(
    (nextTab: TabId) => {
      if (nextTab === activeTab) return;
      const curIdx = NAV_ITEMS.findIndex((item) => item.id === activeTab);
      const nextIdx = NAV_ITEMS.findIndex((item) => item.id === nextTab);
      setTabDirection(nextIdx >= curIdx ? 'right' : 'left');
      setActiveTab(nextTab);
    },
    [activeTab]
  );

  const finishIntro = useCallback(() => {
    setShowIntro(false);
    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {
      // ignore
    }
  }, []);

  const handleHardwareBack = useCallback(() => {
    if (showIntro) {
      finishIntro();
      return true;
    }
    if (confirmAction && !confirmBusy) {
      setConfirmAction(null);
      return true;
    }
    if (voiceCloseRef.current) {
      voiceCloseRef.current();
      return true;
    }
    if (voiceShortcutsOpen) {
      setVoiceShortcutsOpen(false);
      return true;
    }
    if (introVideoOpen) {
      setIntroVideoOpen(false);
      return true;
    }
    if (authOpen) {
      setAuthOpen(false);
      return true;
    }
    if (focusReminder) {
      setFocusReminder(null);
      return true;
    }
    if (sheetOpen) {
      setSheetOpen(false);
      return true;
    }
    if (activeTab !== 'today') {
      selectTab('today');
      return true;
    }
    return false;
  }, [
    activeTab,
    authOpen,
    confirmAction,
    confirmBusy,
    finishIntro,
    focusReminder,
    introVideoOpen,
    selectTab,
    sheetOpen,
    showIntro,
    voiceShortcutsOpen,
  ]);

  const appRef = useRef<ReturnType<typeof useReminderApp> | null>(null);

  const handleAssistantUrl = useCallback(
    (rawUrl: string, options?: { fromStartup?: boolean }) => {
      const intent = parseAssistantIntentUrl(rawUrl);
      if (!intent) return;
      if (options?.fromStartup) {
        if (startupIntentHandledRef.current === rawUrl) return;
        startupIntentHandledRef.current = rawUrl;
      }

      const sourceLabel = formatAssistantLabel(intent.source);
      setShowIntro(false);
      setActiveTab('today');

      if (intent.action === 'voice') {
        setVoiceShortcutsOpen(false);
        setVoiceAutoTriggerSeq((seq) => seq + 1);
        appShellRef.current?.onTriggerIsland('created', {
          title: `${sourceLabel} Listening`,
          message: 'Speak your reminder or alarm now…',
          durationMs: 3200,
        });
      } else {
        const parsed = buildReminderFromAssistantIntent(intent);
        if (intent.mode === 'review') {
          setVoiceShortcutsOpen(false);
          setEditingReminder(null);
          setSheetDraft(parsed);
          setDefaultDate(null);
          setSheetOpen(true);
          appShellRef.current?.onTriggerIsland('created', {
            title: `${sourceLabel} Draft Ready`,
            message: parsed.title,
            durationMs: 3000,
          });
        } else {
          const currentApp = appRef.current;
          if (currentApp) {
            currentApp.upsertReminder({
              title: parsed.title,
              note: '',
              time: parsed.time,
              days: parsed.days,
              oneTimeDate: parsed.oneTimeDate,
              emoji: parsed.emoji,
              color: parsed.isAlarm ? '#0A84FF' : '#30D158',
              priority: parsed.priority,
              tag: parsed.tag,
              isAlarm: parsed.isAlarm,
              sound: parsed.isAlarm ? currentApp.prefs.defaultAlarmSound : null,
              subtasks: [],
            });
            appShellRef.current?.onTriggerIsland('created', {
              title: `Added via ${sourceLabel}`,
              message: `${parsed.title} · ${formatTimeDisplay(parsed.time, currentApp.prefs.timeFormat)}`,
              durationMs: 3800,
            });
          }
        }
      }

      if (options?.fromStartup && typeof window !== 'undefined' && window.location.search) {
        try {
          window.history.replaceState({}, '', window.location.pathname + window.location.hash);
        } catch {
          // ignore history API errors
        }
      }
    },
    []
  );

  const app = useReminderApp(handleHardwareBack, handleAssistantUrl);
  appRef.current = app;

  const liveAssistant = useLiveVoiceAssistant({
    vibrate: app.prefs.vibrate,
    onAutoSaveCommand: ({ source, commandText, isAlarmHint }) => {
      const parsed = buildReminderFromAssistantIntent({
        action: 'add',
        text: commandText,
        source: source === 'voice' ? 'shortcut' : source,
        mode: 'auto',
        alertOverride: isAlarmHint ? 'alarm' : 'auto',
        signature: `live:${source}:${commandText}`,
      });
      const currentApp = appRef.current;
      if (!currentApp) return;
      currentApp.upsertReminder({
        title: parsed.title,
        note: '',
        time: parsed.time,
        days: parsed.days,
        oneTimeDate: parsed.oneTimeDate,
        emoji: parsed.emoji,
        color: parsed.isAlarm ? '#0A84FF' : '#30D158',
        priority: parsed.priority,
        tag: parsed.tag,
        isAlarm: parsed.isAlarm,
        sound: parsed.isAlarm ? currentApp.prefs.defaultAlarmSound : null,
        subtasks: [],
      });
      const label =
        source === 'siri'
          ? 'Siri'
          : source === 'google-assistant'
            ? 'Google Assistant'
            : 'Voice';
      appShellRef.current?.onTriggerIsland('created', {
        title: `Added via ${label}`,
        message: `${parsed.title} · ${formatTimeDisplay(parsed.time, currentApp.prefs.timeFormat)}`,
        durationMs: 3800,
      });
    },
    onStatusNotice: (kind, title, message) => {
      appShellRef.current?.onTriggerIsland(kind, {
        title,
        message,
        durationMs: 3200,
      });
    },
  });

  /* Trigger Dynamic Island alert animation when an alarm starts ringing */
  useEffect(() => {
    if (app.ringingReminder) {
      appShellRef.current?.onTriggerIsland('alert', {
        title: app.ringingReminder.isAlarm ? 'Alarm Ringing' : 'Reminder Alert',
        message: app.ringingReminder.title,
        durationMs: 4200,
      });
    }
  }, [app.ringingReminder]);

  /* Support Android / PWA manifest launch shortcuts & Siri / Google Assistant URL intents */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'schedule' || tabParam === 'insights' || tabParam === 'profile') {
      setActiveTab(tabParam);
    }
    if (params.get('action') === 'new') {
      setEditingReminder(null);
      setDefaultDate(null);
      setSheetOpen(true);
    }
    handleAssistantUrl(window.location.href, { fromStartup: true });
  }, [handleAssistantUrl]);

  const openNewReminder = (date: Date | null = null) => {
    setEditingReminder(null);
    setSheetDraft(null);
    setDefaultDate(date);
    setSheetOpen(true);
  };

  const openEditReminder = (r: Reminder) => {
    setEditingReminder(r);
    setSheetDraft(null);
    setDefaultDate(null);
    setSheetOpen(true);
  };

  const openVoiceDraftInSheet = (parsed: ParsedQuickReminder) => {
    setEditingReminder(null);
    setSheetDraft(parsed);
    setDefaultDate(null);
    setSheetOpen(true);
  };

  const openCalendarEventInSheet = (ev: GoogleCalendarEvent) => {
    setEditingReminder(null);
    const parsedStart = new Date(ev.startIso).getTime();
    setSheetDraft({
      title: ev.summary.slice(0, 60),
      note: [ev.location, ev.description].filter(Boolean).join(' · ').slice(0, 140),
      time: ev.timeHm || '09:00',
      dueAt: Number.isFinite(parsedStart) ? parsedStart : Date.now() + 1800000,
      days: null,
      oneTimeDate: ev.dateKey,
      isAlarm: true,
      priority: 'high',
      tag: 'Work',
      emoji: '📅',
      summary: `${ev.dateKey} · ${ev.timeHm}`,
    });
    setDefaultDate(null);
    setSheetOpen(true);
  };

  const openGmailMessageInSheet = (msg: GmailMessageSummary) => {
    const parsed = parseQuickInput(msg.subject);
    setEditingReminder(null);
    setSheetDraft({
      ...parsed,
      title: msg.subject.slice(0, 60),
      note: `From ${msg.from}${msg.snippet ? ` — ${msg.snippet}` : ''}`.slice(0, 140),
      emoji: '✉️',
      tag: parsed.tag || 'Work',
    });
    setDefaultDate(null);
    setSheetOpen(true);
  };

  const handleSaveParsedReminder = (parsed: ParsedQuickReminder) => {
    app.upsertReminder({
      title: parsed.title,
      note: '',
      time: parsed.time,
      days: parsed.days,
      oneTimeDate: parsed.oneTimeDate,
      emoji: parsed.emoji,
      color: parsed.isAlarm ? '#0A84FF' : '#30D158',
      priority: parsed.priority,
      tag: parsed.tag,
      isAlarm: parsed.isAlarm,
      sound: parsed.isAlarm ? app.prefs.defaultAlarmSound : null,
      subtasks: [],
    });
  };

  const handleQuickAdd = (rawText: string) => {
    handleSaveParsedReminder(parseQuickInput(rawText));
  };

  const handleAddCustomTag = (tag: string) => {
    if (app.prefs.customTags.includes(tag)) return;
    app.updatePrefs({ customTags: [...app.prefs.customTags, tag] });
  };

  /* Explicit Confirmation Flows for ALL Google Calendar & Gmail Operations
     (Uses live API when Workspace is connected; falls back seamlessly to official zero-warning Calendar/Gmail links otherwise) */
  const requestAddToGoogleCalendar = (reminder: Reminder) => {
    const directUrl = buildDirectGoogleCalendarUrl(reminder);
    if (!app.hasWorkspaceAccess) {
      setConfirmAction({
        kind: 'calendar-add',
        title: 'Add to Google Calendar?',
        description:
          'Opens your Google Calendar with this reminder pre-filled — no Google app verification needed.',
        confirmLabel: 'Open Calendar',
        externalHref: directUrl,
        previewLines: [
          { label: 'Event', value: `${reminder.emoji || '⏰'} ${reminder.title}` },
          { label: 'Time', value: formatTimeDisplay(reminder.time, app.prefs.timeFormat) },
          { label: 'Schedule', value: formatDaysSummary(reminder.days, reminder.oneTimeDate) },
        ],
        bodyPreview: reminder.note || undefined,
        onConfirm: async () => {},
      });
      return;
    }
    setConfirmAction({
      kind: 'calendar-add',
      title: 'Add to Google Calendar?',
      description: 'Review the event details below before writing to your primary Google Calendar.',
      confirmLabel: 'Add Event',
      previewLines: [
        { label: 'Event', value: `${reminder.emoji || '⏰'} ${reminder.title}` },
        { label: 'Time', value: formatTimeDisplay(reminder.time, app.prefs.timeFormat) },
        { label: 'Schedule', value: formatDaysSummary(reminder.days, reminder.oneTimeDate) },
        { label: 'Calendar', value: app.user?.email || 'Primary Google Calendar' },
      ],
      bodyPreview: reminder.note || undefined,
      onConfirm: async () => {
        await app.executeAddReminderToGoogleCalendar(reminder);
      },
    });
  };

  const requestEmailReminder = (reminder: Reminder) => {
    const { subject, bodyText } = formatReminderEmail(reminder, app.prefs.timeFormat);
    const recipient = app.user?.email || '';
    if (!app.hasWorkspaceAccess || !recipient) {
      setConfirmAction({
        kind: 'gmail-send',
        title: 'Open Reminder in Gmail?',
        description:
          'Opens Gmail with this reminder pre-filled so you can send it right away — no Google app verification needed.',
        confirmLabel: 'Open Gmail',
        externalHref: buildDirectGmailComposeUrl({ to: recipient, subject, bodyText }),
        previewLines: [
          { label: 'To', value: recipient || 'Choose recipient in Gmail' },
          { label: 'Subject', value: subject },
        ],
        bodyPreview: bodyText,
        onConfirm: async () => {},
      });
      return;
    }
    setConfirmAction({
      kind: 'gmail-send',
      title: 'Send Reminder via Gmail?',
      description: 'Confirm the recipient and email preview before sending through your Gmail account.',
      confirmLabel: 'Send Email',
      previewLines: [
        { label: 'To', value: recipient },
        { label: 'Subject', value: subject },
      ],
      bodyPreview: bodyText,
      onConfirm: async () => {
        await app.executeSendGmail({ to: recipient, subject, bodyText });
      },
    });
  };

  const requestDailyDigestEmail = () => {
    const { subject, bodyText } = formatDailyDigestEmail(
      app.reminders,
      app.calendarEvents,
      app.prefs.timeFormat
    );
    const recipient = app.user?.email || '';
    if (!app.hasWorkspaceAccess || !recipient) {
      setConfirmAction({
        kind: 'gmail-send',
        title: 'Open Daily Digest in Gmail?',
        description:
          'Opens a pre-filled Gmail draft with your schedule — works on any account with zero verification warning.',
        confirmLabel: 'Open Gmail',
        externalHref: buildDirectGmailComposeUrl({ to: recipient, subject, bodyText }),
        previewLines: [
          { label: 'To', value: recipient || 'Choose recipient in Gmail' },
          { label: 'Subject', value: subject },
          {
            label: 'Included',
            value: `${app.reminders.length} reminders · ${app.calendarEvents.length} events`,
          },
        ],
        bodyPreview: bodyText,
        onConfirm: async () => {},
      });
      return;
    }
    setConfirmAction({
      kind: 'gmail-send',
      title: 'Send Daily Agenda Digest?',
      description: 'This will email your current schedule and synced calendar events via Gmail.',
      confirmLabel: 'Send Digest',
      previewLines: [
        { label: 'To', value: recipient },
        { label: 'Subject', value: subject },
        { label: 'Included', value: `${app.reminders.length} reminders · ${app.calendarEvents.length} events` },
      ],
      bodyPreview: bodyText,
      onConfirm: async () => {
        await app.executeSendGmail({ to: recipient, subject, bodyText });
      },
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setConfirmBusy(true);
    try {
      await confirmAction.onConfirm();
      setConfirmAction(null);
    } catch (err) {
      app.pushToast(err instanceof Error ? err.message : 'Google Workspace request failed', {
        tone: 'danger',
      });
      setConfirmAction(null);
    } finally {
      setConfirmBusy(false);
    }
  };

  const handleRefreshWorkspace = () => {
    void app.refreshCalendarEvents();
    void app.refreshGmailMessages();
    app.pushToast('Refreshing Google Calendar & Gmail…', { tone: 'info' });
  };

  if (isRenderIntroHarness) {
    return (
      <Suspense fallback={null}>
        <IntroVideoHarness />
      </Suspense>
    );
  }

  return (
    <>
      <AppShell
        ref={appShellRef}
        activeTab={activeTab}
        tabDirection={tabDirection}
        onSelectTab={selectTab}
        onOpenNewSheet={() => openNewReminder(null)}
        user={app.user}
        onOpenAuth={() => setAuthOpen(true)}
        isOnline={app.isOnline}
        syncStatus={app.syncStatus}
        toasts={app.toasts}
        onDismissToast={app.dismissToast}
      >
        {activeTab === 'today' && (
          <TodayView
            reminders={app.reminders}
            prefs={app.prefs}
            user={app.user}
            userName={app.user?.name}
            deliveryHealth={app.deliveryHealth}
            calendarEvents={app.calendarEvents}
            hasWorkspaceAccess={app.hasWorkspaceAccess}
            onToggleTimeFormat={() =>
              app.updatePrefs({ timeFormat: app.prefs.timeFormat === '12h' ? '24h' : '12h' })
            }
            onQuickAdd={handleQuickAdd}
            onSaveParsedReminder={handleSaveParsedReminder}
            onEditVoiceDraft={openVoiceDraftInSheet}
            onOpenNewSheet={() => openNewReminder(null)}
            onOpenAuth={() => setAuthOpen(true)}
            onGoogleSignIn={app.signInWithGoogle}
            onToggleDone={app.toggleCompleteReminder}
            onToggleSubtask={app.toggleSubtask}
            onSnooze={app.snoozeReminder}
            onDelete={app.deleteReminder}
            onEdit={openEditReminder}
            onFocus={(r) => {
              setFocusReminder(r);
              appShellRef.current?.onTriggerIsland('created', {
                title: 'Focus Mode',
                message: r.title,
              });
            }}
            onExportIcs={app.exportSingleIcs}
            onApplyRoutine={app.applyRoutinePack}
            onRequestDailyDigest={requestDailyDigestEmail}
            onConnectGoogle={() => {
              if (app.user) {
                void app.connectGoogleWorkspace().catch(() => setAuthOpen(true));
              } else {
                setAuthOpen(true);
              }
            }}
            onOpenDeliverySetup={() => selectTab('profile')}
            onOpenIntroVideo={() => setIntroVideoOpen(true)}
            onOpenVoiceShortcuts={() => setVoiceShortcutsOpen(true)}
            liveAssistant={liveAssistant}
            voiceAutoTriggerSeq={voiceAutoTriggerSeq}
            onRegisterVoiceClose={registerVoiceClose}
          />
        )}

        <Suspense fallback={<TabSkeleton />}>
          {activeTab === 'schedule' && (
            <ScheduleView
              reminders={app.reminders}
              prefs={app.prefs}
              calendarEvents={app.calendarEvents}
              calendarLoading={app.calendarLoading}
              calendarError={app.calendarError}
              gmailMessages={app.gmailMessages}
              gmailLoading={app.gmailLoading}
              gmailError={app.gmailError}
              hasWorkspaceAccess={app.hasWorkspaceAccess}
              onConnectGoogle={() => {
                if (app.user) {
                  void app.connectGoogleWorkspace().catch(() => setAuthOpen(true));
                } else {
                  setAuthOpen(true);
                }
              }}
              onRefreshCalendar={() => void app.refreshCalendarEvents()}
              onRefreshGmail={() => void app.refreshGmailMessages()}
              onImportCalendarEvent={openCalendarEventInSheet}
              onImportGmailMessage={openGmailMessageInSheet}
              onExportAllIcs={app.exportAllIcs}
              onExportIcs={app.exportSingleIcs}
              onAddForDate={(date) => openNewReminder(date)}
              onToggleDone={app.toggleCompleteReminder}
              onToggleSubtask={app.toggleSubtask}
              onSnooze={app.snoozeReminder}
              onDelete={app.deleteReminder}
              onEdit={openEditReminder}
              onFocus={(r) => setFocusReminder(r)}
            />
          )}

          {activeTab === 'insights' && (
            <InsightsView
              reminders={app.reminders}
              localAnalytics={app.localAnalytics}
              user={app.user}
              isOnline={app.isOnline}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              user={app.user}
              isOnline={app.isOnline}
              syncStatus={app.syncStatus}
              prefs={app.prefs}
              deliveryHealth={app.deliveryHealth}
              hasWorkspaceAccess={app.hasWorkspaceAccess}
              calendarCount={app.calendarEvents.length}
              gmailCount={app.gmailMessages.length}
              onUpdatePrefs={app.updatePrefs}
              onGoogleSignIn={app.signInWithGoogle}
              onConnectGoogleWorkspace={app.connectGoogleWorkspace}
              onOpenAuth={() => setAuthOpen(true)}
              onSignOut={app.signOut}
              onSyncNow={app.syncNow}
              onRefreshWorkspace={handleRefreshWorkspace}
              onRequestDailyDigest={requestDailyDigestEmail}
              onExportAllIcs={app.exportAllIcs}
              onEnableNotifications={app.enableNotificationsAndPush}
              onSchedule10sTest={() => app.runDelayedLockScreenTest(10)}
              onInstantAlarmTest={app.triggerInstantTestAlarm}
              onExportBackup={app.exportBackupJson}
              onImportBackup={app.importBackupJson}
              onOpenIntroVideo={() => setIntroVideoOpen(true)}
              onOpenVoiceShortcuts={() => setVoiceShortcutsOpen(true)}
              onToast={(msg) => app.pushToast(msg, { tone: 'info' })}
            />
          )}
        </Suspense>
      </AppShell>

      <DeveloperIntro visible={showIntro} onFinish={finishIntro} />

      {/* Explicit Confirmation Modal before any Google Calendar or Gmail write */}
      <ConfirmActionModal
        action={confirmAction}
        busy={confirmBusy}
        onCancel={() => !confirmBusy && setConfirmAction(null)}
        onConfirm={handleConfirmAction}
      />

      {/* Lazy-Loaded Bottom Sheets & Overlays */}
      <Suspense fallback={null}>
        {sheetOpen && (
          <ReminderSheet
            open={sheetOpen}
            editing={editingReminder}
            initialDraft={sheetDraft}
            defaultDate={defaultDate}
            defaultAlarmSound={app.prefs.defaultAlarmSound}
            customAudioName={app.prefs.customAudioName}
            availableTags={app.prefs.customTags}
            onAddCustomTag={handleAddCustomTag}
            onSave={(draft) => app.upsertReminder(draft)}
            onDelete={app.deleteReminder}
            onRequestAddToGoogleCalendar={requestAddToGoogleCalendar}
            onRequestEmailReminder={requestEmailReminder}
            onExportIcs={app.exportSingleIcs}
            onClose={() => {
              setSheetOpen(false);
              setSheetDraft(null);
            }}
          />
        )}

        {focusReminder && (
          <FocusTimerSheet
            reminder={focusReminder}
            onCompleteTask={app.toggleCompleteReminder}
            onClose={() => setFocusReminder(null)}
          />
        )}

        {authOpen && (
          <AuthSheet
            open={authOpen}
            onGoogleSignIn={app.signInWithGoogle}
            onSignIn={app.signIn}
            onSignUp={app.signUp}
            onResetPassword={app.resetPassword}
            onTriggerIsland={(type, opts) => appShellRef.current?.onTriggerIsland(type, opts)}
            onClose={() => setAuthOpen(false)}
          />
        )}

        {app.ringingReminder && (
          <RingingAlarmOverlay
            reminder={app.ringingReminder}
            timeFormat={app.prefs.timeFormat}
            onSnooze={app.snoozeRinging}
            onDismiss={app.dismissRinging}
          />
        )}

        {introVideoOpen && (
          <IntroVideoModal
            open={introVideoOpen}
            onClose={() => setIntroVideoOpen(false)}
          />
        )}

        {voiceShortcutsOpen && (
          <VoiceShortcutsModal
            open={voiceShortcutsOpen}
            liveAssistant={liveAssistant}
            onExecuteAssistantUrl={(url) => handleAssistantUrl(url)}
            onTriggerIsland={(type, opts) => appShellRef.current?.onTriggerIsland(type, opts)}
            onClose={() => setVoiceShortcutsOpen(false)}
          />
        )}
      </Suspense>
    </>
  );
}

export default App;
