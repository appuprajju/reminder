import { parseQuickInput, type ParsedQuickReminder } from './parser';

export type AssistantPlatform = 'siri' | 'google-assistant';
export type ShortcutActionType = 'add' | 'voice';
export type ShortcutAlertOverride = 'auto' | 'alarm' | 'reminder';

export interface VoiceShortcutRecord {
  id: string;
  assistant: AssistantPlatform;
  phrase: string;
  action: ShortcutActionType;
  defaultAlertMode: ShortcutAlertOverride;
  autoSave: boolean;
  enabled: boolean;
  createdAt: number;
  lastTriggeredAt?: number;
}

export interface ParsedAssistantIntent {
  action: 'add' | 'voice';
  text: string;
  source: AssistantPlatform | 'shortcut' | 'share';
  mode: 'auto' | 'review';
  alertOverride: ShortcutAlertOverride;
  shortcutId?: string;
  signature: string;
}

const STORAGE_KEY = 'rm_voice_shortcuts_v1';

export const DEFAULT_VOICE_SHORTCUTS: VoiceShortcutRecord[] = [
  {
    id: 'sc_siri_add',
    assistant: 'siri',
    phrase: 'Add a reminder in reminderme',
    action: 'add',
    defaultAlertMode: 'auto',
    autoSave: true,
    enabled: true,
    createdAt: 1700000000000,
  },
  {
    id: 'sc_siri_alarm',
    assistant: 'siri',
    phrase: 'Set an alarm in reminderme',
    action: 'add',
    defaultAlertMode: 'alarm',
    autoSave: true,
    enabled: true,
    createdAt: 1700000001000,
  },
  {
    id: 'sc_gassist_add',
    assistant: 'google-assistant',
    phrase: 'Add a reminder in reminderme',
    action: 'add',
    defaultAlertMode: 'auto',
    autoSave: true,
    enabled: true,
    createdAt: 1700000002000,
  },
  {
    id: 'sc_gassist_voice',
    assistant: 'google-assistant',
    phrase: 'Start voice reminder in reminderme',
    action: 'voice',
    defaultAlertMode: 'auto',
    autoSave: true,
    enabled: true,
    createdAt: 1700000003000,
  },
];

export function detectPreferredAssistant(): AssistantPlatform {
  if (typeof navigator === 'undefined') return 'siri';
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'google-assistant';
  return 'siri';
}

export function loadVoiceShortcuts(): VoiceShortcutRecord[] {
  if (typeof window === 'undefined') return DEFAULT_VOICE_SHORTCUTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VOICE_SHORTCUTS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_VOICE_SHORTCUTS;
    return parsed.filter(
      (item): item is VoiceShortcutRecord =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        typeof item.phrase === 'string' &&
        (item.assistant === 'siri' || item.assistant === 'google-assistant')
    );
  } catch {
    return DEFAULT_VOICE_SHORTCUTS;
  }
}

export function saveVoiceShortcuts(shortcuts: VoiceShortcutRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
  } catch {
    // ignore storage quota errors
  }
}

