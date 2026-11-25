import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { triggerHaptic } from '../lib/nativeBridge';
import {
  buildReminderDraftFromVoice,
  combineTranscript,
  mapSpeechError,
  resolveReleasePhase,
  type VoicePhase,
} from '../lib/voiceState';

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

export function useVoiceCapture(vibrate: boolean, now: Date) {
  const [phase, setPhase] = useState<VoicePhase>('closed');
  const [finalText, setFinalText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isHolding, setIsHolding] = useState(false);

  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const holdStartRef = useRef<number>(0);
  const holdingRef = useRef<boolean>(false);
  const finalRef = useRef<string>('');
  const interimRef = useRef<string>('');
  const hadErrorRef = useRef<boolean>(false);
  const closedIntentionallyRef = useRef<boolean>(false);

  const isSupported = useMemo(() => getSpeechRecognitionCtor() !== null, []);

  const combinedTranscript = useMemo(
    () => combineTranscript(finalText, interimText),
    [finalText, interimText]
  );

  const parsedPreview = useMemo(
    () => buildReminderDraftFromVoice(combinedTranscript, now),
    [combinedTranscript, now]
  );

  const teardownRecognition = useCallback((abort = true) => {
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
      // ignore recognition state errors
    }
  }, []);

  useEffect(() => {
    return () => {
      closedIntentionallyRef.current = true;
      teardownRecognition(true);
    };
  }, [teardownRecognition]);

  const openReady = useCallback(() => {
    closedIntentionallyRef.current = false;
    setErrorMessage(isSupported ? null : mapSpeechError('unsupported'));
    setPhase(isSupported ? 'ready' : 'error');
  }, [isSupported]);

  const startHoldCapture = useCallback(() => {
    closedIntentionallyRef.current = false;
    holdingRef.current = true;
    setIsHolding(true);
    holdStartRef.current = Date.now();
    hadErrorRef.current = false;
    setErrorMessage(null);
    triggerHaptic('light', vibrate);

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      hadErrorRef.current = true;
      setErrorMessage(mapSpeechError('unsupported'));
      setPhase('error');
      return;
    }

    teardownRecognition(true);
    finalRef.current = '';
    interimRef.current = '';
    setFinalText('');
    setInterimText('');
    setPhase('listening');

    try {
      const rec = new Ctor();
      rec.lang = navigator.language || 'en-US';
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      recRef.current = rec;

      rec.onresult = (event) => {
        let nextFinal = '';
        let nextInterim = '';
        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          const text = item?.[0]?.transcript || '';
          if (item?.isFinal) nextFinal += `${text} `;
          else nextInterim += `${text} `;
        }
        finalRef.current = nextFinal.trim();
        interimRef.current = nextInterim.trim();
        setFinalText(finalRef.current);
        setInterimText(interimRef.current);
      };

      rec.onerror = (event) => {
        if (closedIntentionallyRef.current) return;
        const msg = mapSpeechError(event?.error || 'unknown');
        if (!msg) return;
        hadErrorRef.current = true;
        setErrorMessage(msg);
        if (!holdingRef.current) {
          const combined = combineTranscript(finalRef.current, interimRef.current);
          setPhase(resolveReleasePhase(Date.now() - holdStartRef.current, combined, true));
        }
      };

      rec.onend = () => {
        recRef.current = null;
        if (closedIntentionallyRef.current) return;
        const combined = combineTranscript(finalRef.current, interimRef.current);
        if (combined) {
          finalRef.current = combined;
          interimRef.current = '';
          setFinalText(combined);
          setInterimText('');
        }
        holdingRef.current = false;
        setIsHolding(false);
        const duration = Date.now() - holdStartRef.current;
        setPhase(resolveReleasePhase(duration, combined, hadErrorRef.current));
      };

      rec.start();
    } catch {
      hadErrorRef.current = true;
      holdingRef.current = false;
      setIsHolding(false);
      setErrorMessage(mapSpeechError('audio-capture'));
      setPhase('error');
    }
  }, [teardownRecognition, vibrate]);

  const endHoldCapture = useCallback(() => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    setIsHolding(false);
    const duration = Date.now() - holdStartRef.current;
    triggerHaptic('medium', vibrate);

    const rec = recRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        teardownRecognition(true);
      }
      // Safety fallback in case browser doesn't emit onend quickly after stop()
      window.setTimeout(() => {
        if (recRef.current === rec && !closedIntentionallyRef.current) {
          teardownRecognition(true);
          const combined = combineTranscript(finalRef.current, interimRef.current);
          setPhase(resolveReleasePhase(duration, combined, hadErrorRef.current));
        }
      }, 450);
    } else {
      const combined = combineTranscript(finalRef.current, interimRef.current);
      setPhase(resolveReleasePhase(duration, combined, hadErrorRef.current));
    }
  }, [teardownRecognition, vibrate]);

  const updateTranscript = useCallback((nextText: string) => {
    finalRef.current = nextText;
    interimRef.current = '';
    setFinalText(nextText);
    setInterimText('');
    setErrorMessage(null);
    setPhase((prev) => {
      if (prev === 'closed') return prev;
      return nextText.trim() ? 'review' : 'ready';
    });
  }, []);

  const close = useCallback(() => {
    closedIntentionallyRef.current = true;
    holdingRef.current = false;
    setIsHolding(false);
    teardownRecognition(true);
    finalRef.current = '';
    interimRef.current = '';
    setFinalText('');
    setInterimText('');
    setErrorMessage(null);
    setPhase('closed');
  }, [teardownRecognition]);

  return {
    phase,
    isOpen: phase !== 'closed',
    isHolding,
    isSupported,
    transcript: combinedTranscript,
    interimText,
    parsedPreview,
    errorMessage,
    openReady,
    startHoldCapture,
    endHoldCapture,
    updateTranscript,
    close,
  };
}
