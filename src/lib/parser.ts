import type { Priority } from '../types';
import { computeNextDueAt, getTodayDateKey } from './time';

export interface ParsedQuickReminder {
  title: string;
  time: string; // HH:mm
  days: number[] | null;
  oneTimeDate: string | null;
  isAlarm: boolean;
  priority: Priority;
  tag: string | null;
  emoji: string;
  dueAt: number;
  summary: string;
}

const DAY_MAP: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

function pickEmoji(text: string, isAlarm: boolean): string {
  const lower = text.toLowerCase();
  if (/water|hydrat|drink/.test(lower)) return '💧';
  if (/med|pill|vitamin|tablet/.test(lower)) return '💊';
  if (/gym|workout|run|walk|yoga|exercise/.test(lower)) return '🏃';
  if (/meet|standup|call|zoom|sync|client/.test(lower)) return '📞';
  if (/sleep|bed|wind down|night/.test(lower)) return '🌙';
  if (/wake|morning|alarm/.test(lower)) return '⏰';
  if (/study|read|book|learn|code|work/.test(lower)) return '🎯';
  if (/pay|bill|rent|bank/.test(lower)) return '💳';
  if (/lunch|dinner|breakfast|eat|cook/.test(lower)) return '🍽️';
  return isAlarm ? '⏰' : '🔔';
}

