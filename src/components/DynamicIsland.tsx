import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  getEyeAnimationCycle,
  getEyeCssClasses,
  resolveIslandMeta,
  type EmoEyeAnimationStep,
} from '../lib/emoExpression';
import type { ToastMessage, TriggerIslandFn } from '../types';

export interface DynamicIslandEvent extends ToastMessage {
  durationMs?: number;
}

interface DynamicIslandContextValue {
  onTriggerIsland: TriggerIslandFn;
}

export const DynamicIslandContext = createContext<DynamicIslandContextValue>({
  onTriggerIsland: () => {},
});

/**
 * Allows any component inside AppShell to trigger the top-of-screen Dynamic Island
 * with expressive EMO robot eyes: onTriggerIsland('created' | 'success' | 'alert').
 */
export function useDynamicIsland(): DynamicIslandContextValue {
  return useContext(DynamicIslandContext);
}

export interface DynamicIslandProps {
  /** Event triggered imperatively via onTriggerIsland('created' | 'success' | 'alert') */
  activeEvent?: DynamicIslandEvent | null;
  /** App-level toast/notification stream integrated automatically into the island */
  toasts?: ToastMessage[];
  /** Called when an app toast is dismissed or retracted */
  onDismissToast?: (id: string) => void;
  /** Called after an imperative event finishes retracting */
  onEventRetracted?: (id: string) => void;
}

const RETRACT_ANIMATION_MS = 250;

/**
 * Renders the glowing OLED EMO robot eye SVGs directly responsive to the animation classes
 * defined in index.css (.emo-eyes-excited, .emo-eyes-happy, .emo-eyes-alert, .emo-eye-blink,
 * .emo-eyes-sleepy, .emo-eyes-curious, .emo-sparkle).
 */
function renderEmoEyeSvg(step: EmoEyeAnimationStep, accentHex: string, cycleKey: string) {
  const { groupClass, eyeClass } = getEyeCssClasses(step);

  return (
    <div
      aria-hidden="true"
      className="relative flex h-9 w-[54px] shrink-0 items-center justify-center rounded-full border border-white/[0.12] bg-[#02040A] shadow-[inset_0_2px_6px_rgba(0,0,0,0.85)]"
    >
      {/* Soft OLED ambient bloom behind eyes */}
      <span
        className="pointer-events-none absolute inset-1 rounded-full opacity-35 blur-md"
        style={{ backgroundColor: accentHex }}
      />

      <svg
        viewBox="0 0 64 34"
        data-testid="emo-robot-eyes"
        data-eye-step={step}
        className="relative z-10 h-[26px] w-[48px] overflow-visible"
        style={{ filter: `drop-shadow(0 0 5px ${accentHex})` }}
      >
        <g key={cycleKey} className={groupClass}>
          {step === 'happy' && (
            <>
              {/* Joyful EMO ^ ^ curved glowing smile eyes */}
              <path
                d="M10 21 C13 11, 23 11, 26 21"
                fill="none"
                stroke={accentHex}
                strokeWidth="4.6"
                strokeLinecap="round"
              />
              <path
                d="M38 21 C41 11, 51 11, 54 21"
                fill="none"
                stroke={accentHex}
                strokeWidth="4.6"
                strokeLinecap="round"
              />
              {/* Joyful cheek sparkle dots */}
              <circle cx="9" cy="25" r="1.7" fill={accentHex} className="emo-sparkle" />
              <circle cx="55" cy="25" r="1.7" fill={accentHex} className="emo-sparkle" />
            </>
          )}

          {(step === 'excited' || step === 'blink') && (
            <>
              {/* Iconic EMO wide glowing squircle OLED eyes with crisp specular highlights */}
              <g className={eyeClass}>
                <rect x="9" y="6" width="18" height="22" rx="7" fill={accentHex} />
                <circle cx="15" cy="12" r="2.6" fill="#FFFFFF" opacity="0.88" />
                <circle cx="21" cy="17.5" r="1.2" fill="#FFFFFF" opacity="0.7" />
              </g>
              <g className={eyeClass}>
                <rect x="37" y="6" width="18" height="22" rx="7" fill={accentHex} />
                <circle cx="43" cy="12" r="2.6" fill="#FFFFFF" opacity="0.88" />
                <circle cx="49" cy="17.5" r="1.2" fill="#FFFFFF" opacity="0.7" />
              </g>
            </>
          )}

          {step === 'alert' && (
            <>
              {/* Perked-up attentive alert eyes with crisp center pupils */}
              <rect x="10" y="8" width="16" height="18" rx="6" fill={accentHex} />
              <rect x="38" y="8" width="16" height="18" rx="6" fill={accentHex} />
              <circle cx="18" cy="17" r="3.1" fill="#02040A" />
              <circle cx="46" cy="17" r="3.1" fill="#02040A" />
              <circle cx="16.5" cy="15.5" r="1.1" fill="#FFFFFF" opacity="0.85" />
              <circle cx="44.5" cy="15.5" r="1.1" fill="#FFFFFF" opacity="0.85" />
            </>
          )}

          {step === 'sleepy' && (
            <>
              {/* Cozy snooze half-lidded eyes */}
              <rect x="9" y="15" width="18" height="10" rx="5" fill={accentHex} />
              <rect x="37" y="15" width="18" height="10" rx="5" fill={accentHex} />
              <path
                d="M8 14 Q18 17 28 14"
                fill="none"
                stroke="#02040A"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              <path
                d="M36 14 Q46 17 56 14"
                fill="none"
                stroke="#02040A"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
            </>
          )}

          {step === 'curious' && (
            <>
              {/* Classic EMO asymmetric inquisitive scanning eyes */}
              <rect x="9" y="7" width="17" height="20" rx="6.5" fill={accentHex} />
              <circle cx="15" cy="12.5" r="2.2" fill="#FFFFFF" opacity="0.82" />
              <rect x="38" y="10" width="17" height="14" rx="6" fill={accentHex} />
              <circle cx="44" cy="14" r="1.8" fill="#FFFFFF" opacity="0.82" />
            </>
          )}

          {step === 'sad' && (
            <>
              {/* Expressive worried/slanted EMO eyes */}
              <rect
                x="10"
                y="11"
                width="17"
                height="15"
                rx="6"
                fill={accentHex}
                transform="rotate(-10 18.5 18.5)"
              />
              <rect
                x="37"
                y="11"
                width="17"
                height="15"
                rx="6"
                fill={accentHex}
                transform="rotate(10 45.5 18.5)"
              />
              <circle cx="16" cy="15" r="1.8" fill="#FFFFFF" opacity="0.72" />
              <circle cx="44" cy="15" r="1.8" fill="#FFFFFF" opacity="0.72" />
            </>
          )}
        </g>
      </svg>
    </div>
  );
}

