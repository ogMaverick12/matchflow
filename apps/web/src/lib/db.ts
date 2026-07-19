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
  return json.data as T;
}

async function apiPost(body: any) {
  const res = await fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
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
// Client-side RBAC mirror (server is authoritative via KV + API checks)
// ---------------------------------------------------------------------------
function enforceRules(
  role: UserRole,
  action: 'read' | 'write',
  collection: 'sessions' | 'reports' | 'incidents' | 'dispatches' | 'concourseGraph' | 'congestionState',
  documentAuthorId?: string
) {
  if (role === 'organizer') return;
  if (collection === 'concourseGraph' || collection === 'congestionState') {
    if (action === 'write') throw new Error(`Permission Denied: role ${role} cannot write to ${collection}`);
    return;
  }
  if (collection === 'sessions') return;
  if (collection === 'incidents' || collection === 'dispatches') {
    if (role === 'staff') return;
    throw new Error(`Permission Denied: role ${role} cannot access ${collection}.`);
  }
  if (collection === 'reports') {
    if (action === 'write') {
      if (role === 'volunteer' || role === 'staff') return;
      throw new Error(`Permission Denied: role ${role} cannot create reports.`);
    }
    if (action === 'read') {
      if (role === 'staff') return;
      if (role === 'volunteer') {
        if (documentAuthorId && documentAuthorId === 'me') return;
        throw new Error('Permission Denied: volunteer can only read own reports.');
      }
      throw new Error(`Permission Denied: role ${role} cannot read reports.`);
    }
  }
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

export function attemptCrossRoleRead(role: UserRole): Promise<Report[]> {
  return new Promise((resolve, reject) => {
    try { enforceRules(role, 'read', 'reports', 'other_user'); resolve([]); }
    catch (e) { reject(e); }
  });
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
export async function writeCongestionBatch(
  updates: Array<Pick<CongestionZone, 'zoneId' | 'densityScore' | 'lastUpdated' | 'trend'>>
): Promise<void> {
  const scores: Record<string, number> = {};
  for (const u of updates) scores[u.zoneId] = u.densityScore;
  await fetch('/api/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scores }),
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
  attemptCrossRoleRead,
  subscribeToIncidents,
  updateIncidentStatus,
  subscribeToDispatches,
  createDispatch,
  updateDispatchStatus,
  writeCongestionBatch,
  askConcierge,
  rankEgressOptions,
  runSimulatorTick,
};

