'use client';

/**
 * db.ts — Production data layer for MatchFlow.
 *
 * Replaces the in-browser mock with real Firebase Firestore listeners and
 * Cloud Function callables. The public API surface is preserved so the page
 * components do not need to change.
 *
 * Resilience: every backend call has a deterministic fallback:
 *   - askConcierge falls back to the in-browser flow-engine if the callable
 *     fails or is unreachable (§13 graceful degradation).
 *   - congestion/reports/incidents/dispatches read from Firestore; if offline,
 *     listeners simply do not fire (UI shows last-known / empty state).
 *
 * Security: client-side enforceRules mirrors the Firestore security rules so
 * the UI can show "permission denied" states without a round-trip, but the
 * server-side rules in firestore.rules remain the source of truth.
 */

import { UserRole, CongestionZone, Incident, Report, Dispatch } from '@matchflow/types';
import { doc, onSnapshot, collection, addDoc, updateDoc, query, orderBy, limit, where, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getFirebaseDb, getFirebaseFunctions, isFirebaseConfigured } from './firebase';
import { askFlowEngine, ConciergeResponseData, rankEgressOptions as localRankEgressOptions } from '@matchflow/flow-engine';

// ---------------------------------------------------------------------------
// Security Rules Checker (client-side mirror of firestore.rules)
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

function handleError(err: unknown, onError?: (e: Error) => void) {
  const e = err instanceof Error ? err : new Error(String(err));
  if (onError) onError(e);
}

// ---------------------------------------------------------------------------
// Concierge — calls deployed askConcierge callable, falls back to local engine
// ---------------------------------------------------------------------------
export async function askConcierge(
  req: Parameters<typeof askFlowEngine>[0],
  congestion: Record<string, number>
): Promise<ConciergeResponseData & { detectedLanguage?: string }> {
  if (!isFirebaseConfigured()) {
    const local = await askFlowEngine(req, congestion);
    return { ...local, detectedLanguage: req.language };
  }
  try {
    const fn = httpsCallable(getFirebaseFunctions(), 'askConcierge');
    const res = await fn({
      query: req.query,
      sessionId: req.sessionId,
      userId: req.userId,
      role: req.role,
      language: req.language,
      accessibilityMode: req.accessibilityMode,
    });
    const data = (res.data as any);
    if (data?.success && data.data) {
      return {
        answerText: data.data.answerText,
        route: data.data.route,
        detectedLanguage: data.data.detectedLanguage ?? req.language,
      };
    }
    // Backend returned a structured error — fall back locally
    const local = await askFlowEngine(req, congestion);
    return { ...local, detectedLanguage: req.language };
  } catch {
    // Network / timeout / 404 — deterministic fallback (§13)
    const local = await askFlowEngine(req, congestion);
    return { ...local, detectedLanguage: req.language };
  }
}

