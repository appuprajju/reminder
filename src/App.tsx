import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { AppShell, NAV_ITEMS, type AppShellHandle } from './components/AppShell';
import { ConfirmActionModal, type ConfirmActionSpec } from './components/ConfirmActionModal';
import { DeveloperIntro } from './components/DeveloperIntro';
import type { SheetDraft } from './components/ReminderSheet';
import { TodayView } from './components/TodayView';
import { useReminderApp } from './hooks/useReminderApp';
import { parseQuickInput, type ParsedQuickReminder } from './lib/parser';
import { formatDaysSummary, formatTimeDisplay } from './lib/time';
import { formatDailyDigestEmail, formatReminderEmail } from './lib/workspaceApi';
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

const INTRO_SEEN_KEY = 'rm_intro_seen_session';

function shouldShowIntroInitially(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1' || params.get('action') === 'new' || params.get('tab')) {
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
  const [confirmAction, setConfirmAction] = useState<ConfirmActionSpec | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [showIntro, setShowIntro] = useState<boolean>(shouldShowIntroInitially);
  const voiceCloseRef = useRef<(() => void) | null>(null);
  const appShellRef = useRef<AppShellHandle | null>(null);

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
    selectTab,
    sheetOpen,
    showIntro,
  ]);

  const app = useReminderApp(handleHardwareBack);

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

  /* Support Android / PWA manifest launch shortcuts (?action=new, ?tab=schedule, ?autostart=1) */
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
  }, []);

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

  /* Explicit Confirmation Flows for ALL Google Workspace Write Operations */
  const requestAddToGoogleCalendar = (reminder: Reminder) => {
    if (!app.hasWorkspaceAccess) {
      app.pushToast('Connect Google first to add events to Google Calendar', { tone: 'info' });
      setAuthOpen(true);
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
    if (!app.hasWorkspaceAccess || !app.user?.email) {
      app.pushToast('Sign in with Google to send reminder alerts via Gmail', { tone: 'info' });
      setAuthOpen(true);
      return;
    }
    const { subject, bodyText } = formatReminderEmail(reminder, app.prefs.timeFormat);
    const recipient = app.user.email;
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
    if (!app.hasWorkspaceAccess || !app.user?.email) {
      app.pushToast('Sign in with Google to email your daily digest via Gmail', { tone: 'info' });
      setAuthOpen(true);
      return;
    }
    const { subject, bodyText } = formatDailyDigestEmail(
      app.reminders,
      app.calendarEvents,
      app.prefs.timeFormat
    );
    const recipient = app.user.email;
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
              onConnectGoogle={() => setAuthOpen(true)}
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
      </Suspense>
    </>
  );
}

export default App;