export function createVoiceShortcutRecord(input: {
  assistant: AssistantPlatform;
  phrase: string;
  action: ShortcutActionType;
  defaultAlertMode: ShortcutAlertOverride;
  autoSave?: boolean;
}): VoiceShortcutRecord {
  return {
    id: `sc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    assistant: input.assistant,
    phrase: input.phrase.trim().slice(0, 80) || 'Add a reminder in reminderme',
    action: input.action,
    defaultAlertMode: input.defaultAlertMode,
    autoSave: input.autoSave !== false,
    enabled: true,
    createdAt: Date.now(),
  };
}

export function formatAssistantLabel(source: ParsedAssistantIntent['source']): string {
  if (source === 'siri') return 'Siri';
  if (source === 'google-assistant') return 'Google Assistant';
  if (source === 'share') return 'Share Sheet';
  return 'Voice Shortcut';
}

/**
 * Builds an HTTPS deep-link URL that Siri Shortcuts, Google Assistant Routines,
 * NFC tags, or launchers can open to auto-save a reminder or open voice capture.
 */
export function buildAssistantDeepLink(
  origin: string,
  shortcut: Pick<VoiceShortcutRecord, 'id' | 'assistant' | 'action' | 'defaultAlertMode' | 'autoSave'>,
  sampleText?: string
): string {
  const cleanOrigin = (origin || 'https://makeuperfect.in').replace(/\/+$/, '');
  const params = new URLSearchParams();
  params.set('action', shortcut.action);
  params.set('source', shortcut.assistant);
  params.set('mode', shortcut.autoSave ? 'auto' : 'review');
  if (shortcut.defaultAlertMode !== 'auto') {
    params.set('alert', shortcut.defaultAlertMode);
  }
  if (shortcut.id) {
    params.set('sid', shortcut.id);
  }
  if (shortcut.action === 'add') {
    if (sampleText !== undefined) {
      params.set('text', sampleText);
    } else {
      return `${cleanOrigin}/?${params.toString()}&text=`;
    }
  }
  return `${cleanOrigin}/?${params.toString()}`;
}

/**
 * Builds the native Capacitor custom URL scheme (`reminderme://add?...`) used by
 * iOS AppIntents and Android App Actions (`shortcuts.xml`).
 */
export function buildNativeSchemeUri(
  shortcut: Pick<VoiceShortcutRecord, 'assistant' | 'action' | 'defaultAlertMode' | 'autoSave'>,
  sampleText?: string
): string {
  const params = new URLSearchParams();
  params.set('source', shortcut.assistant);
  params.set('mode', shortcut.autoSave ? 'auto' : 'review');
  if (shortcut.defaultAlertMode !== 'auto') {
    params.set('alert', shortcut.defaultAlertMode);
  }
  if (shortcut.action === 'add') {
    if (sampleText !== undefined) {
      params.set('text', sampleText);
      return `reminderme://add?${params.toString()}`;
    }
    return `reminderme://add?${params.toString()}&text=`;
  }
  return `reminderme://voice?${params.toString()}`;
}

/**
 * Parses incoming web query strings, Web Share Target payloads, or native `reminderme://` URLs
 * into a structured assistant intent. Returns null when the URL does not contain an assistant intent.
 */
export function parseAssistantIntentUrl(rawUrl: string): ParsedAssistantIntent | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl, 'https://reminderme.local');
  } catch {
    return null;
  }

  const params = parsedUrl.searchParams;
  const isCustomScheme = parsedUrl.protocol === 'reminderme:';
  const hostAction = isCustomScheme ? parsedUrl.hostname.toLowerCase() : '';
  const pathAction = parsedUrl.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  const queryAction = (params.get('action') || '').trim().toLowerCase();

  const resolvedAction = queryAction || hostAction || pathAction;

  const rawSource = (params.get('source') || '').trim().toLowerCase();
  const source: ParsedAssistantIntent['source'] =
    rawSource === 'siri' || rawSource === 'ios'
      ? 'siri'
      : rawSource === 'google-assistant' || rawSource === 'assistant' || rawSource === 'google'
        ? 'google-assistant'
        : resolvedAction === 'share'
          ? 'share'
          : 'shortcut';

  const rawMode = (params.get('mode') || '').trim().toLowerCase();
  const mode: 'auto' | 'review' = rawMode === 'review' ? 'review' : 'auto';

  const rawAlert = (params.get('alert') || params.get('alarm') || '').trim().toLowerCase();
  const alertOverride: ShortcutAlertOverride =
    rawAlert === 'alarm' || rawAlert === '1' || rawAlert === 'true'
      ? 'alarm'
      : rawAlert === 'reminder' || rawAlert === '0' || rawAlert === 'false'
        ? 'reminder'
        : 'auto';

  const shortcutId = params.get('sid')?.trim() || undefined;

  if (resolvedAction === 'voice') {
    return {
      action: 'voice',
      text: '',
      source,
      mode,
      alertOverride,
      shortcutId,
      signature: `voice|${source}|${shortcutId || ''}`,
    };
  }

  if (resolvedAction === 'add' || resolvedAction === 'create' || resolvedAction === 'share') {
    const titleParam = (params.get('title') || '').trim();
    const textParam = (params.get('text') || params.get('q') || params.get('phrase') || '').trim();
    const timeParam = (params.get('time') || '').trim();

    const combinedText = [titleParam, textParam, timeParam]
      .filter((part, idx, arr) => Boolean(part) && arr.indexOf(part) === idx)
      .join(' ')
      .trim();

    if (!combinedText) {
      return {
        action: 'voice',
        text: '',
        source,
        mode,
        alertOverride,
        shortcutId,
        signature: `voice-empty|${source}|${shortcutId || ''}`,
      };
    }

    return {
      action: 'add',
      text: combinedText,
      source,
      mode,
      alertOverride,
      shortcutId,
      signature: `add|${source}|${alertOverride}|${combinedText.toLowerCase()}`,
    };
  }

  return null;
}

/**
 * Converts a parsed assistant intent into a ready-to-save ParsedQuickReminder
 * applying any explicit Loud Alarm / Gentle Reminder override.
 */
export function buildReminderFromAssistantIntent(
  intent: ParsedAssistantIntent,
  now: Date = new Date()
): ParsedQuickReminder {
  const parsed = parseQuickInput(intent.text, now);
  if (intent.alertOverride === 'alarm') {
    return { ...parsed, isAlarm: true, emoji: parsed.emoji === '🔔' ? '⏰' : parsed.emoji };
  }
  if (intent.alertOverride === 'reminder') {
    return { ...parsed, isAlarm: false, emoji: parsed.emoji === '⏰' ? '🔔' : parsed.emoji };
  }
  return parsed;
}

export const IOS_APP_INTENT_SWIFT_SNIPPET = `import AppIntents
import UIKit

struct AddReminderIntent: AppIntent {
    static var title: LocalizedStringResource = "Add a reminder in reminderme"
    static var description = IntentDescription("Creates a reminder or exact alarm in reminderme.")
    static var openAppWhenRun: Bool = true

    @Parameter(title: "Reminder")
    var phrase: String

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let encoded = phrase.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        if let url = URL(string: "reminderme://add?source=siri&mode=auto&text=\\(encoded)") {
            await UIApplication.shared.open(url)
        }
        return .result(dialog: "Added \\(phrase) to reminderme.")
    }
}

struct ReminderMeShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: AddReminderIntent(),
            phrases: [
                "Add a reminder in \\(.applicationName)",
                "Set an alarm in \\(.applicationName)"
            ],
            shortTitle: "Add Reminder",
            systemImageName: "alarm"
        )
    }
}`;
