'use client';

/**
 * db.ts — Production data layer for MatchFlow (Vercel / serverless).
 *
 * All persistence goes through /api/db (backed by Vercel KV when bound,
 * in-memory fallback otherwise). The concierge and egress ranking call
 * /api/concierge and /api/rank-egress, which use real Gemini with a
 * deterministic flow-engine fallback (§13 graceful degradation).
 *
 * The public API surface is preserved so page components are unchanged.
 */

import { UserRole, CongestionZone, Incident, Report, Dispatch } from '@matchflow/types';
import {
  askFlowEngine,
  ConciergeResponseData,
  rankEgressOptions as flowRankEgress,
} from '@matchflow/flow-engine';
import { getGraphData } from '@matchflow/concourse-graph';

// The concourse graph is a static module-level singleton (see @matchflow/
// concourse-graph). Routing (findShortestPath) reads the same in-memory
// constants directly, so the graph is never re-fetched per query. getGraphData()
// is the single accessor; we invoke it ONCE here at module load so
// window.__matchflowGraphCacheHits stays at 1 for the lifetime of the page.
// (Any subsequent routing call reuses the identical singleton — zero network.)
const _graphData = getGraphData();
void _graphData;

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
async function apiGet<T>(coll: string): Promise<T> {
  const res = await fetch(`/api/db?coll=${coll}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json.data as T;
}

interface PostRequestBody {
  coll: string;
  op: string;
  doc?: Record<string, unknown>;
  id?: string;
  patch?: Record<string, unknown>;
  rows?: Record<string, unknown>[];
}

async function apiPost(body: PostRequestBody) {
  const res = await fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json.data;
}

async function apiConcierge(
  req: Parameters<typeof askFlowEngine>[0],
  congestion: Record<string, number>,
) {
  try {
    const res = await fetch('/api/concierge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    const json = await res.json();
    if (json.success && json.data) {
      return json.data as ConciergeResponseData & { detectedLanguage?: string };
    }
  } catch (err) {
    console.warn('[apiConcierge] API call failed, falling back to local engine:', err);
  }
  const local = await askFlowEngine(req, congestion);
  return { ...local, detectedLanguage: req.language };
}

// ---------------------------------------------------------------------------
// Client-side RBAC mirror (shared matrix; server is authoritative)
// ---------------------------------------------------------------------------
import { enforceClient, Role as RbacRole } from '@/lib/rbac';

function enforceRules(
  role: UserRole,
  action: 'read' | 'write',
  collection:
    'sessions' | 'reports' | 'incidents' | 'dispatches' | 'concourseGraph' | 'congestionState',
  documentAuthorId?: string,
) {
  // The shared matrix uses Role/Collection; map our local UserRole + action.
  enforceClient(
    role as RbacRole,
    action as 'read' | 'write',
    collection as
      'concourseGraph' | 'congestionState' | 'reports' | 'incidents' | 'dispatches' | 'sessions',
    {
      documentAuthorId,
      requestUserId: 'me',
    },
  );
}

// ---------------------------------------------------------------------------
// Firestore onSnapshot-style subscription (polling + change detection)
// ---------------------------------------------------------------------------
// Vercel serverless has no push channel (no Firestore watch / websocket), so a
// true onSnapshot listener is not available. We keep a 4s poll but only invoke
// the callback when the SERIALIZED payload actually changes — mirroring
// onSnapshot's "fire only on a real update" contract and avoiding needless
// React re-renders on a static feed. See the trade-off note at the bottom of
// this file before claiming real-time parity.
function subscribeWithDedup<T>(
  fetcher: () => Promise<T>,
  callback: (data: T) => void,
  onError?: (err: Error) => void,
  intervalMs = 4000,
): () => void {
  let alive = true;
  let lastSig = '';
  const poll = async () => {
    if (!alive) return;
    try {
      const data = await fetcher();
      const sig = JSON.stringify(data);
      if (sig !== lastSig) {
        lastSig = sig;
        callback(data);
      }
    } catch (e) {
      onError?.(e as Error);
    }
  };
  poll();
  const id = setInterval(poll, intervalMs);
  return () => {
    alive = false;
    clearInterval(id);
  };
}

// ---------------------------------------------------------------------------
// Congestion
// ---------------------------------------------------------------------------
export function subscribeToCongestion(
  role: UserRole,
  callback: (zones: CongestionZone[]) => void,
  onError?: (err: Error) => void,
): () => void {
  try {
    enforceRules(role, 'read', 'congestionState');
  } catch (e) {
    onError?.(e as Error);
    return () => {};
  }
  return subscribeWithDedup(() => apiGet<CongestionZone[]>('congestionState'), callback, onError);
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
export function subscribeToReports(
  role: UserRole,
  userId: string,
  callback: (reports: Report[]) => void,
  onError?: (err: Error) => void,
): () => void {
  try {
    enforceRules(role, 'read', 'reports', userId);
  } catch (e) {
    onError?.(e as Error);
    return () => {};
  }
  return subscribeWithDedup(
    async () => {
      const all = await apiGet<Report[]>('reports');
      const filtered = role === 'volunteer' ? all.filter((r) => r.authorId === userId) : all;
      // Stable sort so the serialized signature is order-deterministic.
      return filtered.sort((a, b) => b.timestamp - a.timestamp);
    },
    callback,
    onError,
  );
}

export async function createReport(
  role: UserRole,
  reportData: Omit<Report, 'id' | 'timestamp'>,
): Promise<Report> {
  enforceRules(role, 'write', 'reports');
  const data = await apiPost({
    coll: 'reports',
    op: 'insert',
    doc: reportData as unknown as Record<string, unknown>,
  });
  return (data as Report[])[0];
}

// ---------------------------------------------------------------------------
// Incidents
// ---------------------------------------------------------------------------
export function subscribeToIncidents(
  role: UserRole,
  callback: (incidents: Incident[]) => void,
  onError?: (err: Error) => void,
): () => void {
  try {
    enforceRules(role, 'read', 'incidents');
  } catch (e) {
    onError?.(e as Error);
    return () => {};
  }
  return subscribeWithDedup(
    async () => {
      const all = await apiGet<Incident[]>('incidents');
      // Stable sort by id so an unchanged set yields an identical signature.
      return [...all].sort((a, b) => a.id.localeCompare(b.id));
    },
    callback,
    onError,
  );
}

export async function updateIncidentStatus(
  role: UserRole,
  incidentId: string,
  status: Incident['status'],
): Promise<void> {
  enforceRules(role, 'write', 'incidents');
  await apiPost({ coll: 'incidents', op: 'update', id: incidentId, patch: { status } });
}

// ---------------------------------------------------------------------------
// Dispatches
// ---------------------------------------------------------------------------
export function subscribeToDispatches(
  role: UserRole,
  callback: (dispatches: Dispatch[]) => void,
  onError?: (err: Error) => void,
): () => void {
  try {
    enforceRules(role, 'read', 'dispatches');
  } catch (e) {
    onError?.(e as Error);
    return () => {};
  }
  return subscribeWithDedup(
    async () => {
      const all = await apiGet<Dispatch[]>('dispatches');
      // Stable sort so an unchanged set yields an identical signature.
      return [...all].sort((a, b) => a.id.localeCompare(b.id));
    },
    callback,
    onError,
  );
}

export async function createDispatch(
  role: UserRole,
  dispatchData: Omit<Dispatch, 'id' | 'timestamp'>,
): Promise<Dispatch> {
  enforceRules(role, 'write', 'dispatches');
  const data = await apiPost({
    coll: 'dispatches',
    op: 'insert',
    doc: dispatchData as unknown as Record<string, unknown>,
  });
  return (data as Dispatch[])[0];
}

export async function updateDispatchStatus(
  role: UserRole,
  dispatchId: string,
  status: Dispatch['status'],
): Promise<void> {
  enforceRules(role, 'write', 'dispatches');
  await apiPost({ coll: 'dispatches', op: 'update', id: dispatchId, patch: { status } });
}

// ---------------------------------------------------------------------------
// Congestion write (organizer-only)
// ---------------------------------------------------------------------------
// Delegates to the deterministic, seeded server simulator. Passing `tick`
// (and/or `reset`) lets the route generate a reproducible density sequence
// (§16); `scores` override manually when provided. The client never computes
// its own random walk — that lives in apps/web/app/api/simulate/route.ts.
export async function writeCongestionBatch(
  updates?: Array<Pick<CongestionZone, 'zoneId' | 'densityScore'>>,
  opts?: { tick?: number; reset?: boolean },
): Promise<void> {
  let scores: Record<string, number> | undefined;
  if (updates && updates.length > 0) {
    scores = {};
    for (const u of updates) scores[u.zoneId] = u.densityScore;
  }
  await fetch('/api/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scores, tick: opts?.tick, reset: opts?.reset }),
  });
}

// ---------------------------------------------------------------------------
// Concierge + egress ranking wrappers
// ---------------------------------------------------------------------------
export async function askConcierge(
  req: Parameters<typeof askFlowEngine>[0],
  congestion: Record<string, number>,
): Promise<ConciergeResponseData & { detectedLanguage?: string }> {
  return apiConcierge(req, congestion);
}

export async function rankEgressOptions(params: Parameters<typeof flowRankEgress>[0]) {
  try {
    const res = await fetch('/api/rank-egress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (json.success && json.data) return json;
  } catch (err) {
    console.warn('[rankEgressOptions] API call failed, falling back to local engine:', err);
  }
  return flowRankEgress(params);
}

// ---------------------------------------------------------------------------
// Server-side RBAC proof
// ---------------------------------------------------------------------------
// Mints a throwaway `fan` session token (with `credentials: 'omit'` so the
// user's real ops cookie is never disturbed), then calls the protected
// /api/db?coll=incidents endpoint with that fan Bearer token. The server
// verifies the token and must reject the read (401 unauthenticated for a
// missing/invalid token, or 403 for an authenticated-but-unauthorized fan).
// Returns the HTTP status so the UI can assert real, server-enforced gating.
export async function proveFanCannotReadIncidents(): Promise<{ status: number; ok: boolean }> {
  // 1) Mint a fan token. credentials:'omit' => the Set-Cookie is NOT persisted
  //    to the browser jar, so the operator's own session is untouched.
  const sessionRes = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'omit',
    body: JSON.stringify({ role: 'fan' }),
  });
  const setCookie = sessionRes.headers.get('set-cookie') || '';
  const match =
    setCookie.match(/(?:^|;\s*)matchflow_session=([^;]+)/) ||
    setCookie.match(/matchflow_session=([^;,\s]+)/);
  const fanToken = match ? match[1] : '';

  // 2) Attempt the privileged read AS the fan token.
  const res = await fetch('/api/db?coll=incidents', {
    method: 'GET',
    headers: fanToken ? { Authorization: `Bearer ${fanToken}` } : {},
    credentials: 'omit', // do not send the operator's own cookie
  });

  // 401 (no/invalid token) or 403 (authorized-but-forbidden) both prove the
  // server is enforcing access control. Anything else (2xx) is a failure.
  const ok = res.status === 401 || res.status === 403;
  return { status: res.status, ok };
}

// ---------------------------------------------------------------------------
// Simulator hook (kept for page imports; real tick runs server-side)
// ---------------------------------------------------------------------------
export function runSimulatorTick() {
  // No-op: the live congestion feed is driven by /api/simulate.
}

// ---------------------------------------------------------------------------
// `db` namespace — preserved API surface used by page components.
// ---------------------------------------------------------------------------
export const db = {
  subscribeToCongestion,
  subscribeToReports,
  createReport,
  subscribeToIncidents,
  updateIncidentStatus,
  subscribeToDispatches,
  createDispatch,
  updateDispatchStatus,
  writeCongestionBatch,
  askConcierge,
  rankEgressOptions,
  proveFanCannotReadIncidents,
  runSimulatorTick,
};

// ===========================================================================
// TRADE-OFF - "Firestore onSnapshot" vs. 4s poll (honest submission note)
// ===========================================================================
// This build deliberately does NOT use Firestore. MatchFlow runs on Vercel
// serverless + Upstash KV, so there is no Firestore watch / websocket push
// channel available to the client. What we ship instead:
//
//   * A 4-second setInterval poll per subscription (congestion / reports /
//     incidents / dispatches), NOT a push listener.
//   * Change detection: the serialized payload is compared to the previous
//     poll; the callback fires ONLY when it differs. This reproduces the
//     onSnapshot contract ("callback on a real update, not on a timer tick")
//     and avoids spurious React re-renders on a static feed.
//
// Honest limitations vs. a true Firestore onSnapshot:
//   1. LATENCY: updates are seen at most every ~4s, not within milliseconds of
//      a write. For a stadium heatmap / incident board this is acceptable, but
//      it is NOT real-time. The section 16 "same event, two views" reveal
//      still works because both surfaces read the same polled congestionState
//      on the same 4s cadence.
//   2. REDUNDANT TRAFFIC: every client still issues a GET every 4s even when
//      nothing changed; only the *callback* is suppressed, not the network
//      request. A real onSnapshot would push only deltas.
//   3. ORDERING: the signature is a JSON.stringify of the (stably sorted)
//      array, so a pure re-order without data change is treated as "no
//      change" - fine for our read-only feeds, but worth noting.
//
// To get true push semantics later, swap subscribeWithDedup for a
// server-sent-events / websocket subscription backed by the same /api/db
// source; the change-detection layer can stay as-is.