// ---------------------------------------------------------------------------
// Congestion State — real-time Firestore listener
// ---------------------------------------------------------------------------
export function subscribeToCongestion(
  role: UserRole,
  callback: (zones: CongestionZone[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    enforceRules(role, 'read', 'congestionState');
  } catch (err) {
    handleError(err, onError);
    return () => {};
  }
  if (!isFirebaseConfigured()) {
    onError?.(new Error('Firebase not configured'));
    return () => {};
  }
  const col = collection(getFirebaseDb(), 'congestionState');
  const unsub = onSnapshot(col, (snap) => {
    const zones: CongestionZone[] = [];
    snap.forEach((d) => zones.push(d.data() as CongestionZone));
    callback(zones);
  }, (err) => handleError(err, onError));
  return unsub;
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
  try {
    enforceRules(role, 'read', 'reports', userId);
  } catch (err) {
    handleError(err, onError);
    return () => {};
  }
  if (!isFirebaseConfigured()) {
    onError?.(new Error('Firebase not configured'));
    return () => {};
  }
  const col = collection(getFirebaseDb(), 'reports');
  const q = role === 'volunteer'
    ? query(col, where('authorId', '==', userId))
    : col;
  const unsub = onSnapshot(q, (snap) => {
    const reports: Report[] = [];
    snap.forEach((d) => reports.push(d.data() as Report));
    callback(reports.sort((a, b) => b.timestamp - a.timestamp));
  }, (err) => handleError(err, onError));
  return unsub;
}

export function attemptCrossRoleRead(role: UserRole): Promise<Report[]> {
  return new Promise((resolve, reject) => {
    try {
      enforceRules(role, 'read', 'reports', 'other_user');
      resolve([]);
    } catch (err) {
      reject(err);
    }
  });
}

export async function createReport(
  role: UserRole,
  reportData: Omit<Report, 'id' | 'timestamp'>
): Promise<Report> {
  enforceRules(role, 'write', 'reports');
  if (!isFirebaseConfigured()) throw new Error('Firebase not configured');
  const ref = await addDoc(collection(getFirebaseDb(), 'reports'), {
    ...reportData,
    timestamp: Date.now(),
  });
  return { ...reportData, id: ref.id, timestamp: Date.now() } as Report;
}

// ---------------------------------------------------------------------------
// Incidents
// ---------------------------------------------------------------------------
export function subscribeToIncidents(
  role: UserRole,
  callback: (incidents: Incident[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    enforceRules(role, 'read', 'incidents');
  } catch (err) {
    handleError(err, onError);
    return () => {};
  }
  if (!isFirebaseConfigured()) {
    onError?.(new Error('Firebase not configured'));
    return () => {};
  }
  const col = collection(getFirebaseDb(), 'incidents');
  const q = query(col, orderBy('updatedAt', 'desc'), limit(100));
  const unsub = onSnapshot(q, (snap) => {
    const incidents: Incident[] = [];
    snap.forEach((d) => incidents.push(d.data() as Incident));
    callback(incidents);
  }, (err) => handleError(err, onError));
  return unsub;
}

export async function updateIncidentStatus(
  role: UserRole,
  incidentId: string,
  status: Incident['status']
): Promise<void> {
  enforceRules(role, 'write', 'incidents');
  if (!isFirebaseConfigured()) throw new Error('Firebase not configured');
  await updateDoc(doc(getFirebaseDb(), 'incidents', incidentId), { status, updatedAt: Date.now() });
}

// ---------------------------------------------------------------------------
// Dispatches
// ---------------------------------------------------------------------------
export function subscribeToDispatches(
  role: UserRole,
  callback: (dispatches: Dispatch[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    enforceRules(role, 'read', 'dispatches');
  } catch (err) {
    handleError(err, onError);
    return () => {};
  }
  if (!isFirebaseConfigured()) {
    onError?.(new Error('Firebase not configured'));
    return () => {};
  }
  const col = collection(getFirebaseDb(), 'dispatches');
  const q = query(col, orderBy('timestamp', 'desc'), limit(100));
  const unsub = onSnapshot(q, (snap) => {
    const dispatches: Dispatch[] = [];
    snap.forEach((d) => dispatches.push(d.data() as Dispatch));
    callback(dispatches);
  }, (err) => handleError(err, onError));
  return unsub;
}

export async function createDispatch(
  role: UserRole,
  dispatchData: Omit<Dispatch, 'id' | 'timestamp'>
): Promise<Dispatch> {
  enforceRules(role, 'write', 'dispatches');
  if (!isFirebaseConfigured()) throw new Error('Firebase not configured');
  const ref = await addDoc(collection(getFirebaseDb(), 'dispatches'), {
    ...dispatchData,
    timestamp: Date.now(),
  });
  return { ...dispatchData, id: ref.id, timestamp: Date.now() } as Dispatch;
}

export async function updateDispatchStatus(
  role: UserRole,
  dispatchId: string,
  status: Dispatch['status']
): Promise<void> {
  enforceRules(role, 'write', 'dispatches');
  if (!isFirebaseConfigured()) throw new Error('Firebase not configured');
  await updateDoc(doc(getFirebaseDb(), 'dispatches', dispatchId), { status });
}

// ---------------------------------------------------------------------------
// Congestion write (organizer-only — used by the simulation engine)
// ---------------------------------------------------------------------------
export async function writeCongestionBatch(
  updates: Array<Pick<CongestionZone, 'zoneId' | 'densityScore' | 'lastUpdated' | 'trend'>>
): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const db = getFirebaseDb();
  const { writeBatch } = await import('firebase/firestore');
  const batch = writeBatch(db);
  for (const u of updates) {
    const ref = doc(db, 'congestionState', u.zoneId);
    batch.set(ref, u, { merge: true });
  }
  await batch.commit();
}

// ---------------------------------------------------------------------------
// Egress ranking — deployed rankEgressOptions callable, falls back locally
// ---------------------------------------------------------------------------
export async function rankEgressOptions(params: Parameters<typeof localRankEgressOptions>[0]) {
  if (!isFirebaseConfigured()) return localRankEgressOptions(params);
  try {
    const fn = httpsCallable(getFirebaseFunctions(), 'rankEgressOptions');
    const res = await fn(params);
    const data = (res.data as any);
    if (data?.success && data.data) return data;
    return localRankEgressOptions(params);
  } catch {
    return localRankEgressOptions(params);
  }
}

// ---------------------------------------------------------------------------
// Backwards-compatible simulator hook — retained for page imports.
// The real congestion feed now lives in Firestore; this is a no-op here so
// pages that call it keep compiling. The simulation engine (congestion-
// simulator.ts) drives writes via writeCongestionBatch.
// ---------------------------------------------------------------------------
export function runSimulatorTick() {
  // No-op: live data flows from Firestore, not the client tick.
}

// ---------------------------------------------------------------------------
// `db` object — preserves the original public API used by page components.
// All methods delegate to the real-Firestore implementations above.
// ---------------------------------------------------------------------------
export const db = {
  subscribeToCongestion,
  subscribeToReports,
  attemptCrossRoleRead,
  createReport,
  subscribeToIncidents,
  updateIncidentStatus,
  subscribeToDispatches,
  createDispatch,
  updateDispatchStatus,
  writeCongestionBatch,
  runSimulatorTick,
};
