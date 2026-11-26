import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarArrowDown,
  CalendarPlus,
  Check,
  ListChecks,
  Mail,
  Play,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { ALARM_SOUNDS, playAlarmCycle } from '../lib/audio';
import type { ParsedQuickReminder } from '../lib/parser';
import { DAY_LETTERS, getDateKeyFromDate } from '../lib/time';
import type { AlarmSoundId, Priority, Reminder, SubtaskItem } from '../types';
import { SpringSegmentedControl } from './SpringSegmentedControl';

export type SheetDraft = ParsedQuickReminder & { note?: string };

interface ReminderSheetProps {
  open: boolean;
  editing: Reminder | null;
  initialDraft?: SheetDraft | null;
  defaultDate?: Date | null;
  defaultAlarmSound: AlarmSoundId;
  customAudioName: string | null;
  availableTags: string[];
  onAddCustomTag: (tag: string) => void;
  onSave: (draft: {
    id?: string;
    title: string;
    note: string;
    time: string;
    days: number[] | null;
    oneTimeDate?: string | null;
    emoji: string;
    color: string;
    priority: Priority;
    tag: string | null;
    isAlarm: boolean;
    sound: AlarmSoundId | null;
    subtasks: SubtaskItem[];
  }) => void;
  onDelete?: (id: string) => void;
  onRequestAddToGoogleCalendar?: (reminder: Reminder) => void;
  onRequestEmailReminder?: (reminder: Reminder) => void;
  onExportIcs?: (reminder: Reminder) => void;
  onClose: () => void;
}

const QUICK_EMOJIS = ['⏰', '🔔', '💧', '💊', '🎯', '🏃', '📞', '🌙'];

