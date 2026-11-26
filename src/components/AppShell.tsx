import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { BarChart3, CalendarDays, Clock, Plus, User, WifiOff } from 'lucide-react';
import { buildIslandEventFromTrigger } from '../lib/emoExpression';
import type {
  DynamicIslandTriggerOptions,
  DynamicIslandTriggerType,
  TabId,
  ToastMessage,
  TriggerIslandFn,
} from '../types';
import {
  DynamicIsland,
  DynamicIslandContext,
  useDynamicIsland,
  type DynamicIslandEvent,
} from './DynamicIsland';
import { Liquid3DBackground } from './Liquid3DBackground';

export { useDynamicIsland };

export interface AppShellHandle {
  onTriggerIsland: TriggerIslandFn;
}

interface AppShellProps {
  activeTab: TabId;
  tabDirection?: 'left' | 'right';
  onSelectTab: (tab: TabId) => void;
  onOpenNewSheet: () => void;
  isOnline: boolean;
  syncStatus: string;
  toasts: ToastMessage[];
  onDismissToast: (id: string) => void;
  /** Optional listener invoked whenever onTriggerIsland(type) is called */
  onTriggerIsland?: TriggerIslandFn;
  children:
    | React.ReactNode
    | ((api: { onTriggerIsland: TriggerIslandFn }) => React.ReactNode);
}

export const NAV_ITEMS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'today', label: 'Today', icon: Clock },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
  { id: 'profile', label: 'Profile', icon: User },
];

export const AppShell = forwardRef<AppShellHandle, AppShellProps>(
  (
    {
      activeTab,
      tabDirection = 'right',
      onSelectTab,
      onOpenNewSheet,
      isOnline,
      syncStatus,
      toasts,
      onDismissToast,
      onTriggerIsland: onTriggerIslandProp,
      children,
    },
    ref
  ) => {
    const [activeIslandEvent, setActiveIslandEvent] = useState<DynamicIslandEvent | null>(null);
    const islandSeqRef = useRef(0);

    const triggerIsland = useCallback<TriggerIslandFn>(
      (type: DynamicIslandTriggerType, options?: DynamicIslandTriggerOptions) => {
        islandSeqRef.current += 1;
        const id = `island_${Date.now().toString(36)}_${islandSeqRef.current}`;
        const base = buildIslandEventFromTrigger(type, options, id);
        setActiveIslandEvent({
          ...base,
          durationMs: options?.durationMs,
        });
        onTriggerIslandProp?.(type, options);
      },
      [onTriggerIslandProp]
    );

    const handleIslandRetracted = useCallback((id: string) => {
      setActiveIslandEvent((cur) => (cur?.id === id ? null : cur));
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        onTriggerIsland: triggerIsland,
      }),
      [triggerIsland]
    );

    const islandContextValue = useMemo(
      () => ({ onTriggerIsland: triggerIsland }),
      [triggerIsland]
    );

    const activeIndex = Math.max(
      0,
      NAV_ITEMS.findIndex((item) => item.id === activeTab)
    );

    const resolvedChildren =
      typeof children === 'function' ? children({ onTriggerIsland: triggerIsland }) : children;

    return (
      <DynamicIslandContext.Provider value={islandContextValue}>
        <div className="relative flex min-h-[100dvh] w-full flex-col lg:flex-row">
          {/* Persistent 3D Volumetric Liquid Glass Backdrop */}
          <Liquid3DBackground />

          {/* Desktop Left Liquid Glass Navigation Rail with Sliding Glass Indicator */}
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
                className="liquid-primary-btn ios-spring-press mt-6 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                <span>New Alarm</span>
              </button>

              <nav aria-label="Primary navigation" className="relative mt-6 flex flex-col gap-1.5">
                {/* Sliding Apple Glass Highlight Pill */}
                <div
                  aria-hidden="true"
                  className="ios-pill-slider pointer-events-none absolute top-0 right-0 left-0 h-[44px] rounded-2xl border border-white/25 bg-white/[0.14] shadow-[0_8px_24px_rgba(10,132,255,0.18),inset_0_1px_0_rgba(255,255,255,0.38)]"
                  style={{ transform: `translate3d(0, ${activeIndex * 50}px, 0)` }}
                />

                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectTab(item.id)}
                      className={`ios-spring-press relative z-10 flex h-[44px] w-full items-center gap-3 rounded-2xl px-3.5 text-sm font-semibold transition-colors whitespace-nowrap ${
                        active ? 'text-white' : 'text-slate-300/80 hover:text-white'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 transition-transform duration-200 ${
                          active ? 'scale-110 text-sky-300' : 'text-slate-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="border-t border-white/[0.12] px-2 pt-4 text-xs text-slate-400">
              <p className="font-medium text-slate-200">
                {!isOnline
                  ? 'Offline Mode'
                  : syncStatus === 'synced'
                    ? 'Cloud Synced'
                    : 'On-Device Mode'}
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
                className="liquid-primary-btn ios-spring-press flex min-h-[38px] items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-white whitespace-nowrap shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>New</span>
              </button>
            </header>

            {/* Non-Intrusive Offline Connectivity Notice */}
            {!isOnline && (
              <div className="flex items-center justify-center gap-2 border-b border-amber-400/20 bg-amber-500/15 px-4 py-2 text-xs font-medium text-amber-100 backdrop-blur-md">
                <WifiOff className="h-3.5 w-3.5" />
                <span>
                  Offline Mode — OS alarms stay active; cloud sync will resume when online.
                </span>
              </div>
            )}

            {/* Active View Content with Apple Directional Spring Transition */}
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-24 sm:px-6 lg:px-8 lg:py-8">
              <div
                key={activeTab}
                className={tabDirection === 'right' ? 'animate-view-right' : 'animate-view-left'}
              >
                {resolvedChildren}
              </div>
            </main>
          </div>

          {/* Fixed Mobile iOS Liquid Glass Bottom Tab Bar with Continuous Sliding Glass Pill */}
          <nav
            aria-label="Mobile navigation"
            className="liquid-nav fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.18] pb-safe lg:hidden"
          >
            <div className="relative mx-2 my-1.5 grid h-[54px] grid-cols-4 items-center">
              {/* Sliding Liquid Glass Pill */}
              <div
                aria-hidden="true"
                className="ios-pill-slider pointer-events-none absolute top-0 bottom-0 left-0 rounded-2xl border border-white/25 bg-white/[0.14] shadow-[0_6px_18px_rgba(10,132,255,0.22),inset_0_1px_0_rgba(255,255,255,0.38)]"
                style={{
                  width: '25%',
                  transform: `translate3d(${activeIndex * 100}%, 0, 0)`,
                }}
              />

              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectTab(item.id)}
                    className={`ios-spring-press relative z-10 flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors ${
                      active ? 'text-sky-300' : 'text-slate-300/75 hover:text-white'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 transition-transform duration-200 ${
                        active ? 'scale-110' : 'scale-100'
                      }`}
                    />
                    <span className="text-[11px] font-semibold tracking-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Apple Dynamic Island Top-of-Phone Notification with EMO Robot Eyes */}
          <DynamicIsland
            activeEvent={activeIslandEvent}
            toasts={toasts}
            onDismissToast={onDismissToast}
            onEventRetracted={handleIslandRetracted}
          />
        </div>
      </DynamicIslandContext.Provider>
    );
  }
);

AppShell.displayName = 'AppShell';
