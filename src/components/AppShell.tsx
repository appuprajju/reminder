import React from 'react';
import { BarChart3, CalendarDays, Clock, Plus, User, WifiOff } from 'lucide-react';
import type { TabId, ToastMessage } from '../types';
import { Liquid3DBackground } from './Liquid3DBackground';

interface AppShellProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  onOpenNewSheet: () => void;
  isOnline: boolean;
  syncStatus: string;
  toasts: ToastMessage[];
  onDismissToast: (id: string) => void;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'today', label: 'Today', icon: Clock },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
  { id: 'profile', label: 'Profile', icon: User },
];

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  onSelectTab,
  onOpenNewSheet,
  isOnline,
  syncStatus,
  toasts,
  onDismissToast,
  children,
}) => {
  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col lg:flex-row">
      {/* Persistent 3D Volumetric Liquid Glass Backdrop */}
      <Liquid3DBackground />

      {/* Desktop Left Liquid Glass Navigation Rail */}
      <aside className="liquid-nav relative z-20 hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:justify-between lg:border-r lg:border-white/[0.14] lg:px-5 lg:py-6">
        <div>
          <div className="flex items-center gap-3 px-2">
            <img
              src="/icons/icon-192.png"
              alt="reminderme icon"
              className="h-10 w-10 rounded-xl shadow-[0_8px_22px_rgba(10,132,255,0.45)]"
            />
            <span className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap">
              reminderme
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenNewSheet}
            className="liquid-primary-btn mt-6 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>New Alarm</span>
          </button>

          <nav aria-label="Primary navigation" className="mt-6 flex flex-col gap-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`flex min-h-[44px] w-full items-center gap-3 rounded-2xl px-3.5 text-sm font-semibold transition-all whitespace-nowrap ${
                    active
                      ? 'border border-white/20 bg-white/[0.14] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]'
                      : 'border border-transparent text-slate-300/80 hover:bg-white/[0.07] hover:text-white'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-sky-300' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/[0.12] px-2 pt-4 text-xs text-slate-400">
          <p className="font-medium text-slate-200">
            {!isOnline ? 'Offline Mode' : syncStatus === 'synced' ? 'Cloud Synced' : 'On-Device Mode'}
          </p>
          <p className="mt-1 text-slate-400">
            Prajwal M <span className="font-mono text-sky-300">&lt;/yourstudio&gt;</span>
          </p>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Compact Mobile iOS Liquid Glass Top Bar (52px height) */}
        <header className="liquid-nav sticky top-0 z-30 flex h-[52px] items-center justify-between border-b border-white/[0.14] px-4 lg:hidden">
          <div className="flex items-center gap-2.5">
            <img
              src="/icons/icon-192.png"
              alt="reminderme icon"
              className="h-7 w-7 rounded-lg shadow-[0_4px_14px_rgba(10,132,255,0.45)]"
            />
            <span className="font-display text-base font-bold tracking-tight text-white whitespace-nowrap">
              reminderme
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenNewSheet}
            aria-label="Create new alarm or reminder"
            className="liquid-primary-btn flex min-h-[38px] items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-white transition-transform active:scale-95 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>New</span>
          </button>
        </header>

        {/* Non-Intrusive Offline Connectivity Notice */}
        {!isOnline && (
          <div className="flex items-center justify-center gap-2 border-b border-amber-400/20 bg-amber-500/15 px-4 py-2 text-xs font-medium text-amber-100 backdrop-blur-md">
            <WifiOff className="h-3.5 w-3.5" />
            <span>Offline Mode — OS alarms stay active; cloud sync will resume when online.</span>
          </div>
        )}

        {/* Active View Content */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-24 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>

      {/* Fixed Mobile iOS Liquid Glass Bottom Tab Bar (64px height + safe-area inset) */}
      <nav
        aria-label="Mobile navigation"
        className="liquid-nav fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.18] pb-safe lg:hidden"
      >
        <div className="grid h-16 grid-cols-4 items-center px-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`mx-1 flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-2xl transition-all ${
                  active
                    ? 'bg-white/[0.14] text-sky-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]'
                    : 'text-slate-300/75 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[11px] font-semibold tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Toast & Undo Notification Stack */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="glass-elevated pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm text-white"
          >
            <span className="min-w-0 flex-1 truncate">{t.text}</span>
            {t.onUndo && (
              <button
                type="button"
                onClick={() => {
                  t.onUndo?.();
                  onDismissToast(t.id);
                }}
                className="min-h-[34px] shrink-0 rounded-xl bg-white/[0.1] px-3 text-xs font-bold text-sky-300 hover:bg-white/[0.18]"
              >
                {t.undoLabel || 'Undo'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
