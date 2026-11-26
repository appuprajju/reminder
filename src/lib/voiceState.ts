import { parseQuickInput, type ParsedQuickReminder } from './parser';

export type VoicePhase = 'closed' | 'ready' | 'listening' | 'review' | 'error';

export const SHORT_TAP_THRESHOLD_MS = 280;

export const VOICE_EXAMPLE_PHRASES = [
  'Wake me up tomorrow at 6:30am',
  'Remind me to drink water in 30 min',
  'Take vitamins daily at 8:30am urgent',
  'Team standup weekdays at 10am',
] as const;

export const VOICE_LANGUAGES = [
  { id: 'auto', label: 'Auto' },
  { id: 'en-IN', label: 'English (IN)' },
  { id: 'en-US', label: 'English (US)' },
  { id: 'en-GB', label: 'English (UK)' },
  { id: 'hi-IN', label: 'Hindi' },
] as const;

export type VoiceLanguageId = (typeof VOICE_LANGUAGES)[number]['id'];

export function resolveSpeechLang(langId: VoiceLanguageId, browserLang?: string): string {
  if (langId !== 'auto') return langId;
  return browserLang?.trim() || 'en-US';
}

export function mapSpeechError(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access was blocked. Allow microphone permission in browser or phone settings, or type your alarm below.';
    case 'audio-capture':
      return 'No microphone was detected on this device. Connect a mic or type your alarm below.';
    case 'no-speech':
      return 'No speech was detected. Tap the mic and speak clearly, or pick a quick phrase below.';
    case 'network':
      return 'Voice recognition needs a brief network connection on this browser. You can still type naturally below.';
    case 'unsupported':
      return 'Voice recognition is not available in this browser. Type naturally below to use the same smart alarm parser.';
    case 'aborted':
      return '';
    default:
      return 'Could not finish voice capture. Tap the mic to try again or type your alarm below.';
  }
}

export function combineTranscript(finalText: string, interimText: string): string {
  return `${finalText} ${interimText}`.replace(/\s+/g, ' ').trim();
}

/**
 * Determines the next phase when voice capture finishes or the user releases the trigger.
 * - Any captured transcript transitions straight to 'review' for quick confirm or edit.
 * - A brief tap (< 280ms) with no transcript keeps the sheet in 'ready' mode cleanly.
 * - An error state stays in 'error' so the user sees actionable recovery guidance.
 */
export function resolveReleasePhase(
  holdDurationMs: number,
  transcript: string,
  hasError: boolean
): VoicePhase {
  if (transcript.trim().length > 0) return 'review';
  if (hasError) return 'error';
  if (holdDurationMs < SHORT_TAP_THRESHOLD_MS) return 'ready';
  return 'ready';
}

export function buildReminderDraftFromVoice(
  transcript: string,
  now = new Date()
): ParsedQuickReminder | null {
  const clean = transcript.trim();
  if (!clean) return null;
  return parseQuickInput(clean, now);
}
