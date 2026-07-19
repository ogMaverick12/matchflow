import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import {
  verifySession,
  extractToken,
  AuthError
} from '@/lib/auth';
import { enforceServer, Role, Collection } from '@/lib/rbac';

// Shared data API — backs the MatchFlow collections (congestionState,
// reports, incidents, dispatches) in Upstash Redis (via @vercel/kv).
//
// EVERY request requires a valid signed session cookie/token. The role claim
// is extracted from the verified token and used to enforce the RBAC matrix
// server-side. The client's self-reported role is never trusted.

type Coll = 'congestionState' | 'reports' | 'incidents' | 'dispatches';

const MEM: Record<string, any[]> = {
  congestionState: [
    { zoneId: 'Zone_A', name: 'Zone A (North East)', level: '100', densityScore: 0.25, lastUpdated: Date.now(), trend: 'stable' },
    { zoneId: 'Zone_B', name: 'Zone B (South East)', level: '100', densityScore: 0.35, lastUpdated: Date.now(), trend: 'stable' },
    { zoneId: 'Zone_C', name: 'Zone C (South West)', level: '100', densityScore: 0.15, lastUpdated: Date.now(), trend: 'stable' },
    { zoneId: 'Zone_D', name: 'Zone D (North West)', level: '100', densityScore: 0.20, lastUpdated: Date.now(), trend: 'stable' },
  ],
  reports: [],
  incidents: [],
  dispatches: [],
};

// When Vercel KV isn't bound (local dev / missing env), skip the network
// round-trip entirely and use the in-memory store. The server is the
// authoritative guard; the KV backend is an availability detail.
const KV_READY = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

async function read(coll: Coll): Promise<any[]> {
  if (!KV_READY) return MEM[coll];
  try { return (await kv.get(coll)) ?? MEM[coll]; } catch { return MEM[coll]; }
}
async function write(coll: Coll, rows: any[]): Promise<void> {
  MEM[coll] = rows;
  if (!KV_READY) return;
  try { await kv.set(coll, rows); } catch { /* keep MEM */ }
}

function unauthorized(err: AuthError) {
  return NextResponse.json(
    { error: err.message, code: err.status === 403 ? 'permission-denied' : 'unauthenticated' },
    { status: err.status }
  );
}

// Map our store collections to the RBAC matrix collections.
const COLL_MAP: Record<Coll, Collection> = {
  congestionState: 'congestionState',
  reports: 'reports',
  incidents: 'incidents',
  dispatches: 'dispatches',
};

// GET /api/db?coll=incidents  → array (read)
export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req);
    const claims = await verifySession(token);
    if (!claims) throw new AuthError('Missing or invalid session token.', 401);

    const coll = (req.nextUrl.searchParams.get('coll') || '') as Coll;
    if (!(coll in MEM)) return NextResponse.json({ error: 'unknown collection' }, { status: 400 });

    // Read checks are per-collection; for reports we allow staff/all and
    // volunteers read-own only (we return the full set here and let the
    // per-document filter happen in the response for volunteer safety).
    enforceServer(claims.role as Role, 'read', COLL_MAP[coll]);

    let data = await read(coll);
    if (coll === 'reports' && claims.role === 'volunteer') {
      data = data.filter((r: any) => r.authorId === claims.userId);
    }
    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

// POST /api/db  body: { coll, op, doc?, id?, where? }  → updated array
export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req);
    const claims = await verifySession(token);
    if (!claims) throw new AuthError('Missing or invalid session token.', 401);

    const body = await req.json();
    const coll = body?.coll as Coll;
    if (!(coll in MEM)) return NextResponse.json({ error: 'unknown collection' }, { status: 400 });

    const matrixColl = COLL_MAP[coll];
    const op = body?.op;

    if (op === 'insert') {
      // For reports, tie the document to the verified author.
      const doc = { ...body.doc, id: body.doc?.id || `${coll}_${Date.now()}`, timestamp: Date.now() };
      if (coll === 'reports') doc.authorId = claims.userId;
      enforceServer(claims.role as Role, 'create', matrixColl, {
        documentAuthorId: doc.authorId,
        requestUserId: claims.userId
      });
      const rows = await read(coll);
      const next = [doc, ...rows];
      await write(coll, next);
      return NextResponse.json({ data: next, id: doc.id });
    }

    if (op === 'update') {
      enforceServer(claims.role as Role, 'update', matrixColl, {
        documentAuthorId: body.doc?.authorId,
        requestUserId: claims.userId
      });
      const rows = await read(coll);
      const next = rows.map((r: any) => (r.id === body.id ? { ...r, ...body.patch, updatedAt: Date.now() } : r));
      await write(coll, next);
      return NextResponse.json({ data: next });
    }

    if (op === 'delete') {
      enforceServer(claims.role as Role, 'delete', matrixColl);
      const rows = await read(coll);
      const next = rows.filter((r: any) => r.id !== body.id);
      await write(coll, next);
      return NextResponse.json({ data: next });
    }

    if (op === 'seedCongestion') {
      enforceServer(claims.role as Role, 'write', 'congestionState');
      await write('congestionState', body.rows);
      return NextResponse.json({ data: body.rows });
    }

    return NextResponse.json({ data: await read(coll) });
  } catch (err: any) {
    if (err instanceof AuthError) return unauthorized(err);
    return NextResponse.json({ error: 'internal', message: err?.message }, { status: 500 });
  }
}