export const ReminderSheet: React.FC<ReminderSheetProps> = ({
  open,
  editing,
  initialDraft,
  defaultDate,
  defaultAlarmSound,
  customAudioName,
  availableTags,
  onAddCustomTag,
  onSave,
  onDelete,
  onRequestAddToGoogleCalendar,
  onRequestEmailReminder,
  onExportIcs,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [time, setTime] = useState('08:30');
  const [isAlarm, setIsAlarm] = useState(true);
  const [sound, setSound] = useState<AlarmSoundId>(defaultAlarmSound);
  const [days, setDays] = useState<number[]>([]);
  const [oneTimeDate, setOneTimeDate] = useState<string | null>(null);
  const [priority, setPriority] = useState<Priority>('med');
  const [tag, setTag] = useState<string | null>(null);
  const [emoji, setEmoji] = useState('⏰');
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [addingTag, setAddingTag] = useState(false);
  const [newTagText, setNewTagText] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setNote(editing.note || '');
      setTime(editing.time);
      setIsAlarm(editing.isAlarm);
      setSound((editing.sound as AlarmSoundId) || defaultAlarmSound);
      setDays(editing.days || []);
      setOneTimeDate(editing.oneTimeDate || null);
      setPriority(editing.priority);
      setTag(editing.tag);
      setEmoji(editing.emoji || (editing.isAlarm ? '⏰' : '🔔'));
      setSubtasks(editing.subtasks ? editing.subtasks.map((s) => ({ ...s })) : []);
    } else if (initialDraft) {
      setTitle(initialDraft.title);
      setNote(initialDraft.note || '');
      setTime(initialDraft.time);
      setIsAlarm(initialDraft.isAlarm);
      setSound(defaultAlarmSound);
      setDays(initialDraft.days || []);
      setOneTimeDate(initialDraft.oneTimeDate || null);
      setPriority(initialDraft.priority);
      setTag(initialDraft.tag);
      setEmoji(initialDraft.emoji || (initialDraft.isAlarm ? '⏰' : '🔔'));
      setSubtasks([]);
    } else {
      const next = new Date(Date.now() + 30 * 60000);
      const hh = String(next.getHours()).padStart(2, '0');
      const mm = String(Math.floor(next.getMinutes() / 5) * 5).padStart(2, '0');
      setTitle('');
      setNote('');
      setTime(`${hh}:${mm}`);
      setIsAlarm(true);
      setSound(defaultAlarmSound);
      if (defaultDate) {
        setDays([defaultDate.getDay()]);
        setOneTimeDate(getDateKeyFromDate(defaultDate));
      } else {
        setDays([]);
        setOneTimeDate(null);
      }
      setPriority('med');
      setTag(null);
      setEmoji('⏰');
      setSubtasks([]);
    }
    setNewSubtaskText('');
    setAddingTag(false);
    setNewTagText('');
  }, [defaultAlarmSound, defaultDate, editing, initialDraft, open]);

  if (!open) return null;

  const toggleDay = (dow: number) => {
    setOneTimeDate(null);
    setDays((prev) =>
      prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow].sort((a, b) => a - b)
    );
  };

  const handleAddSubtask = () => {
    const clean = newSubtaskText.trim().slice(0, 80);
    if (!clean || subtasks.length >= 25) return;
    setSubtasks((prev) => [
      ...prev,
      {
        id: `st_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        title: clean,
        done: false,
      },
    ]);
    setNewSubtaskText('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      id: editing?.id,
      title: title.trim(),
      note: note.trim(),
      time,
      days: days.length > 0 ? days : null,
      oneTimeDate,
      emoji,
      color: isAlarm ? '#0A84FF' : '#30D158',
      priority,
      tag,
      isAlarm,
      sound: isAlarm ? sound : null,
      subtasks,
    });
    onClose();
  };

  const handleCreateTag = () => {
    const clean = newTagText.trim().slice(0, 20);
    if (!clean) return;
    onAddCustomTag(clean);
    setTag(clean);
    setNewTagText('');
    setAddingTag(false);
  };

  const sheetContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editing ? 'Edit schedule' : 'New alarm or reminder'}
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="glass-elevated animate-sheet-up flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl"
      >
        {/* Drag Handle (Mobile bottom sheet affordance) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-white/20" />
        </div>

        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <h2 className="font-display text-lg font-bold text-slate-50">
            {editing ? 'Edit Schedule' : 'New Alarm or Reminder'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-white/[0.08] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Alert Style with Sliding Glass Segmented Control */}
          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-400">Delivery Style</span>
            <SpringSegmentedControl<'alarm' | 'gentle'>
              ariaLabel="Delivery style"
              fullWidth
              value={isAlarm ? 'alarm' : 'gentle'}
              onChange={(val) => setIsAlarm(val === 'alarm')}
              options={[
                { id: 'alarm', label: 'Loud Exact Alarm' },
                { id: 'gentle', label: 'Gentle Notification' },
              ]}
            />
          </div>

          {/* Title & Time */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-slate-400">Title</span>
              <input
                type="text"
                required
                maxLength={60}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Morning run, Take medication..."
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-base text-white placeholder:text-slate-500 focus:border-[#0A84FF] focus:outline-none sm:text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-400">Time</span>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3 font-mono text-base text-white tabular-nums focus:border-[#0A84FF] focus:outline-none sm:text-sm"
              />
            </label>
          </div>

          {/* Note */}
          <label className="block">
            <span className="text-xs font-medium text-slate-400">Note (optional)</span>
            <input
              type="text"
              maxLength={140}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Extra details shown on the lock screen"
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-base text-white placeholder:text-slate-500 focus:border-[#0A84FF] focus:outline-none sm:text-sm"
            />
          </label>

          {/* Subtasks & Checklist Builder */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <ListChecks className="h-3.5 w-3.5 text-sky-300" />
                <span>Subtasks &amp; Checklist</span>
              </span>
              <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                {subtasks.length}/25
              </span>
            </div>

            {subtasks.length > 0 && (
              <ul className="mt-2.5 space-y-1.5">
                {subtasks.map((st) => (
                  <li
                    key={st.id}
                    className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-[#060812]/60 px-2.5 py-1.5"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSubtasks((prev) =>
                          prev.map((item) =>
                            item.id === st.id ? { ...item, done: !item.done } : item
                          )
                        )
                      }
                      aria-label={st.done ? `Uncheck ${st.title}` : `Check ${st.title}`}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                        st.done
                          ? 'animate-check-pop border-[#30D158] bg-[#30D158] text-[#050712]'
                          : 'border-white/35 bg-white/[0.04] text-transparent'
                      }`}
                    >
                      <Check className="h-3 w-3 stroke-[3]" />
                    </button>
                    <span
                      className={`min-w-0 flex-1 truncate text-xs ${
                        st.done ? 'text-slate-400 line-through' : 'text-slate-100'
                      }`}
                    >
                      {st.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSubtasks((prev) => prev.filter((item) => item.id !== st.id))}
                      aria-label={`Remove ${st.title}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-red-500/15 hover:text-red-300"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-2.5 flex items-center gap-2">
              <input
                type="text"
                maxLength={80}
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder="Add a checklist step..."
                className="min-h-[40px] min-w-0 flex-1 rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3 text-sm text-white placeholder:text-slate-500 focus:border-[#0A84FF] focus:outline-none"
              />
              <button
                type="button"
                disabled={!newSubtaskText.trim() || subtasks.length >= 25}
                onClick={handleAddSubtask}
                className="ios-spring-press inline-flex min-h-[40px] shrink-0 items-center gap-1 rounded-xl border border-sky-400/30 bg-sky-500/20 px-3 text-xs font-semibold text-sky-100 hover:bg-sky-500/30 disabled:opacity-45"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Step</span>
              </button>
            </div>
          </div>

          {/* Repeat Schedule */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                Repeat Schedule {days.length === 0 && !oneTimeDate ? '(Every Day)' : ''}
              </span>
              {oneTimeDate && (
                <span className="font-mono text-xs text-[#60A5FA]">One-time · {oneTimeDate}</span>
              )}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1.5">
              {DAY_LETTERS.map((letter, idx) => {
                const on = days.includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={`ios-spring-press flex h-11 items-center justify-center rounded-xl border font-mono text-xs font-bold transition-colors ${
                      on
                        ? 'border-[#0A84FF] bg-[#0A84FF] text-white shadow-[0_4px_14px_rgba(10,132,255,0.38)]'
                        : 'border-white/[0.08] bg-white/[0.04] text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alarm Sound */}
          {isAlarm && (
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="sheet-alarm-sound" className="text-xs font-medium text-slate-400">
                  Alarm Ringtone
                </label>
                <button
                  type="button"
                  onClick={() => playAlarmCycle(sound)}
                  className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-[#60A5FA] hover:bg-white/[0.06]"
                >
                  <Play className="h-3 w-3" />
                  <span>Preview</span>
                </button>
              </div>
              <select
                id="sheet-alarm-sound"
                value={sound}
                onChange={(e) => setSound(e.target.value as AlarmSoundId)}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-sm text-white focus:border-[#0A84FF] focus:outline-none"
              >
                {ALARM_SOUNDS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
                {customAudioName && <option value="custom">Device: {customAudioName}</option>}
              </select>
            </div>
          )}

          {/* Priority + Icon */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="mb-1.5 block text-xs font-medium text-slate-400">Priority</span>
              <SpringSegmentedControl<Priority>
                ariaLabel="Reminder priority"
                fullWidth
                size="sm"
                value={priority}
                onChange={setPriority}
                options={[
                  { id: 'high', label: 'High' },
                  { id: 'med', label: 'Med' },
                  { id: 'low', label: 'Normal' },
                ]}
              />
            </div>

            <div>
              <span className="text-xs font-medium text-slate-400">Marker</span>
              <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                {QUICK_EMOJIS.slice(0, 4).map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setEmoji(em)}
                    className={`ios-spring-press min-h-[42px] rounded-xl border text-base transition-colors ${
                      emoji === em
                        ? 'border-[#0A84FF] bg-[#0A84FF]/20'
                        : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08]'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Tag</span>
              <button
                type="button"
                onClick={() => setAddingTag((v) => !v)}
                className="inline-flex min-h-[34px] items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[#60A5FA] hover:bg-white/[0.06]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Tag</span>
              </button>
            </div>

            {addingTag && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  maxLength={20}
                  value={newTagText}
                  onChange={(e) => setNewTagText(e.target.value)}
                  placeholder="Gym, Medication, Study..."
                  className="min-h-[44px] flex-1 rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3 text-sm text-white focus:border-[#0A84FF] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCreateTag}
                  className="ios-spring-press min-h-[44px] rounded-xl bg-[#0A84FF] px-4 text-xs font-semibold text-white"
                >
                  Save
                </button>
              </div>
            )}

            <div className="mt-2 flex flex-wrap gap-1.5">
              {availableTags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(tag === t ? null : t)}
                  className={`ios-spring-press min-h-[38px] rounded-xl border px-3 text-xs font-medium transition-colors ${
                    tag === t
                      ? 'border-[#0A84FF] bg-[#0A84FF]/25 text-white'
                      : 'border-white/[0.08] bg-white/[0.04] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar & Email Integrations when Editing Existing Reminder */}
          {editing && (onRequestAddToGoogleCalendar || onRequestEmailReminder || onExportIcs) && (
            <div className="border-t border-white/[0.08] pt-4">
              <span className="text-xs font-medium text-slate-400">
                Send to Calendar &amp; Email
              </span>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {onRequestAddToGoogleCalendar && (
                  <button
                    type="button"
                    onClick={() => onRequestAddToGoogleCalendar(editing)}
                    className="ios-spring-press flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 text-xs font-semibold text-slate-100 hover:bg-white/[0.1]"
                  >
                    <CalendarPlus className="h-4 w-4 text-sky-300" />
                    <span>{editing.googleCalendarEventId ? 'Re-add GCal' : 'Google Cal'}</span>
                  </button>
                )}
                {onRequestEmailReminder && (
                  <button
                    type="button"
                    onClick={() => onRequestEmailReminder(editing)}
                    className="ios-spring-press flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 text-xs font-semibold text-slate-100 hover:bg-white/[0.1]"
                  >
                    <Mail className="h-4 w-4 text-amber-300" />
                    <span>Email Alert</span>
                  </button>
                )}
                {onExportIcs && (
                  <button
                    type="button"
                    onClick={() => onExportIcs(editing)}
                    className="ios-spring-press flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 text-xs font-semibold text-slate-100 hover:bg-white/[0.1]"
                  >
                    <CalendarArrowDown className="h-4 w-4 text-emerald-300" />
                    <span>Apple .ics</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer CTA */}
        <div className="flex items-center justify-between gap-2.5 border-t border-white/[0.08] px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:py-4">
          {editing && onDelete ? (
            <button
              type="button"
              onClick={() => {
                onDelete(editing.id);
                onClose();
              }}
              className="ios-spring-press flex min-h-[48px] items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 text-sm font-semibold text-red-400 hover:bg-red-500/20"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="ios-spring-press min-h-[48px] rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 text-sm font-semibold text-slate-300 hover:bg-white/[0.08]"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="liquid-primary-btn ios-spring-press min-h-[48px] flex-1 rounded-xl px-5 text-sm font-semibold text-white"
          >
            {editing ? 'Save Changes' : isAlarm ? 'Schedule Exact Alarm' : 'Save Reminder'}
          </button>
        </div>
      </form>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(sheetContent, document.body) : sheetContent;
};
