import type {
  DynamicIslandTriggerOptions,
  DynamicIslandTriggerType,
  EmoExpression,
  ToastMessage,
} from '../types';

export interface DynamicIslandMeta {
  expression: EmoExpression;
  label: string;
  accentHex: string;
  glowRgba: string;
}

const ACCENTS: Record<EmoExpression, { accentHex: string; glowRgba: string }> = {
  excited: { accentHex: '#38D9FF', glowRgba: 'rgba(56, 217, 255, 0.34)' },
  happy: { accentHex: '#30F29B', glowRgba: 'rgba(48, 242, 155, 0.32)' },
  sleepy: { accentHex: '#FFB340', glowRgba: 'rgba(255, 179, 64, 0.32)' },
  curious: { accentHex: '#5AC8FA', glowRgba: 'rgba(90, 200, 250, 0.30)' },
  warning: { accentHex: '#FF9F0A', glowRgba: 'rgba(255, 159, 10, 0.32)' },
  sad: { accentHex: '#FF6961', glowRgba: 'rgba(255, 105, 97, 0.34)' },
};

const TRIGGER_PRESETS: Record<
  DynamicIslandTriggerType,
  { title: string; message: string; expression: EmoExpression; tone: ToastMessage['tone'] }
> = {
  created: {
    title: 'Alarm Created',
    message: 'Scheduled and armed for you',
    expression: 'excited',
    tone: 'success',
  },
  success: {
    title: 'All Set',
    message: 'Completed successfully',
    expression: 'happy',
    tone: 'success',
  },
  alert: {
    title: 'Alarm Alert',
    message: 'Heads up — check your schedule',
    expression: 'warning',
    tone: 'warning',
  },
};

export function buildIslandEventFromTrigger(
  type: DynamicIslandTriggerType,
  options?: DynamicIslandTriggerOptions,
  id = `island_${Date.now().toString(36)}`
): ToastMessage {
  const preset = TRIGGER_PRESETS[type];
  return {
    id,
    title: options?.title ?? preset.title,
    text: options?.message ?? preset.message,
    expression: preset.expression,
    tone: preset.tone,
    undoLabel: options?.undoLabel,
    onUndo: options?.onUndo,
  };
}

export function resolveIslandMeta(
  toast: Pick<ToastMessage, 'text' | 'title' | 'tone' | 'expression'>
): DynamicIslandMeta {
  const lower = `${toast.title || ''} ${toast.text}`.toLowerCase();

  let expression: EmoExpression = toast.expression || 'curious';
  if (!toast.expression) {
    if (toast.tone === 'danger' || /\b(deleted|removed|failed|error|could not)\b/.test(lower)) {
      expression = 'sad';
    } else if (/\b(snoozed|snooze)\b/.test(lower)) {
      expression = 'sleepy';
    } else if (toast.tone === 'warning') {
      expression = 'warning';
    } else if (
      /\b(completed|done|signed in|email sent|sent to|exported|downloaded|synced|backed up|imported)\b/.test(
        lower
      )
    ) {
      expression = 'happy';
    } else if (/\b(alarm|scheduled|updated|added|created|routine|calendar)\b/.test(lower)) {
      expression = 'excited';
    } else if (toast.tone === 'success') {
      expression = 'happy';
    } else {
      expression = 'curious';
    }
  }

  let label = toast.title;
  if (!label) {
    if (expression === 'sleepy') label = 'Snoozed';
    else if (expression === 'sad') label = toast.tone === 'danger' ? 'Removed' : 'Notice';
    else if (expression === 'warning') label = 'Heads Up';
    else if (expression === 'excited') label = 'Scheduled';
    else if (expression === 'happy') label = 'All Set';
    else label = 'reminderme';
  }

  const palette = ACCENTS[expression];
  return {
    expression,
    label,
    accentHex: palette.accentHex,
    glowRgba: palette.glowRgba,
  };
}

export type EmoEyeAnimationStep =
  | 'blink'
  | 'happy'
  | 'excited'
  | 'alert'
  | 'sleepy'
  | 'curious'
  | 'sad';

export interface EmoEyeCycleFrame {
  step: EmoEyeAnimationStep;
  durationMs: number;
}

const EYE_CYCLES: Record<EmoExpression, EmoEyeCycleFrame[]> = {
  excited: [
    { step: 'excited', durationMs: 920 },
    { step: 'blink', durationMs: 640 },
    { step: 'happy', durationMs: 1050 },
    { step: 'blink', durationMs: 680 },
  ],
  happy: [
    { step: 'happy', durationMs: 980 },
    { step: 'blink', durationMs: 640 },
    { step: 'excited', durationMs: 880 },
    { step: 'happy', durationMs: 1050 },
  ],
  warning: [
    { step: 'alert', durationMs: 740 },
    { step: 'blink', durationMs: 560 },
    { step: 'alert', durationMs: 740 },
    { step: 'curious', durationMs: 960 },
  ],
  sleepy: [
    { step: 'sleepy', durationMs: 1200 },
    { step: 'blink', durationMs: 680 },
  ],
  curious: [
    { step: 'curious', durationMs: 1050 },
    { step: 'blink', durationMs: 640 },
  ],
  sad: [
    { step: 'sad', durationMs: 980 },
    { step: 'blink', durationMs: 680 },
  ],
};

export function getEyeAnimationCycle(expression: EmoExpression): EmoEyeCycleFrame[] {
  return EYE_CYCLES[expression];
}

export function getEyeCssClasses(step: EmoEyeAnimationStep): {
  groupClass: string;
  eyeClass: string;
} {
  switch (step) {
    case 'excited':
      return { groupClass: 'emo-eyes-excited', eyeClass: '' };
    case 'happy':
      return { groupClass: 'emo-eyes-happy', eyeClass: '' };
    case 'alert':
      return { groupClass: 'emo-eyes-alert', eyeClass: '' };
    case 'blink':
      return { groupClass: '', eyeClass: 'emo-eye-blink' };
    case 'sleepy':
      return { groupClass: 'emo-eyes-sleepy', eyeClass: '' };
    case 'curious':
      return { groupClass: 'emo-eyes-curious', eyeClass: '' };
    case 'sad':
      return { groupClass: 'emo-eyes-alert', eyeClass: '' };
  }
}
