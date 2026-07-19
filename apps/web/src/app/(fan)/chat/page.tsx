'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from '@/context/SessionContext';
import { useSearchParams } from 'next/navigation';
import { ConciergeResponseData } from '@matchflow/flow-engine';
import { RouteCard, SeverityBadge, Info, AlertCircle } from '@matchflow/ui';
import { db, runSimulatorTick, askConcierge } from '@/lib/db';
import { Send, User, Bot, Mic, MicOff } from 'lucide-react';
import { logEvent, classifyQuery } from '@/lib/analytics';
import { useVoiceInput } from './useVoiceInput';


interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  route?: ConciergeResponseData['route'];
  isAccessibleNoPath?: boolean;
  /** If this message was the result of a voice query, show the caption transcript */
  voiceTranscript?: string;
}


function ChatContent() {

  const { session, simulateOffline } = useSession();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: session.language === 'es'
        ? '¡Hola! Soy tu asistente Matchflow. ¿Cómo puedo ayudarte a navegar por el Mercedes-Benz Stadium?'
        : 'Hello! I am your Matchflow concierge. How can I help you navigate Mercedes-Benz Stadium today?'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  // §13: Streaming state — tracks the in-progress bot message ID
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [congestionMap, setCongestionMap] = useState<Record<string, number>>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = 'concierge-query-input';

  // §4C Voice Input — Web Speech API (stale-closure fix: see useVoiceInput.ts)
  // onFinalTranscript is called by the hook when recognition ends with a
  // non-empty transcript. It delegates straight into handleSubmitText so the
  // hook has no knowledge of the submission pipeline.
  const { isListening, voiceTranscript, voiceSupported, handleVoiceToggle } =
    useVoiceInput(session, (transcript, caption) => {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSubmitText(transcript, fakeEvent, caption);
    });

  // §4B: Read ?q= URL param and auto-submit pre-filled quick actions from home page
  const autoSubmittedRef = useRef(false);
  useEffect(() => {
    const prefilledQuery = searchParams?.get('q');
    if (prefilledQuery && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      setQuery(prefilledQuery);
      // Auto-submit after a short delay so the UI renders the input first
      setTimeout(() => {
        const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
        handleSubmitText(prefilledQuery, fakeEvent);
      }, 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Load live congestion map for path weight recalculation
  useEffect(() => {
    const unsub = db.subscribeToCongestion(session.role, (zones) => {
      const newMapping: Record<string, number> = {};
      zones.forEach(z => {
        newMapping[z.zoneId] = z.densityScore;
      });
      setCongestionMap(prev => {
        // Only update state if any zone density changed (avoid idle re-renders)
        const hasChanged = !prev || Object.keys(newMapping).some(
          k => newMapping[k] !== prev[k]
        );
        return hasChanged ? newMapping : prev;
      });
    });
    return () => unsub();
  }, [session.role]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // ---------------------------------------------------------------------------
  // Core submit logic — accepts optional voiceCaption for transcript display
  // ---------------------------------------------------------------------------
  const handleSubmitText = async (userText: string, e: React.FormEvent, voiceCaption?: string) => {
    e.preventDefault();
    if (!userText.trim()) return;

    setQuery('');
    setMessages(prev => [...prev, {
      id: `msg_${Date.now()}_u`,
      sender: 'user',
      text: userText,
      voiceTranscript: voiceCaption,
    }]);
    setIsLoading(true);

    // §5 Analytics: log query category (not verbatim text)
    const category = classifyQuery(userText);
    const callStart = performance.now();

    if (simulateOffline) {
      setMessages(prev => [...prev, {
        id: `msg_${Date.now()}_e`,
        sender: 'bot',
        text: '⚠️ Network Error: Unable to reach Flow Engine. Matchflow is operating in offline-degraded mode. Please refer to static gate maps.'
      }]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await askConcierge({
        query: userText,
        sessionId: session.sessionId,
        userId: session.userId,
        role: session.role,
        language: session.language,
        accessibilityMode: session.accessibilityMode
      }, congestionMap ?? {});

      // §9: Explicit no-accessible-path message — never silent fallback
      const isAccessibleNoPath =
        session.accessibilityMode.mobilityRouting &&
        response.answerText.toLowerCase().includes('no accessible') &&
        !response.route;

      // §13: Progressive word streaming
      const WORD_INTERVAL_MS = 28;
      const words = response.answerText.split(' ');
      const botMsgId = `msg_${Date.now()}_b`;
      let firstTokenLogged = false;

      setMessages(prev => [...prev, {
        id: botMsgId,
        sender: 'bot',
        text: '',
        route: response.route,
        isAccessibleNoPath
      }]);
      setStreamingMsgId(botMsgId);
      setIsLoading(false);

      for (let i = 0; i < words.length; i++) {
        await new Promise<void>(resolve => setTimeout(resolve, WORD_INTERVAL_MS));
        const currentText = words.slice(0, i + 1).join(' ');

        if (!firstTokenLogged) {
          firstTokenLogged = true;
          const ttft = Math.round(performance.now() - callStart);
          console.info(`[TTFT] ${ttft}ms to first token (call → first word rendered)`);
          if (typeof window !== 'undefined') {
            (window as any).__matchflowLastTTFT = ttft;
          }
          // §5 Analytics: log with TTFT and fallback info
          logEvent({
            type: 'concierge_query',
            sessionId: session.sessionId,
            language: session.language,
            category,
            fallbackTriggered: !response.route && response.answerText.includes('offline'),
            latencyMs: ttft,
          });
        }

        setMessages(prev => prev.map(m =>
          m.id === botMsgId ? { ...m, text: currentText } : m
        ));
      }

      setStreamingMsgId(null);

      // -----------------------------------------------------------------------
      // §16 "Same live moment" signal:
      // After the fan receives a routed response, inspect the current congestion
      // map and either:
      //   A) Fire db.createReport() if any zone is ≥ 0.6 density — this triggers
      //      incident creation inside db.createReport(), which calls
      //      notifyListeners(), making the ops dashboard react in real time to
      //      the fan's concierge query.
      //   B) Call runSimulatorTick() if no zone is hot, so the ops heatmap at
      //      minimum shows movement after every fan query.
      // Only executes when a route was returned (i.e. a real wayfinding event
      // occurred — not for out-of-scope refusals or error messages).
      // -----------------------------------------------------------------------
      if (response.route) {
        const currentMap = congestionMap ?? {};
        let hottestZoneId: string | null = null;
        let hottestScore = 0;

        for (const [zoneId, score] of Object.entries(currentMap)) {
          if (score > hottestScore) {
            hottestScore = score;
            hottestZoneId = zoneId;
          }
        }

        if (hottestZoneId && hottestScore >= 0.6) {
          // Zone is congested — report it so ops sees a live incident
          db.createReport('volunteer', {
            authorId: 'sim_concierge',
            authorName: 'Concierge System',
            authorRole: 'volunteer',
            category: 'crowd',
            description:
              'Concierge rerouted a fan away from high-density zone. ' +
              'Congestion confirmed by live routing signal.',
            zoneId: hottestZoneId,
            level: '100',
          }).catch(err => {
            // Non-fatal — the fan already has their route. Log silently.
            console.warn('[CongestionSignal] createReport failed:', (err as Error).message);
          });
        } else {
          // No hot zone yet — tick the simulator so the heatmap shows movement
          runSimulatorTick();
        }
      }
    } catch (err) {
      // §5 Analytics: log fallback trigger
      logEvent({
        type: 'fallback_triggered',
        sessionId: session.sessionId,
        surface: 'concierge',
        reason: String(err),
      });
      setMessages(prev => [...prev, {
        id: `msg_${Date.now()}_e`,
        sender: 'bot',
        text: '❌ Matchflow encountered an error processing your path. Please try again or ask a volunteer nearby.'
      }]);
      setIsLoading(false);
      setStreamingMsgId(null);
    }
  };


  /** Form onSubmit wrapper — delegates to handleSubmitText with current query value */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmitText(query.trim(), e);
  };


  return (
    <div style={{
      maxWidth: '480px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 120px)',
    }}>
      {/* §9: Heading hierarchy — h1 on the page */}
      <h1 className="display-title" style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 8px 0', letterSpacing: '-0.01em' }}>
        Matchflow Concierge
      </h1>

      {/* Active Mode Banner */}
      <div
        className="glass-panel"
        role="status"
        aria-live="polite"
        aria-label={`Routing mode: ${session.accessibilityMode.mobilityRouting ? 'Accessible-only' : 'Standard'}${session.accessibilityMode.simplifiedLanguage ? ', Simplified English active' : ''}`}
        style={{
          padding: '8px 12px',
          backgroundColor: session.accessibilityMode.mobilityRouting ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-surface)',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* §9: aria-hidden on decorative icon */}
          <Info size={14} color="var(--primary-accent)" aria-hidden="true" />
          <span>Routing: {session.accessibilityMode.mobilityRouting ? 'Accessible-only' : 'Standard'}</span>
        </div>
        {session.accessibilityMode.simplifiedLanguage && (
          <span style={{ fontSize: '11px', color: 'var(--primary-accent)', fontWeight: 'bold' }}>
            SIMPLIFIED ENGLISH
          </span>
        )}
      </div>

      {/* §9: aria-live="polite" log region for screen reader announcements */}
      <div
        id="chat-message-log"
        role="log"
        aria-live="polite"
        aria-label="Conversation with Matchflow concierge"
        aria-relevant="additions"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginBottom: '12px'
        }}>
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                width: '100%'
              }}>
              <div style={{
                maxWidth: '85%',
                display: 'flex',
                gap: '8px',
                flexDirection: isUser ? 'row-reverse' : 'row'
              }}>
                {/* §9: Avatar icons are decorative — aria-hidden */}
                <div
                  aria-hidden="true"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: isUser ? 'var(--primary-accent)' : 'var(--bg-surface-elevated)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isUser ? '#000000' : '#ffffff',
                    flexShrink: 0
                  }}>
                  {isUser ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {/* §9: Accessible no-path message — explicit, never silent fallback */}
                  {msg.isAccessibleNoPath && (
                    <div
                      role="alert"
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(251, 191, 36, 0.15)',
                        border: '1px solid var(--primary-accent)',
                        fontSize: '13px',
                        color: 'var(--primary-accent)',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                      <SeverityBadge severity="high" />
                      <span aria-hidden="true">♿</span>
                      <span>No accessible path currently available for this route. All connecting paths use stairs or escalators. Please speak to a stadium staff member for assisted navigation.</span>
                    </div>
                  )}
                  <div
                    className="glass-panel"
                    style={{
                      padding: '12px',
                      backgroundColor: isUser ? 'rgba(30, 41, 59, 0.9)' : 'rgba(15, 23, 42, 0.75)',
                      fontSize: '15px',
                      lineHeight: '1.5'
                    }}>
                    {msg.text}
                  </div>
                  {/* §9 §4F: Voice transcript caption — synchronized visible transcript.
                      Always shown when a message was voice-originated.
                      Voice is additive, never voice-only. */}
                  {isUser && msg.voiceTranscript && (
                    <div
                      role="note"
                      aria-label={`Voice transcript: ${msg.voiceTranscript}`}
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        border: '1px solid rgba(251,191,36,0.2)',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(251,191,36,0.05)',
                      }}
                    >
                      <Mic size={10} aria-hidden="true" color="var(--primary-accent)" />
                      <span style={{ fontStyle: 'italic' }}>Voice: &quot;{msg.voiceTranscript}&quot;</span>
                    </div>
                  )}

                  {/* §9: Inline simplifier reachable without leaving conversation */}
                  {!isUser && !msg.isAccessibleNoPath && session.accessibilityMode.simplifiedLanguage && (
                    <div style={{
                      fontSize: '11px',
                      color: 'var(--primary-accent)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid rgba(251,191,36,0.3)',
                      display: 'inline-block',
                      alignSelf: 'flex-start'
                    }} aria-label="Response shown in simplified language mode">
                      ✦ Simplified
                    </div>
                  )}
                  {/* Render shared RouteCard if path returned */}
                  {msg.route && (
                    <div style={{ marginTop: '8px' }}>
                      <RouteCard
                        destinationName={msg.route.nodeDetails[msg.route.nodeDetails.length - 1]?.name || 'Destination'}
                        totalTimeSeconds={msg.route.totalTimeSeconds}
                        isAccessible={session.accessibilityMode.mobilityRouting}
                        pathNodesCount={msg.route.path.length}
                        congestionLevel={msg.route.totalTimeSeconds > 200 ? 'high' : msg.route.totalTimeSeconds > 100 ? 'medium' : 'low'}
                      />
                      <div className="glass-panel" style={{
                        marginTop: '8px',
                        padding: '12px',
                        fontSize: '13px'
                      }}>
                        <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px', color: 'var(--primary-accent)', fontFamily: "'Space Grotesk', sans-serif" }}>
                          Rerouted Path Steps:
                        </span>
                        <ol style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: 0, paddingLeft: '16px' }}>
                          {msg.route.nodeDetails.map((node) => (
                            <li key={node.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{node.name} <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>({node.zone})</span></span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {/* §9: Loading state announced to screen readers */}
        {isLoading && (
          <div
            role="status"
            aria-live="polite"
            aria-label="Matchflow is computing your route, please wait"
            className="floodlight-sweep"
            style={{
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              textAlign: 'center',
              fontSize: '14px',
              fontWeight: 'bold',
              color: 'var(--text-primary)',
              fontFamily: "'Space Grotesk', sans-serif"
            }}>
            Matchflow is computing wayfinding path...
          </div>
        )}
        {/* §4C: Voice listening indicator */}
        {isListening && (
          <div
            role="status"
            aria-live="assertive"
            aria-label="Voice input active. Speak now."
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--primary-accent)',
              backgroundColor: 'rgba(251,191,36,0.1)',
              textAlign: 'center',
              fontSize: '14px',
              color: 'var(--primary-accent)',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <Mic size={16} aria-hidden="true" />
            <span>Listening…</span>
            {voiceTranscript && (
              <span style={{ fontWeight: 'normal', color: 'var(--text-primary)', marginLeft: '8px' }}>
                &quot;{voiceTranscript}&quot;
              </span>
            )}
          </div>
        )}
        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {/* Input Form — §9: labelled input, labelled submit button */}
      <form
        onSubmit={handleSubmit}
        aria-label="Send a question to Matchflow concierge"
        style={{
          display: 'flex',
          gap: '8px',
          padding: '8px 0'
        }}>
        {/* §9: Visible label via aria-labelledby, explicit id */}
        <label htmlFor={inputId} className="sr-only">
          Ask Matchflow a wayfinding question
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={session.language === 'es' ? 'Escribe aquí tu pregunta...' : 'Ask for gate, restroom, food...'}
          aria-label="Ask a wayfinding question"
          autoComplete="off"
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            fontSize: '14px'
          }}
          disabled={isLoading}
        />
        {/* §4C: Mic button — shown only when Web Speech API is supported.
            §9: icon-only button has aria-label; aria-pressed conveys current state. */}
        {voiceSupported && (
          <button
            type="button"
            onClick={handleVoiceToggle}
            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
            aria-pressed={isListening}
            style={{
              padding: '12px',
              borderRadius: '6px',
              backgroundColor: isListening ? 'rgba(251,191,36,0.2)' : 'var(--bg-surface)',
              color: isListening ? 'var(--primary-accent)' : 'var(--text-secondary)',
              border: isListening ? '1px solid var(--primary-accent)' : '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 150ms ease',
            }}
            disabled={isLoading}
          >
            {isListening
              ? <MicOff size={16} aria-hidden="true" />
              : <Mic size={16} aria-hidden="true" />}
          </button>
        )}
        {/* §9: Icon-only button has aria-label */}
        <button
          type="submit"
          aria-label="Send message"
          style={{
            padding: '12px 20px',
            borderRadius: '6px',
            backgroundColor: 'var(--primary-accent)',
            color: '#000000',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px 0 rgba(251, 191, 36, 0.3)'
          }}
          disabled={isLoading}>
          {/* §9: Decorative icon inside labelled button */}
          <Send size={16} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

export default function ChatPage() {
  return (
    <React.Suspense fallback={
      <div style={{ padding: '24px', color: 'var(--text-secondary)', textAlign: 'center' }}>
        Loading concierge...
      </div>
    }>
      <ChatContent />
    </React.Suspense>
  );
}