/**
 * Apple Dynamic Island component that manages the complete pop-in, hold, and retract-to-top
 * lifecycle with cycling glowing OLED EMO robot eye SVG animations.
 */
export const DynamicIsland: React.FC<DynamicIslandProps> = ({
  activeEvent = null,
  toasts = [],
  onDismissToast,
  onEventRetracted,
}) => {
  const latestToast = toasts.length > 0 ? toasts[toasts.length - 1] : null;
  const incomingEvent: DynamicIslandEvent | null = activeEvent ?? latestToast;
  const incomingIsImperative = Boolean(activeEvent);

  const [renderedEvent, setRenderedEvent] = useState<DynamicIslandEvent | null>(incomingEvent);
  const [renderedIsImperative, setRenderedIsImperative] = useState<boolean>(incomingIsImperative);
  const [phase, setPhase] = useState<'visible' | 'retracting'>('visible');
  const [cycleIndex, setCycleIndex] = useState(0);

  const autoRetractTimerRef = useRef<number | null>(null);
  const exitCleanupTimerRef = useRef<number | null>(null);
  const lastIncomingIdRef = useRef<string | null>(incomingEvent?.id ?? null);
  const renderedEventRef = useRef<DynamicIslandEvent | null>(renderedEvent);
  const pausedRef = useRef(false);

  renderedEventRef.current = renderedEvent;

  const clearTimers = useCallback(() => {
    if (autoRetractTimerRef.current !== null) {
      window.clearTimeout(autoRetractTimerRef.current);
      autoRetractTimerRef.current = null;
    }
    if (exitCleanupTimerRef.current !== null) {
      window.clearTimeout(exitCleanupTimerRef.current);
      exitCleanupTimerRef.current = null;
    }
  }, []);

  const beginRetract = useCallback(
    (targetId: string, isImperative: boolean) => {
      clearTimers();
      setPhase('retracting');
      exitCleanupTimerRef.current = window.setTimeout(() => {
        exitCleanupTimerRef.current = null;
        setRenderedEvent((cur) => (cur?.id === targetId ? null : cur));
        setPhase('visible');
        if (isImperative) {
          onEventRetracted?.(targetId);
        } else {
          onDismissToast?.(targetId);
        }
      }, RETRACT_ANIMATION_MS);
    },
    [clearTimers, onDismissToast, onEventRetracted]
  );

  const scheduleAutoRetract = useCallback(
    (ev: DynamicIslandEvent, isImperative: boolean) => {
      if (autoRetractTimerRef.current !== null) {
        window.clearTimeout(autoRetractTimerRef.current);
        autoRetractTimerRef.current = null;
      }
      if (!isImperative) return;
      const duration = ev.durationMs ?? (ev.onUndo ? 5200 : 3400);
      autoRetractTimerRef.current = window.setTimeout(() => {
        autoRetractTimerRef.current = null;
        if (!pausedRef.current) {
          beginRetract(ev.id, true);
        }
      }, duration);
    },
    [beginRetract]
  );

  // Sync incoming events (imperative triggers & app toast stream) into pop-in / retract lifecycle
  useEffect(() => {
    const incomingId = incomingEvent?.id ?? null;

    if (incomingEvent && incomingId !== lastIncomingIdRef.current) {
      lastIncomingIdRef.current = incomingId;
      clearTimers();
      setRenderedEvent(incomingEvent);
      setRenderedIsImperative(incomingIsImperative);
      setPhase('visible');
      setCycleIndex(0);
      scheduleAutoRetract(incomingEvent, incomingIsImperative);
      return;
    }

    if (!incomingEvent) {
      lastIncomingIdRef.current = null;
      const current = renderedEventRef.current;
      if (current && exitCleanupTimerRef.current === null) {
        clearTimers();
        setPhase('retracting');
        const targetId = current.id;
        exitCleanupTimerRef.current = window.setTimeout(() => {
          exitCleanupTimerRef.current = null;
          setRenderedEvent((cur) => (cur?.id === targetId ? null : cur));
          setPhase('visible');
        }, RETRACT_ANIMATION_MS);
      }
    }
  }, [clearTimers, incomingEvent, incomingIsImperative, scheduleAutoRetract]);

  useEffect(() => clearTimers, [clearTimers]);

  // Cycle the EMO robot eyes through choreographed steps (e.g., excited -> blink -> happy)
  const resolvedMeta = renderedEvent ? resolveIslandMeta(renderedEvent) : null;
  const eyeCycle = resolvedMeta ? getEyeAnimationCycle(resolvedMeta.expression) : null;

  useEffect(() => {
    if (!renderedEvent || !eyeCycle || phase === 'retracting') return;
    const currentFrame = eyeCycle[cycleIndex % eyeCycle.length];
    const timer = window.setTimeout(() => {
      setCycleIndex((idx) => (idx + 1) % eyeCycle.length);
    }, currentFrame.durationMs);
    return () => window.clearTimeout(timer);
  }, [cycleIndex, eyeCycle, phase, renderedEvent]);

  if (!renderedEvent || !resolvedMeta || !eyeCycle) return null;

  const activeFrame = eyeCycle[cycleIndex % eyeCycle.length];

  const handleDismissNow = () => {
    if (phase === 'retracting') return;
    beginRetract(renderedEvent.id, renderedIsImperative);
  };

  const island = (
    <div
      aria-live="polite"
      data-testid="dynamic-island-container"
      className="pointer-events-none fixed inset-x-0 top-0 z-[110] flex justify-center px-3 pt-[max(10px,env(safe-area-inset-top))]"
    >
      <div
        key={renderedEvent.id}
        role="status"
        data-testid="dynamic-island"
        data-expression={resolvedMeta.expression}
        data-eye-step={activeFrame.step}
        data-phase={phase}
        onClick={handleDismissNow}
        onMouseEnter={() => {
          pausedRef.current = true;
        }}
        onMouseLeave={() => {
          pausedRef.current = false;
          if (renderedIsImperative && phase === 'visible') {
            scheduleAutoRetract(renderedEvent, true);
          }
        }}
        style={{
          boxShadow: `0 18px 44px rgba(0, 0, 0, 0.65), 0 0 28px ${resolvedMeta.glowRgba}, inset 0 1px 0 rgba(255, 255, 255, 0.24)`,
        }}
        className={`pointer-events-auto flex w-full max-w-[376px] cursor-pointer items-center gap-3 rounded-[28px] border border-white/[0.18] bg-[#04060E]/96 py-2 pr-3 pl-2.5 backdrop-blur-2xl sm:max-w-[410px] ${
          phase === 'retracting' ? 'dynamic-island-exit' : 'dynamic-island-enter'
        }`}
      >
        {renderEmoEyeSvg(
          activeFrame.step,
          resolvedMeta.accentHex,
          `${renderedEvent.id}-${cycleIndex}-${activeFrame.step}`
        )}

        <div className="min-w-0 flex-1">
          <p
            className="text-[11px] font-bold tracking-wide"
            style={{ color: resolvedMeta.accentHex }}
          >
            {resolvedMeta.label}
          </p>
          <p className="truncate text-[13px] font-semibold text-white">{renderedEvent.text}</p>
        </div>

        {renderedEvent.onUndo && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              renderedEvent.onUndo?.();
              handleDismissNow();
            }}
            className="ios-spring-press min-h-[36px] shrink-0 rounded-full border border-white/15 bg-white/[0.12] px-3.5 text-xs font-bold text-white hover:bg-white/[0.2]"
          >
            {renderedEvent.undoLabel || 'Undo'}
          </button>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(island, document.body) : island;
};
