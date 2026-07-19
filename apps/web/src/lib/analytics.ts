/**
 * analytics.ts — §5 PRD Analytics/Telemetry Pipeline
 *
 * Logs query *categories*, not raw transcripts. No verbatim fan text is ever
 * persisted. All events are session-scoped and anonymised by design.
 *
 * Event schema mirrors the PRD requirement:
 *   - query type distribution
 *   - language distribution
 *   - fallback-trigger rate
 *   - incident-to-dispatch latency
 */

export type QueryCategory =
  | 'navigation'
  | 'accessibility_route'
  | 'food_concessions'
  | 'restroom'
  | 'gate_lookup'
  | 'exit_planning'
  | 'incident_status'
  | 'general_info'
  | 'out_of_scope';

export type AnalyticsEvent =
  | {
      type: 'concierge_query';
      sessionId: string;
      language: string;
      category: QueryCategory;
      fallbackTriggered: boolean;
      latencyMs: number;
    }
  | { type: 'language_set'; sessionId: string; language: string }
  | { type: 'accessibility_mode_set'; sessionId: string; mode: string }
  | { type: 'incident_reported'; sessionId: string; category: string; latencyMs: number }
  | { type: 'dispatch_approved'; sessionId: string; incidentId: string; latencyMs: number }
  | {
      type: 'fallback_triggered';
      sessionId: string;
      surface: 'concierge' | 'simplifier' | 'dispatch' | 'summarizer';
      reason: string;
    }
  | { type: 'voice_session_start'; sessionId: string; language: string }
  | { type: 'voice_session_end'; sessionId: string; durationMs: number; transcriptLength: number };

// In-memory buffer — flushed to console (structured) and optionally Firestore.
// Keeping it in-memory avoids any risk of verbatim fan text reaching a DB.
const _eventBuffer: Array<AnalyticsEvent & { ts: number }> = [];

/**
 * Classifies a concierge query into one of the allowed categories
 * by matching against keyword patterns. Never logs the raw text.
 */
export function classifyQuery(queryText: string): QueryCategory {
  const t = queryText.toLowerCase();
  if (/accessible|elevator|ramp|wheelchair|mobility/.test(t)) return 'accessibility_route';
  if (/gate|entrance|section/.test(t)) return 'gate_lookup';
  if (/food|eat|burger|drink|concession|beer|snack/.test(t)) return 'food_concessions';
  if (/restroom|toilet|bathroom|wc/.test(t)) return 'restroom';
  if (/exit|egress|leave|transit|marta|train|rideshare/.test(t)) return 'exit_planning';
  if (/incident|congestion|crowd|busy|bottleneck/.test(t)) return 'incident_status';
  if (/direction|navigate|go to|get to|where is|find/.test(t)) return 'navigation';
  if (/time|schedule|kickoff|match|score/.test(t)) return 'general_info';
  return 'general_info';
}

/** Log any analytics event. Structured output; no raw fan text. */
export function logEvent(event: AnalyticsEvent): void {
  const enriched = { ...event, ts: Date.now() };
  _eventBuffer.push(enriched);
}

/** Returns a snapshot of buffered events — used by golden-set tests to check pass rate. */
export function getEventSnapshot(): ReadonlyArray<AnalyticsEvent & { ts: number }> {
  return [..._eventBuffer];
}

/** Tallies event counts by type — used for the submission pass-rate report. */
export function getEventSummary(): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const ev of _eventBuffer) {
    summary[ev.type] = (summary[ev.type] ?? 0) + 1;
  }
  return summary;
}

/** Calculates fallback rate across all concierge queries. */
export function getFallbackRate(): { total: number; fallbacks: number; rate: number } {
  const queries = _eventBuffer.filter((e) => e.type === 'concierge_query') as Array<
    Extract<AnalyticsEvent, { type: 'concierge_query' }> & { ts: number }
  >;
  const fallbacks = queries.filter((q) => q.fallbackTriggered).length;
  return {
    total: queries.length,
    fallbacks,
    rate: queries.length > 0 ? fallbacks / queries.length : 0,
  };
}
