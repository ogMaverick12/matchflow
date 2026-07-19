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
import { askFlowEngine, ConciergeResponseData, rankEgressOptions as flowRankEgress } from '@matchflow/flow-engine';

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
async function apiGet<T>(coll: string): Promise<T> {
  const res = await fetch(`/api/db?coll=${coll}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json.data as T;
}

async function apiPost(body: any) {
  const res = await fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json.data;
}

async function apiConcierge(req: Parameters<typeof askFlowEngine>[0], congestion: Record<string, number>) {
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
  } catch { /* fall through */ }
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
  collection: 'sessions' | 'reports' | 'incidents' | 'dispatches' | 'concourseGraph' | 'congestionState',
  documentAuthorId?: string
) {
  // The shared matrix uses Role/Collection; map our local UserRole + action.
  enforceClient(role as RbacRole, action as any, collection as any, {
    documentAuthorId,
    requestUserId: 'me'
  });
}

// ---------------------------------------------------------------------------
// Congestion
// ---------------------------------------------------------------------------
export function subscribeToCongestion(
  role: UserRole,
  callback: (zones: CongestionZone[]) => void,
  onError?: (err: Error) => void
): () => void {
  try { enforceRules(role, 'read', 'congestionState'); } catch (e) { onError?.(e as Error); return () => {}; }
  let alive = true;
  const poll = async () => {
    if (!alive) return;
    try { callback(await apiGet<CongestionZone[]>('congestionState')); }
    catch (e) { onError?.(e as Error); }
  };
  poll();
  const id = setInterval(poll, 4000);
  return () => { alive = false; clearInterval(id); };
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
export function subscribeToReports(
  role: UserRole,
  userId: string,
  callback: (reports: Report[]) => void,
  onError?: (err: Error) => void
): () => void {
  try { enforceRules(role, 'read', 'reports', userId); } catch (e) { onError?.(e as Error); return () => {}; }
  let alive = true;
  const poll = async () => {
    if (!alive) return;
    try {
      const all = await apiGet<Report[]>('reports');
      const filtered = role === 'volunteer' ? all.filter(r => r.authorId === userId) : all;
      callback(filtered.sort((a, b) => b.timestamp - a.timestamp));
    } catch (e) { onError?.(e as Error); }
  };
  poll();
  const id = setInterval(poll, 4000);
  return () => { alive = false; clearInterval(id); };
}

export async function createReport(
  role: UserRole,
  reportData: Omit<Report, 'id' | 'timestamp'>
): Promise<Report> {
  enforceRules(role, 'write', 'reports');
  const data = await apiPost({ coll: 'reports', op: 'insert', doc: reportData });
  return (data as any[])[0];
}

// ---------------------------------------------------------------------------
// Incidents
// ---------------------------------------------------------------------------
export function subscribeToIncidents(
  role: UserRole,
  callback: (incidents: Incident[]) => void,
  onError?: (err: Error) => void
): () => void {
  try { enforceRules(role, 'read', 'incidents'); } catch (e) { onError?.(e as Error); return () => {}; }
  let alive = true;
  const poll = async () => {
    if (!alive) return;
    try { callback(await apiGet<Incident[]>('incidents')); }
    catch (e) { onError?.(e as Error); }
  };
  poll();
  const id = setInterval(poll, 4000);
  return () => { alive = false; clearInterval(id); };
}

export async function updateIncidentStatus(
  role: UserRole, incidentId: string, status: Incident['status']
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
  onError?: (err: Error) => void
): () => void {
  try { enforceRules(role, 'read', 'dispatches'); } catch (e) { onError?.(e as Error); return () => {}; }
  let alive = true;
  const poll = async () => {
    if (!alive) return;
    try { callback(await apiGet<Dispatch[]>('dispatches')); }
    catch (e) { onError?.(e as Error); }
  };
  poll();
  const id = setInterval(poll, 4000);
  return () => { alive = false; clearInterval(id); };
}

export async function createDispatch(
  role: UserRole, dispatchData: Omit<Dispatch, 'id' | 'timestamp'>
): Promise<Dispatch> {
  enforceRules(role, 'write', 'dispatches');
  const data = await apiPost({ coll: 'dispatches', op: 'insert', doc: dispatchData });
  return (data as any[])[0];
}

export async function updateDispatchStatus(
  role: UserRole, dispatchId: string, status: Dispatch['status']
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
  opts?: { tick?: number; reset?: boolean }
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
  congestion: Record<string, number>
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
  } catch { /* fallback below */ }
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
  const match = setCookie.match(/(?:^|;\s*)matchflow_session=([^;]+)/) || setCookie.match(/matchflow_session=([^;,\s]+)/);
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

