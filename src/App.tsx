import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { AppShell } from './components/AppShell';
import { DeveloperIntro } from './components/DeveloperIntro';
import { TodayView } from './components/TodayView';
import { useReminderApp } from './hooks/useReminderApp';
import { parseQuickInput } from './lib/parser';
import type { Reminder, TabId } from './types';

// Lazy-load secondary tabs and sheets so initial mobile bundle renders instantly
const ScheduleView = lazy(() => import('./components/ScheduleView').then((m) => ({ default: m.ScheduleView })));
const InsightsView = lazy(() => import('./components/InsightsView').then((m) => ({ default: m.InsightsView })));
const ProfileView = lazy(() => import('./components/ProfileView').then((m) => ({ default: m.ProfileView })));
const ReminderSheet = lazy(() => import('./components/ReminderSheet').then((m) => ({ default: m.ReminderSheet })));
const FocusTimerSheet = lazy(() => import('./components/FocusTimerSheet').then((m) => ({ default: m.FocusTimerSheet })));
const AuthSheet = lazy(() => import('./components/AuthSheet').then((m) => ({ default: m.AuthSheet })));
const PlayStoreModal = lazy(() => import('./components/PlayStoreModal').then((m) => ({ default: m.PlayStoreModal })));
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);
  const [focusReminder, setFocusReminder] = useState<Reminder | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<'privacy' | 'playstore' | null>(null);
  const [showIntro, setShowIntro] = useState<boolean>(shouldShowIntroInitially);

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
    if (infoModal) {
      setInfoModal(null);
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
      setActiveTab('today');
      return true;
    }
    return false;
  }, [activeTab, authOpen, finishIntro, focusReminder, infoModal, sheetOpen, showIntro]);

  const app = useReminderApp(handleHardwareBack);

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
    setDefaultDate(date);
    setSheetOpen(true);
  };

  const openEditReminder = (r: Reminder) => {
    setEditingReminder(r);
    setDefaultDate(null);
    setSheetOpen(true);
  };

  const handleQuickAdd = (rawText: string) => {
    const parsed = parseQuickInput(rawText);
    app.upsertReminder({
      title: parsed.title,
      note: '',
      time: parsed.time,
      days: parsed.days,
      oneTimeDate: parsed.oneTimeDate,
      emoji: parsed.emoji,
      color: parsed.isAlarm ? '#2F80FF' : '#22C55E',
      priority: parsed.priority,
      tag: parsed.tag,
      isAlarm: parsed.isAlarm,
      sound: parsed.isAlarm ? app.prefs.defaultAlarmSound : null,
    });
  };

  const handleAddCustomTag = (tag: string) => {
    if (app.prefs.customTags.includes(tag)) return;
    app.updatePrefs({ customTags: [...app.prefs.customTags, tag] });
  };

  return (
    <>
      <AppShell
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenNewSheet={() => openNewReminder(null)}
        isOnline={app.isOnline}
        syncStatus={app.syncStatus}
        toasts={app.toasts}
        onDismissToast={app.dismissToast}
      >
        {activeTab === 'today' && (
          <TodayView
            reminders={app.reminders}
            prefs={app.prefs}
            userName={app.user?.name}
            deliveryHealth={app.deliveryHealth}
            onToggleTimeFormat={() =>
              app.updatePrefs({ timeFormat: app.prefs.timeFormat === '12h' ? '24h' : '12h' })
            }
            onQuickAdd={handleQuickAdd}
            onOpenNewSheet={() => openNewReminder(null)}
            onToggleDone={app.toggleCompleteReminder}
            onSnooze={app.snoozeReminder}
            onDelete={app.deleteReminder}
            onEdit={openEditReminder}
            onFocus={(r) => setFocusReminder(r)}
            onOpenDeliverySetup={() => setActiveTab('profile')}
            onVoiceError={(msg) => app.pushToast(msg, { tone: 'warning' })}
          />
        )}

        <Suspense fallback={<TabSkeleton />}>
          {activeTab === 'schedule' && (
            <ScheduleView
              reminders={app.reminders}
              prefs={app.prefs}
              onAddForDate={(date) => openNewReminder(date)}
              onToggleDone={app.toggleCompleteReminder}
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
              onUpdatePrefs={app.updatePrefs}
              onOpenAuth={() => setAuthOpen(true)}
              onSignOut={app.signOut}
              onSyncNow={app.syncNow}
              onEnableNotifications={app.enableNotificationsAndPush}
              onSchedule10sTest={() => app.runDelayedLockScreenTest(10)}
              onInstantAlarmTest={app.triggerInstantTestAlarm}
              onExportBackup={app.exportBackupJson}
              onImportBackup={app.importBackupJson}
              onOpenPrivacy={() => setInfoModal('privacy')}
              onOpenPlayStoreKit={() => setInfoModal('playstore')}
              onReplayIntro={() => setShowIntro(true)}
              onToast={(msg) => app.pushToast(msg, { tone: 'info' })}
            />
          )}
        </Suspense>
      </AppShell>

      <DeveloperIntro visible={showIntro} onFinish={finishIntro} />

      {/* Lazy-Loaded Bottom Sheets & Overlays */}
      <Suspense fallback={null}>
        {sheetOpen && (
          <ReminderSheet
            open={sheetOpen}
            editing={editingReminder}
            defaultDate={defaultDate}
            defaultAlarmSound={app.prefs.defaultAlarmSound}
            customAudioName={app.prefs.customAudioName}
            availableTags={app.prefs.customTags}
            onAddCustomTag={handleAddCustomTag}
            onSave={(draft) => app.upsertReminder(draft)}
            onDelete={app.deleteReminder}
            onClose={() => setSheetOpen(false)}
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
            onSignIn={app.signIn}
            onSignUp={app.signUp}
            onClose={() => setAuthOpen(false)}
          />
        )}

        {infoModal && <PlayStoreModal mode={infoModal} onClose={() => setInfoModal(null)} />}

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
