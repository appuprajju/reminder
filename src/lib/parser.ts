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

export interface VoiceDraftOverrides {
  isAlarm?: boolean;
  time?: string; // HH:mm
  repeatMode?: 'once' | 'daily' | 'weekdays';
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

const SPOKEN_NUMBER_WORDS: Record<string, string> = {
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
  eleven: '11',
  twelve: '12',
  fifteen: '15',
  twenty: '20',
  thirty: '30',
  forty: '40',
  'forty five': '45',
  'forty-five': '45',
  fifty: '50',
};

function normalizeSpokenNumbers(input: string): string {
  let out = input;
  // Convert spoken half/quarter hour phrases first
  out = out.replace(/\b(?:in|after)\s+(?:a\s+)?half\s+(?:an\s+)?hour\b/gi, 'in 30 min');
  out = out.replace(/\b(?:in|after)\s+an?\s+hour\b/gi, 'in 1 hour');
  out = out.replace(/\b(?:in|after)\s+a\s+minute\b/gi, 'in 1 min');

  // Convert "after 15 minutes" / "after ten minutes" -> "in 15 minutes"
  out = out.replace(
    /\bafter\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty(?:-|\s)five|fifty)\s*(hr|hrs|hour|hours|h|min|mins|minute|minutes|m)\b/gi,
    (_m, num, unit) => {
      const normalized = SPOKEN_NUMBER_WORDS[String(num).toLowerCase()] ?? num;
      return `in ${normalized} ${unit}`;
    }
  );

  // Convert "in ten minutes" / "in two hours"
  out = out.replace(
    /\bin\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty(?:-|\s)five|fifty)\s*(hr|hrs|hour|hours|h|min|mins|minute|minutes|m)\b/gi,
    (_m, num, unit) => {
      const normalized = SPOKEN_NUMBER_WORDS[String(num).toLowerCase()] ?? num;
      return `in ${normalized} ${unit}`;
    }
  );

  // Convert "a.m." / "p.m." -> "am" / "pm"
  out = out.replace(/\ba\.m\.?\b/gi, 'am').replace(/\bp\.m\.?\b/gi, 'pm');
  return out;
}

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
  if (/buy|milk|grocer|shop/.test(lower)) return '🛒';
  return isAlarm ? '⏰' : '🔔';
}

function buildSummary(time: string, days: number[] | null, oneTimeDate: string | null, isAlarm: boolean): string {
  const repeatText = oneTimeDate ? 'One-time' : days ? `${days.length}d/wk` : 'Daily';
  return `${time} · ${repeatText} · ${isAlarm ? 'Loud Alarm' : 'Notification'}`;
}

