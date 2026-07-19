'use client';

/**
 * useVoiceInput — §4C Web Speech API hook
 *
 * Encapsulates all voice-input state and logic so ChatPage stays focused on
 * rendering and submission. Key correctness guarantee:
 *
 * STALE CLOSURE FIX — latestTranscriptRef
 * ─────────────────────────────────────────
 * `recognition.onend` is registered once when the recognition session starts.
 * If we read `voiceTranscript` state directly inside onend, we get the value
 * that was captured at registration time — potentially stale if onresult fired
 * multiple interim results after. The fix: `latestTranscriptRef` is a ref
 * (not state) that is updated on every onresult call alongside setVoiceTranscript.
 * Refs are never stale inside closures because they are a mutable container;
 * onend reads `latestTranscriptRef.current` to get the guaranteed-final value.
 *
 * DECOUPLING — onFinalTranscript callback
 * ────────────────────────────────────────
 * The hook does not import or call handleSubmitText directly. Instead it calls
 * the `onFinalTranscript(transcript, caption)` callback provided by the caller.
 * This breaks the coupling that previously forced handleVoiceToggle to close
 * over handleSubmitText (which itself closed over all submit state), making
 * the dependency chain impossible to reason about.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Session } from '@matchflow/types';
import { logEvent } from '@/lib/analytics';

// ---------------------------------------------------------------------------
// Web Speech API — self-contained type shim
// These types are available in Chrome/Edge but not always in TS lib.dom.
// Declaring locally ensures strict builds pass without lib=dom requirement.
// ---------------------------------------------------------------------------
interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResultList extends Array<SpeechRecognitionResultItem> {
  isFinal: boolean;
}
export interface MatchflowSpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList[];
}
export interface MatchflowSpeechRecognitionErrorEvent extends Event {
  error: string;
}
export interface MatchflowSpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: MatchflowSpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: MatchflowSpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
}
declare global {
  interface Window {
    SpeechRecognition: new () => MatchflowSpeechRecognition;
    webkitSpeechRecognition: new () => MatchflowSpeechRecognition;
  }
}

// ---------------------------------------------------------------------------
// Hook public interface
// ---------------------------------------------------------------------------
export interface UseVoiceInputResult {
  isListening: boolean;
  /** Interim transcript — shown live in the input field as the user speaks */
  voiceTranscript: string;
  /** True when window.SpeechRecognition or webkitSpeechRecognition is available */
  voiceSupported: boolean;
  /** Toggle mic on/off. Starts recognition or stops it and submits via onFinalTranscript. */
  handleVoiceToggle: () => void;
}

/**
 * @param session       — current fan session (used for language and analytics)
 * @param onFinalTranscript — called with (transcript, caption) when recognition ends
 *                          and a non-empty transcript was captured.
 *                          `transcript` is the text to submit; `caption` is the
 *                          visible voice-indicator label shown below the user bubble.
 */
export function useVoiceInput(
  session: Session,
  onFinalTranscript: (transcript: string, caption: string) => void,
): UseVoiceInputResult {
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceSupported, setVoiceSupported] = useState(false);

  const recognitionRef = useRef<MatchflowSpeechRecognition | null>(null);
  // Stale-closure fix: always holds the latest transcript regardless of when
  // onend's closure was created.
  const latestTranscriptRef = useRef('');

  // Detect Web Speech API availability once on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      setVoiceSupported(!!SR);
    }
  }, []);

  const handleVoiceToggle = useCallback(() => {
    if (!voiceSupported) return;

    if (isListening) {
      // Stop an in-progress session
      recognitionRef.current?.stop();
      setIsListening(false);
      logEvent({
        type: 'voice_session_end',
        sessionId: session.sessionId,
        durationMs: 0,
        transcriptLength: latestTranscriptRef.current.length,
      });
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();

    recognition.lang =
      session.language === 'es'
        ? 'es-ES'
        : session.language === 'fr'
          ? 'fr-FR'
          : session.language === 'pt'
            ? 'pt-PT'
            : session.language === 'ar'
              ? 'ar-SA'
              : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    const startTime = Date.now();
    logEvent({
      type: 'voice_session_start',
      sessionId: session.sessionId,
      language: session.language,
    });

    recognition.onresult = (event: MatchflowSpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((r) => (r as SpeechRecognitionResultList)[0].transcript)
        .join('');
      // Update both the state (for the live input preview) AND the ref
      // (for the stale-closure-safe read inside onend).
      setVoiceTranscript(transcript);
      latestTranscriptRef.current = transcript;
    };

    recognition.onend = () => {
      setIsListening(false);

      const durationMs = Date.now() - startTime;
      // Read from the ref — guaranteed to be the most recent value regardless
      // of when this closure was created (fixes the stale closure bug).
      const finalTranscript = latestTranscriptRef.current.trim();

      logEvent({
        type: 'voice_session_end',
        sessionId: session.sessionId,
        durationMs,
        transcriptLength: finalTranscript.length,
      });

      // Reset interim display state
      setVoiceTranscript('');
      latestTranscriptRef.current = '';

      if (finalTranscript) {
        // Decouple from handleSubmitText — caller decides what to do with the text
        onFinalTranscript(finalTranscript, finalTranscript);
      }
    };

    recognition.onerror = (event: MatchflowSpeechRecognitionErrorEvent) => {
      console.error('[Voice] SpeechRecognition error:', event.error);
      setIsListening(false);
      latestTranscriptRef.current = '';
    };

    recognitionRef.current = recognition;
    // Reset before starting so interim state doesn't bleed from a prior session
    latestTranscriptRef.current = '';
    setVoiceTranscript('');
    recognition.start();
    setIsListening(true);
  }, [voiceSupported, isListening, session, onFinalTranscript]);

  return { isListening, voiceTranscript, voiceSupported, handleVoiceToggle };
}
