import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  extractWakeCommand,
  loadLiveAssistantPrefs,
  parseDirectAssistantSpeech,
  saveLiveAssistantPrefs,
  type LiveAssistantPrefs,
  type LiveAssistantSource,
} from '../lib/liveAssistant';
import { triggerHaptic } from '../lib/nativeBridge';

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export interface LiveVoiceCommandPayload {
  source: LiveAssistantSource;
  commandText: string;
  isAlarmHint: boolean;
}

export interface UseLiveVoiceAssistantOptions {
  vibrate: boolean;
  onAutoSaveCommand: (payload: LiveVoiceCommandPayload) => void;
  onStatusNotice?: (kind: 'created' | 'success' | 'alert', title: string, message: string) => void;
}

export function useLiveVoiceAssistant({
  vibrate,
  onAutoSaveCommand,
  onStatusNotice,
}: UseLiveVoiceAssistantOptions) {
  const isSupported = useMemo(() => getSpeechRecognitionCtor() !== null, []);
  const [prefs, setPrefs] = useState<LiveAssistantPrefs>(() => loadLiveAssistantPrefs());
  const [handsFreeEnabled, setHandsFreeEnabled] = useState(false);
  const [oneTapActive, setOneTapActive] = useState(false);
  const [activeSource, setActiveSource] = useState<LiveAssistantSource>('voice');
  const [awaitingFollowUp, setAwaitingFollowUp] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const restartTimerRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const handsFreeRef = useRef(false);
  const oneTapRef = useRef(false);
  const activeSourceRef = useRef<LiveAssistantSource>('voice');
  const awaitingFollowUpRef = useRef(false);
  const followUpSourceRef = useRef<LiveAssistantSource>('voice');
  const latestTranscriptRef = useRef('');
  const lastCommittedRef = useRef<{ key: string; at: number }>({ key: '', at: 0 });
  const callbacksRef = useRef({ onAutoSaveCommand, onStatusNotice });
  callbacksRef.current = { onAutoSaveCommand, onStatusNotice };

  const clearTimers = useCallback(() => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stopEngine = useCallback(
    (abort = true) => {
      clearTimers();
      const rec = recRef.current;
      if (!rec) return;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      recRef.current = null;
      try {
        if (abort) rec.abort();
        else rec.stop();
      } catch {
        // ignore speech engine state errors
      }
    },
    [clearTimers]
  );

  const commitCommand = useCallback(
    (payload: LiveVoiceCommandPayload) => {
      const normalizedKey = `${payload.source}:${payload.commandText.toLowerCase().trim()}`;
      const now = Date.now();
      if (
        lastCommittedRef.current.key === normalizedKey &&
        now - lastCommittedRef.current.at < 3000
      ) {
        return;
      }
      lastCommittedRef.current = { key: normalizedKey, at: now };
      triggerHaptic('medium', vibrate);
      callbacksRef.current.onAutoSaveCommand(payload);
    },
    [vibrate]
  );

  const startEngine = useCallback(
    (mode: 'one-tap' | 'hands-free') => {
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) {
        setErrorMessage('Live microphone voice requires Chrome, Safari, or Edge.');
        setHandsFreeEnabled(false);
        handsFreeRef.current = false;
        setOneTapActive(false);
        oneTapRef.current = false;
        callbacksRef.current.onStatusNotice?.(
          'alert',
          'Voice Unsupported',
          'Open reminderme in Chrome or Safari for live voice.'
        );
        return false;
      }

      stopEngine(true);
      setErrorMessage(null);
      latestTranscriptRef.current = '';
      setLiveTranscript('');

      try {
        const rec = new Ctor();
        rec.lang = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';
        rec.continuous = mode === 'hands-free';
        rec.interimResults = true;
        rec.maxAlternatives = 1;
        recRef.current = rec;

        rec.onresult = (event) => {
          let combined = '';
          let newestFinal = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const item = event.results[i];
            const chunk = item?.[0]?.transcript || '';
            combined += `${chunk} `;
            if (item?.isFinal) {
              newestFinal += `${chunk} `;
            }
          }

          const displayText = combined.trim();
          const finalText = newestFinal.trim();
          latestTranscriptRef.current = displayText;
          setLiveTranscript(displayText);

          if (mode === 'one-tap') {
            if (silenceTimerRef.current !== null) {
              window.clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
            if (finalText) {
              const parsed = parseDirectAssistantSpeech(finalText, activeSourceRef.current);
              if (parsed && parsed.commandText) {
                oneTapRef.current = false;
                setOneTapActive(false);
                stopEngine(true);
                setLiveTranscript('');
                commitCommand({
                  source: parsed.source,
                  commandText: parsed.commandText,
                  isAlarmHint: parsed.isAlarmHint,
                });
                if (handsFreeRef.current) {
                  restartTimerRef.current = window.setTimeout(() => {
                    if (handsFreeRef.current && !oneTapRef.current) {
                      startEngine('hands-free');
                    }
                  }, 600);
                }
              }
            } else if (displayText) {
              // Auto-commit gracefully after brief silence so user doesn't have to tap Save
              silenceTimerRef.current = window.setTimeout(() => {
                if (!oneTapRef.current) return;
                const spoken = latestTranscriptRef.current.trim();
                if (!spoken) return;
                const parsed = parseDirectAssistantSpeech(spoken, activeSourceRef.current);
                oneTapRef.current = false;
                setOneTapActive(false);
                stopEngine(true);
                setLiveTranscript('');
                if (parsed && parsed.commandText) {
                  commitCommand({
                    source: parsed.source,
                    commandText: parsed.commandText,
                    isAlarmHint: parsed.isAlarmHint,
                  });
                }
                if (handsFreeRef.current) {
                  restartTimerRef.current = window.setTimeout(() => {
                    if (handsFreeRef.current && !oneTapRef.current) {
                      startEngine('hands-free');
                    }
                  }, 600);
                }
              }, 1450);
            }
            return;
          }

          // Continuous hands-free wake-word mode
          if (!finalText) return;

          if (awaitingFollowUpRef.current) {
            const followParsed = parseDirectAssistantSpeech(finalText, followUpSourceRef.current);
            awaitingFollowUpRef.current = false;
            setAwaitingFollowUp(false);
            setLiveTranscript('');
            if (followParsed && followParsed.commandText) {
              commitCommand({
                source: followParsed.source,
                commandText: followParsed.commandText,
                isAlarmHint: followParsed.isAlarmHint,
              });
            }
            return;
          }

          const wake = extractWakeCommand(finalText);
          if (!wake) return;

          if (wake.needsFollowUp) {
            awaitingFollowUpRef.current = true;
            followUpSourceRef.current = wake.source;
            setAwaitingFollowUp(true);
            triggerHaptic('light', vibrate);
            callbacksRef.current.onStatusNotice?.(
              'created',
              wake.source === 'siri'
                ? 'Siri Listening…'
                : wake.source === 'google-assistant'
                  ? 'Google Assistant Listening…'
                  : 'reminderme Listening…',
              'Say your reminder & time now'
            );
            return;
          }

          setLiveTranscript('');
          commitCommand({
            source: wake.source,
            commandText: wake.commandText,
            isAlarmHint: wake.isAlarmHint,
          });
        };

        rec.onerror = (event) => {
          const code = event?.error || 'unknown';
          if (code === 'no-speech' || code === 'aborted') return;
          if (code === 'not-allowed' || code === 'service-not-allowed') {
            setErrorMessage('Microphone permission blocked. Allow mic access in your browser bar.');
            handsFreeRef.current = false;
            setHandsFreeEnabled(false);
            oneTapRef.current = false;
            setOneTapActive(false);
            stopEngine(true);
            callbacksRef.current.onStatusNotice?.(
              'alert',
              'Microphone Blocked',
              'Allow microphone access to use live voice.'
            );
          }
        };

        rec.onend = () => {
          recRef.current = null;
          if (mode === 'one-tap') {
            if (oneTapRef.current) {
              const spoken = latestTranscriptRef.current.trim();
              oneTapRef.current = false;
              setOneTapActive(false);
              setLiveTranscript('');
              if (spoken) {
                const parsed = parseDirectAssistantSpeech(spoken, activeSourceRef.current);
                if (parsed && parsed.commandText) {
                  commitCommand({
                    source: parsed.source,
                    commandText: parsed.commandText,
                    isAlarmHint: parsed.isAlarmHint,
                  });
                }
              }
            }
            if (handsFreeRef.current) {
              restartTimerRef.current = window.setTimeout(() => {
                if (handsFreeRef.current && !oneTapRef.current) {
                  startEngine('hands-free');
                }
              }, 500);
            }
            return;
          }

          if (handsFreeRef.current && !oneTapRef.current) {
            restartTimerRef.current = window.setTimeout(() => {
              if (handsFreeRef.current && !oneTapRef.current) {
                startEngine('hands-free');
              }
            }, 450);
          }
        };

        rec.start();
        return true;
      } catch {
        setErrorMessage('Could not start microphone. Please try tapping again.');
        return false;
      }
    },
    [commitCommand, stopEngine, vibrate]
  );

  const startOneTapSpeak = useCallback(
    (source: LiveAssistantSource = 'voice') => {
      activeSourceRef.current = source;
      setActiveSource(source);
      oneTapRef.current = true;
      setOneTapActive(true);
      awaitingFollowUpRef.current = false;
      setAwaitingFollowUp(false);
      triggerHaptic('light', vibrate);
      const started = startEngine('one-tap');
      if (started) {
        const label =
          source === 'siri'
            ? 'Siri Voice Active'
            : source === 'google-assistant'
              ? 'Google Assistant Active'
              : 'Live Voice Active';
        callbacksRef.current.onStatusNotice?.(
          'created',
          label,
          'Speak your reminder — auto-saves automatically'
        );
      }
    },
    [startEngine, vibrate]
  );

  const finishOneTapSpeakNow = useCallback(() => {
    const spoken = latestTranscriptRef.current.trim();
    oneTapRef.current = false;
    setOneTapActive(false);
    stopEngine(true);
    setLiveTranscript('');
    if (spoken) {
      const parsed = parseDirectAssistantSpeech(spoken, activeSourceRef.current);
      if (parsed && parsed.commandText) {
        commitCommand({
          source: parsed.source,
          commandText: parsed.commandText,
          isAlarmHint: parsed.isAlarmHint,
        });
      }
    }
    if (handsFreeRef.current) {
      restartTimerRef.current = window.setTimeout(() => {
        if (handsFreeRef.current && !oneTapRef.current) {
          startEngine('hands-free');
        }
      }, 500);
    }
  }, [commitCommand, startEngine, stopEngine]);

  const cancelOneTapSpeak = useCallback(() => {
    oneTapRef.current = false;
    setOneTapActive(false);
    stopEngine(true);
    setLiveTranscript('');
    if (handsFreeRef.current) {
      restartTimerRef.current = window.setTimeout(() => {
        if (handsFreeRef.current && !oneTapRef.current) {
          startEngine('hands-free');
        }
      }, 450);
    }
  }, [startEngine, stopEngine]);

  const setHandsFree = useCallback(
    (enabled: boolean, preferredSource?: LiveAssistantSource) => {
      if (enabled) {
        handsFreeRef.current = true;
        setHandsFreeEnabled(true);
        awaitingFollowUpRef.current = false;
        setAwaitingFollowUp(false);
        const started = startEngine('hands-free');
        if (started) {
          triggerHaptic('light', vibrate);
          const phraseHint =
            preferredSource === 'siri'
              ? 'Say “Hey Siri, add a reminder in reminderme…”'
              : preferredSource === 'google-assistant'
                ? 'Say “Hey Google, add a reminder in reminderme…”'
                : 'Say “Hey Siri / Hey Google / Hey reminderme…”';
          callbacksRef.current.onStatusNotice?.('success', 'Hands-Free Live', phraseHint);
        }
      } else {
        handsFreeRef.current = false;
        setHandsFreeEnabled(false);
        awaitingFollowUpRef.current = false;
        setAwaitingFollowUp(false);
        if (!oneTapRef.current) {
          stopEngine(true);
          setLiveTranscript('');
        }
      }
    },
    [startEngine, stopEngine, vibrate]
  );

  const toggleHandsFree = useCallback(() => {
    setHandsFree(!handsFreeRef.current);
  }, [setHandsFree]);

  const activateSiriLive = useCallback(() => {
    const next: LiveAssistantPrefs = { ...prefs, siriConnected: true };
    setPrefs(next);
    saveLiveAssistantPrefs(next);
    startOneTapSpeak('siri');
  }, [prefs, startOneTapSpeak]);

  const activateGoogleAssistantLive = useCallback(() => {
    const next: LiveAssistantPrefs = { ...prefs, googleAssistantConnected: true };
    setPrefs(next);
    saveLiveAssistantPrefs(next);
    startOneTapSpeak('google-assistant');
  }, [prefs, startOneTapSpeak]);

  useEffect(() => {
    return () => {
      handsFreeRef.current = false;
      oneTapRef.current = false;
      stopEngine(true);
    };
  }, [stopEngine]);

  return {
    isSupported,
    siriConnected: prefs.siriConnected,
    googleAssistantConnected: prefs.googleAssistantConnected,
    handsFreeEnabled,
    oneTapActive,
    activeSource,
    awaitingFollowUp,
    liveTranscript,
    errorMessage,
    startOneTapSpeak,
    finishOneTapSpeakNow,
    cancelOneTapSpeak,
    setHandsFree,
    toggleHandsFree,
    activateSiriLive,
    activateGoogleAssistantLive,
  };
}
