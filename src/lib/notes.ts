import type { VoiceNote } from '../types';
import { parseQuickInput, type ParsedQuickReminder } from './parser';

export function deriveNoteTitle(title: string, content: string): string {
  const trimmedTitle = title.trim();
  if (trimmedTitle) return trimmedTitle.slice(0, 80);

  const firstLine = content
    .trim()
    .split(/\r?\n/)[0]
    ?.replace(/\s+/g, ' ')
    .trim();

  if (!firstLine) return 'Voice Note';
  const words = firstLine.split(' ');
  const candidate = words.slice(0, 7).join(' ');
  return candidate.length > 56 ? `${candidate.slice(0, 53)}…` : candidate;
}

export function createVoiceNote(input: {
  title?: string;
  content: string;
  pinned?: boolean;
  durationSec?: number;
  nowMs?: number;
}): VoiceNote {
  const now = input.nowMs ?? Date.now();
  const content = input.content.trim();
  return {
    id: `note_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    title: deriveNoteTitle(input.title || '', content),
    content,
    pinned: Boolean(input.pinned),
    createdAt: now,
    updatedAt: now,
    durationSec: input.durationSec,
  };
}

export function sortVoiceNotes(notes: VoiceNote[]): VoiceNote[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
}

export function formatNoteTimestamp(ts: number, nowMs = Date.now()): string {
  const diffMin = Math.max(0, Math.floor((nowMs - ts) / 60000));
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function buildReminderDraftFromNote(
  note: Pick<VoiceNote, 'title' | 'content'>,
  now = new Date()
): ParsedQuickReminder & { note: string } {
  const combined = note.title && note.title !== 'Voice Note' ? note.title : note.content;
  const parsed = parseQuickInput(combined.slice(0, 100), now);
  return {
    ...parsed,
    note: note.content.slice(0, 140),
  };
}
