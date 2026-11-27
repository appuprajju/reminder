export type LiveAssistantSource = 'siri' | 'google-assistant' | 'voice';

export interface ExtractedWakeCommand {
  source: LiveAssistantSource;
  commandText: string;
  isAlarmHint: boolean;
  needsFollowUp: boolean;
}

export interface LiveAssistantPrefs {
  siriConnected: boolean;
  googleAssistantConnected: boolean;
}

const LIVE_PREFS_KEY = 'rm_live_assistant_prefs_v1';

const WAKE_PREFIX_REGEX =
  /^(?:(?:hey|ok|okay)\s+(siri|google|reminder\s*me)|reminder\s*me)(?:[\s,.:;!?-]+|$)/i;

const ACTION_PREAMBLE_REGEX =
  /^(?:please\s+|can\s+you\s+|could\s+you\s+)?(?:(?:add|create|set|schedule|save|make|new)\s+(?:a\s+|an\s+|new\s+)?(alarm|reminder|task)|remind\s+me)(?:\s+(?:in|on|with|using)\s+(?:the\s+)?reminder\s*me(?:\s+app)?)?(?:\s+(?:to|that|for|about))?(?:[\s,.:;!?-]+|$)/i;

const APP_ONLY_FILLER_REGEX =
  /^(?:(?:in|on|with|using)\s+(?:the\s+)?reminder\s*me(?:\s+app)?|open\s+reminder\s*me)(?:[\s,.:;!?-]+|$)/i;

function normalizeWhitespace(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

function stripCommandPreambles(raw: string): { commandText: string; isAlarmHint: boolean } {
  let working = normalizeWhitespace(raw);
  let isAlarmHint = false;

  const actionMatch = working.match(ACTION_PREAMBLE_REGEX);
  if (actionMatch) {
    const noun = (actionMatch[1] || '').toLowerCase();
    if (noun === 'alarm') {
      isAlarmHint = true;
    }
    working = normalizeWhitespace(working.slice(actionMatch[0].length));
  }

  // Handle second pass if user said "in reminderme" separately
  const appMatch = working.match(APP_ONLY_FILLER_REGEX);
  if (appMatch) {
    working = normalizeWhitespace(working.slice(appMatch[0].length));
  }

  // Strip trailing "in reminderme" / "on reminder me"
  working = normalizeWhitespace(
    working.replace(/\s+(?:in|on|using)\s+(?:the\s+)?reminder\s*me(?:\s+app)?[.!?]*$/i, '')
  );

  // Strip leading filler "to " left over after stripping
  working = normalizeWhitespace(working.replace(/^(?:to|that)\s+/i, ''));

  if (/\b(alarm|wake\s+me)\b/i.test(working)) {
    isAlarmHint = true;
  }

  return { commandText: working, isAlarmHint };
}

/**
 * Checks whether a spoken transcript starts with a wake phrase
 * ("Hey Siri", "Hey Google", "OK Google", "Hey reminderme") and extracts
 * the reminder payload. Returns null if no wake phrase was spoken.
 */
export function extractWakeCommand(transcript: string): ExtractedWakeCommand | null {
  const cleaned = normalizeWhitespace(transcript);
  if (!cleaned) return null;

  const wakeMatch = cleaned.match(WAKE_PREFIX_REGEX);
  if (!wakeMatch) return null;

  const wakeTarget = (wakeMatch[1] || 'reminderme').toLowerCase().replace(/\s+/g, '');
  const source: LiveAssistantSource =
    wakeTarget === 'siri'
      ? 'siri'
      : wakeTarget === 'google'
        ? 'google-assistant'
        : 'voice';

  const afterWake = normalizeWhitespace(cleaned.slice(wakeMatch[0].length));
  if (!afterWake) {
    return {
      source,
      commandText: '',
      isAlarmHint: false,
      needsFollowUp: true,
    };
  }

  const { commandText, isAlarmHint } = stripCommandPreambles(afterWake);
  if (!commandText) {
    return {
      source,
      commandText: '',
      isAlarmHint,
      needsFollowUp: true,
    };
  }

  return {
    source,
    commandText,
    isAlarmHint,
    needsFollowUp: false,
  };
}

/**
 * Parses direct speech from a 1-tap Live Assistant button.
 * Works whether the user says "Hey Siri, add a reminder to call Mom at 5pm"
 * OR just "Call Mom at 5pm".
 */
export function parseDirectAssistantSpeech(
  transcript: string,
  defaultSource: LiveAssistantSource = 'voice'
): ExtractedWakeCommand | null {
  const cleaned = normalizeWhitespace(transcript);
  if (!cleaned) return null;

  const wakeResult = extractWakeCommand(cleaned);
  if (wakeResult) {
    return wakeResult;
  }

  const { commandText, isAlarmHint } = stripCommandPreambles(cleaned);
  if (!commandText) {
    return {
      source: defaultSource,
      commandText: cleaned,
      isAlarmHint,
      needsFollowUp: false,
    };
  }

  return {
    source: defaultSource,
    commandText,
    isAlarmHint,
    needsFollowUp: false,
  };
}

export function loadLiveAssistantPrefs(): LiveAssistantPrefs {
  try {
    const raw = localStorage.getItem(LIVE_PREFS_KEY);
    if (!raw) {
      return { siriConnected: false, googleAssistantConnected: false };
    }
    const parsed = JSON.parse(raw) as Partial<LiveAssistantPrefs>;
    return {
      siriConnected: Boolean(parsed.siriConnected),
      googleAssistantConnected: Boolean(parsed.googleAssistantConnected),
    };
  } catch {
    return { siriConnected: false, googleAssistantConnected: false };
  }
}

export function saveLiveAssistantPrefs(prefs: LiveAssistantPrefs): void {
  try {
    localStorage.setItem(LIVE_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
}
