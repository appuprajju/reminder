import React, { useEffect, useState } from 'react';
import { AlarmClock, Bell, Play, Plus, Trash2, X } from 'lucide-react';
import { ALARM_SOUNDS, playAlarmCycle } from '../lib/audio';
import { DAY_LETTERS, getDateKeyFromDate } from '../lib/time';
import type { AlarmSoundId, Priority, Reminder } from '../types';

interface ReminderSheetProps {
  open: boolean;
  editing: Reminder | null;
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
  }) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const QUICK_EMOJIS = ['⏰', '🔔', '💧', '💊', '🎯', '🏃', '📞', '🌙'];

export const ReminderSheet: React.FC<ReminderSheetProps> = ({
  open,
  editing,
  defaultDate,
  defaultAlarmSound,
  customAudioName,
  availableTags,
  onAddCustomTag,
  onSave,
  onDelete,
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
    }
    setAddingTag(false);
    setNewTagText('');
  }, [defaultAlarmSound, defaultDate, editing, open]);

  if (!open) return null;

  const toggleDay = (dow: number) => {
    setOneTimeDate(null);
    setDays((prev) =>
      prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow].sort((a, b) => a - b)
    );
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
      color: isAlarm ? '#2F80FF' : '#22C55E',
      priority,
      tag,
      isAlarm,
      sound: isAlarm ? sound : null,
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-4"
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
          <h2 className="text-lg font-bold text-slate-50">
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
          {/* Alert Style */}
          <div>
            <span className="text-xs font-medium text-slate-400">Delivery Style</span>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsAlarm(true)}
                className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition-colors ${
                  isAlarm
                    ? 'border-[#2F80FF] bg-[#2F80FF]/20 text-white'
                    : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-slate-200'
                }`}
              >
                <AlarmClock className="h-4 w-4 text-red-400" />
                <span>Loud Exact Alarm</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAlarm(false)}
                className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition-colors ${
                  !isAlarm
                    ? 'border-[#2F80FF] bg-[#2F80FF]/20 text-white'
                    : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bell className="h-4 w-4 text-[#60A5FA]" />
                <span>Gentle Notification</span>
              </button>
            </div>
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
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-base text-white placeholder:text-slate-500 focus:border-[#2F80FF] focus:outline-none sm:text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-400">Time</span>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3 font-mono text-base text-white tabular-nums focus:border-[#2F80FF] focus:outline-none sm:text-sm"
              />
            </label>
          </div>

          {/* Note */}
          <label className="block">
            <span className="text-xs font-medium text-slate-400">Note (optional)</span>
            <input
              type="text"
              maxLength={90}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Extra details shown on the lock screen"
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-base text-white placeholder:text-slate-500 focus:border-[#2F80FF] focus:outline-none sm:text-sm"
            />
          </label>

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
                    className={`flex h-11 items-center justify-center rounded-xl border font-mono text-xs font-bold transition-colors ${
                      on
                        ? 'border-[#2F80FF] bg-[#2F80FF] text-white'
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
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-sm text-white focus:border-[#2F80FF] focus:outline-none"
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
              <span className="text-xs font-medium text-slate-400">Priority</span>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'high', label: 'High' },
                    { id: 'med', label: 'Med' },
                    { id: 'low', label: 'Normal' },
                  ] as { id: Priority; label: string }[]
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id)}
                    className={`min-h-[44px] rounded-xl border text-xs font-semibold transition-colors ${
                      priority === p.id
                        ? 'border-[#2F80FF] bg-[#2F80FF]/20 text-white'
                        : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-medium text-slate-400">Marker</span>
              <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                {QUICK_EMOJIS.slice(0, 4).map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setEmoji(em)}
                    className={`min-h-[44px] rounded-xl border text-base transition-colors ${
                      emoji === em
                        ? 'border-[#2F80FF] bg-[#2F80FF]/20'
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
                  className="min-h-[44px] flex-1 rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3 text-sm text-white focus:border-[#2F80FF] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCreateTag}
                  className="min-h-[44px] rounded-xl bg-[#2F80FF] px-4 text-xs font-semibold text-white"
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
                  className={`min-h-[38px] rounded-xl border px-3 text-xs font-medium transition-colors ${
                    tag === t
                      ? 'border-[#2F80FF] bg-[#2F80FF]/25 text-white'
                      : 'border-white/[0.08] bg-white/[0.04] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky Footer CTA */}
        <div className="flex items-center justify-between gap-2.5 border-t border-white/[0.08] px-5 py-4 pb-safe">
          {editing && onDelete ? (
            <button
              type="button"
              onClick={() => {
                onDelete(editing.id);
                onClose();
              }}
              className="flex min-h-[48px] items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 text-sm font-semibold text-red-400 hover:bg-red-500/20"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 text-sm font-semibold text-slate-300 hover:bg-white/[0.08]"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="min-h-[48px] flex-1 rounded-xl bg-[#2F80FF] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#256FE6]"
          >
            {editing ? 'Save Changes' : isAlarm ? 'Schedule Exact Alarm' : 'Save Reminder'}
          </button>
        </div>
      </form>
    </div>
  );
};
