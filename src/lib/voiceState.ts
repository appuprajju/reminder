import { parseQuickInput, type ParsedQuickReminder } from './parser';

export type VoicePhase = 'closed' | 'ready' | 'listening' | 'review' | 'error';

export const SHORT_TAP_THRESHOLD_MS = 280;

export const VOICE_EXAMPLE_PHRASES = [
  'Take vitamins daily at 8:30am',
  'Call Sam in 20 min urgent',
  'Stretch weekdays at 6pm gentle',
] as const;

export function mapSpeechError(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access was blocked. Allow microphone permission in browser or device settings, or type your reminder below.';
    case 'audio-capture':
      return 'No microphone was detected on this device. Connect a mic or type your reminder below.';
    case 'no-speech':
      return 'No speech was detected. Hold the mic button and speak clearly, or type below.';
    case 'network':
      return 'Speech recognition needs a brief network connection on this browser. You can still type naturally below.';
    case 'unsupported':
      return 'Voice recognition is not available in this browser. Type naturally below to use the same smart parser.';
    case 'aborted':
      return '';
    default:
      return 'Could not finish voice capture. Hold to try again or type your reminder below.';
  }
}

export function combineTranscript(finalText: string, interimText: string): string {
  return `${finalText} ${interimText}`.replace(/\s+/g, ' ').trim();
}

/**
 * Determines the next phase when the user releases the press-and-hold mic trigger.
 * - Any captured transcript transitions straight to 'review' for quick confirm or edit.
 * - A brief tap (< 280ms) with no transcript opens the sheet in 'ready' mode cleanly.
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