export function parseQuickInput(raw: string, now = new Date()): ParsedQuickReminder {
  const originalLower = raw.toLowerCase();
  let working = normalizeSpokenNumbers(raw.trim());
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

  // Alert style hint: distinguish gentle reminders vs loud alarms cleanly
  const explicitAlarmWord = /\b(alarm|wake\s+me|wake\s+up|loud)\b/i.test(originalLower);
  if (/\b(notify|notification|gentle|quiet|silent)\b/i.test(working)) {
    isAlarm = false;
    working = working.replace(/\b(notify|notification|gentle|quiet|silent)\b/gi, '').trim();
  } else if (explicitAlarmWord) {
    isAlarm = true;
    working = working.replace(/\bloud\b/gi, '').trim();
  } else if (/\b(remind\s+me|reminder)\b/i.test(originalLower)) {
    isAlarm = false;
  }

  // Hash tag (#work, #health)
  const tagMatch = working.match(/#([a-zA-Z0-9_-]{2,20})/);
  if (tagMatch) {
    tag = tagMatch[1];
    working = working.replace(tagMatch[0], '').trim();
  }

  // Relative time: "in 20 min", "in 2 hours", "in 1h 30m"
  const relMatch = working.match(
    /\bin\s+(?:(\d+)\s*(?:hr|hrs|hour|hours|h))?\s*(?:(\d+)\s*(?:min|mins|minute|minutes|m))?\b/i
  );
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

  // Spoken fractional clock phrases: "half past 7 pm", "quarter past 8", "quarter to 9 am"
  if (!timeExplicit) {
    const fracMatch = working.match(
      /\b(?:at\s+)?(half\s+past|quarter\s+past|quarter\s+to)\s+(\d{1,2})(?:\s*(am|pm))?\b/i
    );
    if (fracMatch) {
      const kind = fracMatch[1].toLowerCase().replace(/\s+/g, ' ');
      let h = Number(fracMatch[2]);
      const mer = (fracMatch[3] || '').toLowerCase();
      if (mer === 'pm' && h < 12) h += 12;
      if (mer === 'am' && h === 12) h = 0;

      if (kind === 'half past') {
        hours = h;
        minutes = 30;
      } else if (kind === 'quarter past') {
        hours = h;
        minutes = 15;
      } else {
        // quarter to h -> (h - 1):45
        hours = (h + 23) % 24;
        minutes = 45;
      }
      if (hours >= 0 && hours <= 23) {
        timeExplicit = true;
        working = working.replace(fracMatch[0], '').trim();
      }
    }
  }

  // Absolute time: "at 7:30pm", "at 19:45", "6am", "8.15 pm", "at 6 30 am", "7 o'clock pm"
  if (!timeExplicit) {
    const absMatch =
      working.match(/\b(?:at\s+)?(\d{1,2})(?:(?::|\.|\s+)(\d{2}))?\s*(?:o'?clock\s*)?(am|pm)\b/i) ||
      working.match(/\bat\s+(\d{1,2})(?::(\d{2}))\b/i) ||
      working.match(/\b(?:at\s+)?(\d{1,2})\s*o'?clock\b/i);

    if (absMatch) {
      let h = Number(absMatch[1]);
      const m = Number(absMatch[2] || 0);
      const mer = (absMatch[3] || '').toLowerCase();
      if (mer === 'pm' && h < 12) h += 12;
      if (mer === 'am' && h === 12) h = 0;
      if (!mer && /\b(evening|night|tonight)\b/i.test(working) && h >= 1 && h <= 11) {
        h += 12;
      }
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
    if (/\bmorning\b/i.test(working)) {
      hours = 8;
      minutes = 0;
      timeExplicit = true;
    } else if (/\bnoon\b/i.test(working)) {
      hours = 12;
      minutes = 0;
      timeExplicit = true;
    } else if (/\bafternoon\b/i.test(working)) {
      hours = 15;
      minutes = 0;
      timeExplicit = true;
    } else if (/\bevening\b/i.test(working)) {
      hours = 19;
      minutes = 0;
      timeExplicit = true;
    } else if (/\bnight|tonight\b/i.test(working)) {
      hours = 21;
      minutes = 30;
      timeExplicit = true;
    }
  }

  // Repeat patterns
  if (/\b(every\s*day|daily|every\s+morning|every\s+evening|every\s+night)\b/i.test(working)) {
    days = null;
    oneTimeDate = null;
    working = working
      .replace(/\b(every\s*day|daily|every\s+morning|every\s+evening|every\s+night)\b/gi, '')
      .trim();
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
  } else if (/\b(today|tonight)\b/i.test(working)) {
    oneTimeDate = getTodayDateKey(now);
    days = [now.getDay()];
    working = working.replace(/\b(today|tonight)\b/gi, '').trim();
  } else {
    const foundDays = new Set<number>();
    const dayRegex =
      /\b(sun(?:day)?|mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?)\b/gi;
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
  const cleanTitle =
    working
      .replace(/^(?:hey\s+|ok\s+|please\s+|can\s+you\s+)+/i, '')
      .replace(
        /^(?:remind\s+me(?:\s+to)?(?:\s+|$)|add\s+(?:a\s+)?(?:reminder|alarm)(?:\s+(?:to|for))?(?:\s+|$)|create\s+(?:a\s+)?(?:reminder|alarm)(?:\s+(?:to|for))?(?:\s+|$)|set\s+(?:an?\s+)?(?:alarm|reminder)(?:\s+(?:for|to))?(?:\s+|$)|wake\s+me(?:\s+up)?(?:\s+(?:for|to|at))?(?:\s+|$)|alarm(?:\s+(?:for|to))?(?:\s+|$))/i,
        ''
      )
      .replace(/\b(?:at|for|on)\s*$/i, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/^[\s,-]+|[\s,-]+$/g, '')
      .slice(0, 60) || (isAlarm ? 'Wake-up alarm' : 'Quick reminder');

  const capitalized = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  const dueAt = computeNextDueAt(time, days, now);
  const emoji = pickEmoji(capitalized, isAlarm);

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
    summary: buildSummary(time, days, oneTimeDate, isAlarm),
  };
}

export function applyVoiceDraftOverrides(
  base: ParsedQuickReminder,
  overrides: VoiceDraftOverrides,
  now = new Date()
): ParsedQuickReminder {
  const isAlarm = overrides.isAlarm !== undefined ? overrides.isAlarm : base.isAlarm;
  const time =
    overrides.time && /^([01]\d|2[0-3]):[0-5]\d$/.test(overrides.time) ? overrides.time : base.time;

  let days = base.days;
  let oneTimeDate = base.oneTimeDate;

  if (overrides.repeatMode === 'daily') {
    days = null;
    oneTimeDate = null;
  } else if (overrides.repeatMode === 'weekdays') {
    days = [1, 2, 3, 4, 5];
    oneTimeDate = null;
  } else if (overrides.repeatMode === 'once') {
    const due = computeNextDueAt(time, null, now);
    const target = new Date(due);
    oneTimeDate = getTodayDateKey(target);
    days = [target.getDay()];
  }

  const dueAt = computeNextDueAt(time, days, now);
  return {
    ...base,
    isAlarm,
    time,
    days,
    oneTimeDate,
    dueAt,
    summary: buildSummary(time, days, oneTimeDate, isAlarm),
  };
}
