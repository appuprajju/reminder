import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getTodayDateKey, isReminderDoneToday } from '../lib/time';
import type { AnalyticsSummary, Reminder, UserProfile } from '../types';

interface InsightsViewProps {
  reminders: Reminder[];
  localAnalytics: AnalyticsSummary;
  user: UserProfile | null;
  isOnline: boolean;
}

const FEATURE_LABELS: Record<string, string> = {
  reminder_done: 'Completed reminders',
  push_done: 'Dismissed from lock screen',
  reminder_add: 'Created reminders',
  reminder_edit: 'Edited schedules',
  reminder_snooze: 'Snoozed alarms',
  push_snooze: 'Lock-screen snoozes',
  push_sent: 'Background push delivered',
  push_test: 'Instant push tests',
  push_test_delayed: 'Delayed lock-screen tests',
  login: 'Account sign-ins',
  signup: 'New accounts',
};

export const InsightsView: React.FC<InsightsViewProps> = ({
  reminders,
  localAnalytics,
  user,
  isOnline,
}) => {
  const [scope, setScope] = useState<'me' | 'all'>('me');
  const [serverData, setServerData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !isOnline) {
      setServerData(null);
      return;
    }
    let active = true;
    setLoading(true);
    const req = scope === 'all' && user.admin ? api.adminAnalytics() : api.analytics();
    req
      .then((data) => {
        if (active) setServerData(data);
      })
      .catch(() => {
        if (active) setServerData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOnline, scope, user]);

  const data = serverData || localAnalytics;
  const todayKey = getTodayDateKey();
  const doneToday = reminders.filter((r) => isReminderDoneToday(r, todayKey)).length;
  const alarmCount = reminders.filter((r) => r.isAlarm).length;

  // Compute consecutive active streak from last7 completion days
  const streakDays = (() => {
    let streak = 0;
    const rev = [...data.last7].reverse();
    for (const d of rev) {
      if (d.done > 0) streak++;
      else if (streak > 0) break;
    }
    return streak || (doneToday > 0 ? 1 : 0);
  })();

  const maxDayVal = Math.max(1, ...data.last7.map((d) => Math.max(d.done, d.events)));
  const maxFeatureVal = Math.max(1, ...(data.features.map((f) => f.count)));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-50">Streaks &amp; Insights</h1>
          <p className="mt-0.5 text-xs text-slate-400">
            {serverData ? 'Synced cloud activity' : 'On-device offline metrics'}
          </p>
        </div>

        {user?.admin && (
          <div className="inline-flex rounded-xl border border-white/[0.08] bg-[#0F1426] p-1">
            <button
              type="button"
              onClick={() => setScope('me')}
              className={`min-h-[38px] rounded-lg px-3.5 text-xs font-semibold transition-colors ${
                scope === 'me' ? 'bg-[#2F80FF] text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              My Account
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`min-h-[38px] rounded-lg px-3.5 text-xs font-semibold transition-colors ${
                scope === 'all' ? 'bg-[#2F80FF] text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Users
            </button>
          </div>
        )}
      </div>

      {/* 4-Column Metric Row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="glass-surface rounded-2xl p-4">
          <p className="text-xs font-medium text-slate-400">Active Streak</p>
          <p className="mt-2 font-mono text-3xl font-bold text-white tabular-nums">
            {streakDays}
            <span className="ml-1 text-sm font-medium text-slate-400">days</span>
          </p>
        </div>
        <div className="glass-surface rounded-2xl p-4">
          <p className="text-xs font-medium text-slate-400">Done Today</p>
          <p className="mt-2 font-mono text-3xl font-bold text-emerald-400 tabular-nums">
            {doneToday}
            <span className="ml-1 text-sm font-medium text-slate-400">/ {reminders.length}</span>
          </p>
        </div>
        <div className="glass-surface rounded-2xl p-4">
          <p className="text-xs font-medium text-slate-400">Loud Alarms</p>
          <p className="mt-2 font-mono text-3xl font-bold text-white tabular-nums">{alarmCount}</p>
        </div>
        <div className="glass-surface rounded-2xl p-4">
          <p className="text-xs font-medium text-slate-400">
            {scope === 'all' ? 'Total Users' : 'Total Actions'}
          </p>
          <p className="mt-2 font-mono text-3xl font-bold text-[#60A5FA] tabular-nums">
            {scope === 'all' ? data.users : data.totalEvents}
          </p>
        </div>
      </div>

      {/* 7-Day Activity & Completion Bar Chart + Feature Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="glass-surface rounded-3xl p-5 lg:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-50">Last 7 Days Activity</h2>
            <span className="text-xs text-slate-400">
              {loading ? 'Refreshing...' : 'Completions & actions'}
            </span>
          </div>

          <div className="mt-6 flex h-44 items-end gap-3">
            {data.last7.map((d) => {
              const eventPct = Math.max(6, Math.round((d.events / maxDayVal) * 100));
              const donePct = d.done > 0 ? Math.max(10, Math.round((d.done / maxDayVal) * 100)) : 0;
              const shortLabel = new Date(`${d.day}T12:00:00`).toLocaleDateString(undefined, {
                weekday: 'short',
              });
              return (
                <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                    {d.done > 0 ? d.done : d.events}
                  </span>
                  <div className="relative flex h-32 w-full max-w-[36px] items-end overflow-hidden rounded-lg bg-white/[0.05]">
                    <div
                      style={{ height: `${eventPct}%` }}
                      className="w-full rounded-t-lg bg-[#2F80FF]/35 transition-[height] duration-300"
                    />
                    {donePct > 0 && (
                      <div
                        style={{ height: `${donePct}%` }}
                        className="absolute inset-x-0 bottom-0 rounded-t-lg bg-[#22C55E] transition-[height] duration-300"
                      />
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">{shortLabel}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="glass-surface rounded-3xl p-5 lg:col-span-5">
          <h2 className="text-base font-bold text-slate-50">Usage Breakdown</h2>
          {data.features.length === 0 ? (
            <p className="mt-6 text-sm text-slate-400">
              Complete or schedule reminders to populate your activity breakdown.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {data.features.slice(0, 6).map((f) => {
                const widthPct = Math.max(8, Math.round((f.count / maxFeatureVal) * 100));
                return (
                  <div key={f.feature} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">
                        {FEATURE_LABELS[f.feature] || f.feature.replace(/_/g, ' ')}
                      </span>
                      <span className="font-mono font-semibold text-slate-100 tabular-nums">
                        {f.count}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        style={{ width: `${widthPct}%` }}
                        className="h-full rounded-full bg-[#2F80FF]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Admin Per-User Table */}
      {scope === 'all' && data.perUser && data.perUser.length > 0 && (
        <section className="glass-surface overflow-x-auto rounded-3xl p-5">
          <h2 className="text-base font-bold text-slate-50">Registered Accounts</h2>
          <table className="mt-4 w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] text-slate-400">
                <th className="pb-2.5 font-semibold">User</th>
                <th className="pb-2.5 font-semibold">Reminders</th>
                <th className="pb-2.5 font-semibold">Push Devices</th>
                <th className="pb-2.5 font-semibold text-right">Events</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {data.perUser.map((u) => (
                <tr key={u.email} className="text-slate-200">
                  <td className="py-3">
                    <div className="font-semibold">{u.name}</div>
                    <div className="text-slate-500">{u.email}</div>
                  </td>
                  <td className="py-3 font-mono tabular-nums">{u.reminders}</td>
                  <td className="py-3 font-mono tabular-nums">{u.devices}</td>
                  <td className="py-3 text-right font-mono tabular-nums">{u.events}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
};