export function parseQuickInput(raw: string, now = new Date()): ParsedQuickReminder {
  let working = raw.trim();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  let timeExplicit = false;
  let days: number[] | null = null;
  let oneTimeDate: string | null = null;
  let isAlarm = true;
  let priority: Priority = 'med';
  let tag: string | null = null;

  // Priority hints
  if (/\b(urgent|important|critical|high|!)\b/i.test(working)) {
    priority = 'high';
    working = working.replace(/\b(urgent|important|critical|high)\b/gi, '').trim();
  } else if (/\b(low|later|optional)\b/i.test(working)) {
    priority = 'low';
    working = working.replace(/\b(low|optional)\b/gi, '').trim();
  }

  // Alert style hint
  if (/\b(notify|notification|gentle|quiet|silent)\b/i.test(working)) {
    isAlarm = false;
    working = working.replace(/\b(notify|notification|gentle|quiet|silent)\b/gi, '').trim();
  } else if (/\b(alarm|wake)\b/i.test(working)) {
    isAlarm = true;
  }

  // Hash tag (#work, #health)
  const tagMatch = working.match(/#([a-zA-Z0-9_-]{2,20})/);
  if (tagMatch) {
    tag = tagMatch[1];
    working = working.replace(tagMatch[0], '').trim();
  }

  // Relative time: "in 20 min", "in 2 hours", "in 1h 30m"
  const relMatch = working.match(/\bin\s+(?:(\d+)\s*(?:hr|hrs|hour|hours|h))?\s*(?:(\d+)\s*(?:min|mins|minute|minutes|m))?\b/i);
  if (relMatch && (relMatch[1] || relMatch[2])) {
    const addH = Number(relMatch[1] || 0);
    const addM = Number(relMatch[2] || 0);
    const target = new Date(now.getTime() + (addH * 60 + addM) * 60000);
    hours = target.getHours();
    minutes = target.getMinutes();
    oneTimeDate = getTodayDateKey(target);
    days = [target.getDay()];
    timeExplicit = true;
    working = working.replace(relMatch[0], '').trim();
  }

  // Absolute time: "at 7:30pm", "at 19:45", "6am", "8.15 pm"
  if (!timeExplicit) {
    const absMatch = working.match(/\b(?:at\s+)?(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)\b/i)
      || working.match(/\bat\s+(\d{1,2}):(\d{2})\b/i);
    if (absMatch) {
      let h = Number(absMatch[1]);
      const m = Number(absMatch[2] || 0);
      const mer = (absMatch[3] || '').toLowerCase();
      if (mer === 'pm' && h < 12) h += 12;
      if (mer === 'am' && h === 12) h = 0;
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        hours = h;
        minutes = m;
        timeExplicit = true;
        working = working.replace(absMatch[0], '').trim();
      }
    }
  }

  // Named times of day
  if (!timeExplicit) {
    if (/\bmorning\b/i.test(working)) { hours = 8; minutes = 0; timeExplicit = true; }
    else if (/\bnoon\b/i.test(working)) { hours = 12; minutes = 0; timeExplicit = true; }
    else if (/\bafternoon\b/i.test(working)) { hours = 15; minutes = 0; timeExplicit = true; }
    else if (/\bevening\b/i.test(working)) { hours = 19; minutes = 0; timeExplicit = true; }
    else if (/\bnight|tonight\b/i.test(working)) { hours = 21; minutes = 30; timeExplicit = true; }
  }

  // Repeat patterns
  if (/\b(every\s*day|daily)\b/i.test(working)) {
    days = null;
    oneTimeDate = null;
    working = working.replace(/\b(every\s*day|daily)\b/gi, '').trim();
  } else if (/\bweekdays?\b/i.test(working)) {
    days = [1, 2, 3, 4, 5];
    working = working.replace(/\b(?:on\s+|every\s+)?weekdays?\b/gi, '').trim();
  } else if (/\bweekends?\b/i.test(working)) {
    days = [0, 6];
    working = working.replace(/\b(?:on\s+|every\s+)?weekends?\b/gi, '').trim();
  } else if (/\btomorrow\b/i.test(working)) {
    const tom = new Date(now);
    tom.setDate(now.getDate() + 1);
    oneTimeDate = getTodayDateKey(tom);
    days = [tom.getDay()];
    working = working.replace(/\btomorrow\b/gi, '').trim();
  } else if (/\btoday\b/i.test(working)) {
    oneTimeDate = getTodayDateKey(now);
    days = [now.getDay()];
    working = working.replace(/\btoday\b/gi, '').trim();
  } else {
    const foundDays = new Set<number>();
    const dayRegex = /\b(sun(?:day)?|mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?)\b/gi;
    let match: RegExpExecArray | null;
    while ((match = dayRegex.exec(working)) !== null) {
      const idx = DAY_MAP[match[1].toLowerCase()];
      if (idx !== undefined) foundDays.add(idx);
    }
    if (foundDays.size > 0) {
      days = [...foundDays].sort((a, b) => a - b);
      working = working
        .replace(/\bevery\b/gi, '')
        .replace(dayRegex, '')
        .replace(/\b(and|on|,)\b/gi, ' ')
        .trim();
    }
  }

  // Default fallback time if none parsed: next 15-minute slot
  if (!timeExplicit) {
    const nextSlot = new Date(now.getTime() + 15 * 60000);
    hours = nextSlot.getHours();
    minutes = Math.ceil(nextSlot.getMinutes() / 5) * 5;
    if (minutes >= 60) {
      minutes = 0;
      hours = (hours + 1) % 24;
    }
  }

  const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const cleanTitle = working
    .replace(/^(remind\s+me\s+to|set\s+(?:an?\s+)?alarm\s+(?:for|to)?|alarm\s+for)\s+/i, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,-]+|[\s,-]+$/g, '')
    .slice(0, 60) || 'Quick reminder';

  const capitalized = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  const dueAt = computeNextDueAt(time, days, now);
  const emoji = pickEmoji(capitalized, isAlarm);
  const repeatText = oneTimeDate ? 'One-time' : days ? `${days.length}d/wk` : 'Daily';

  return {
    title: capitalized,
    time,
    days,
    oneTimeDate,
    isAlarm,
    priority,
    tag,
    emoji,
    dueAt,
    summary: `${time} · ${repeatText} · ${isAlarm ? 'Loud Alarm' : 'Notification'}`,
  };
}
