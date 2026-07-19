import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { verifySession, extractToken, AuthError } from '@/lib/auth';
import { enforceServer, Role, Collection } from '@/lib/rbac';

// Shared data API — backs the MatchFlow collections (congestionState,
// reports, incidents, dispatches) in Upstash Redis (via @vercel/kv).
//
// EVERY request requires a valid signed session cookie/token. The role claim
// is extracted from the verified token and used to enforce the RBAC matrix
// server-side. The client's self-reported role is never trusted.

type Coll = 'congestionState' | 'reports' | 'incidents' | 'dispatches';

const MEM: Record<string, Record<string, unknown>[]> = {
  congestionState: [
    {
      zoneId: 'Zone_A',
      name: 'Zone A (North East)',
      level: '100',
      densityScore: 0.25,
      lastUpdated: Date.now(),
      trend: 'stable',
    },
    {
      zoneId: 'Zone_B',
      name: 'Zone B (South East)',
      level: '100',
      densityScore: 0.35,
      lastUpdated: Date.now(),
      trend: 'stable',
    },
    {
      zoneId: 'Zone_C',
      name: 'Zone C (South West)',
      level: '100',
      densityScore: 0.15,
      lastUpdated: Date.now(),
      trend: 'stable',
    },
    {
      zoneId: 'Zone_D',
      name: 'Zone D (North West)',
      level: '100',
      densityScore: 0.2,
      lastUpdated: Date.now(),
      trend: 'stable',
    },
  ],
  reports: [],
  incidents: [
    // §16 deterministic pre-seeded demo incident so the ops dashboard shows a
    // real card on first paint (no waiting for a fan query to arrive). Stable
    // id + timestamps keep the §16 "same live moment" reveal reproducible.
    {
      id: 'inc_demo_zoneA',
      sourceReportIds: ['rep_demo_seed'],
      summary: 'Congestion spike — Zone A north-east concourse',
      description:
        'Seeded volunteer reports flagged a crowd build-up near the Zone A concessions ' +
        'at halftime. Live signal confirms elevated density; routing is being re-scored away from the zone.',
      severity: 'high',
      confidence: 0.92,
      status: 'active',
      zoneId: 'Zone_A',
      level: '100',
      createdAt: 1750000000000,
      updatedAt: 1750000000000,
    },
  ],
  dispatches: [],
};

// When Vercel KV isn't bound (local dev / missing env), skip the network
// round-trip entirely and use the in-memory store. The server is the
// authoritative guard; the KV backend is an availability detail.
const KV_READY = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

async function read(coll: Coll): Promise<Record<string, unknown>[]> {
  if (!KV_READY) return MEM[coll];
  try {
    return (await kv.get(coll)) ?? MEM[coll];
  } catch (err) {
    console.warn(`[read] KV read failed for ${coll}, using in-memory fallback:`, err);
    return MEM[coll];
  }
}
async function write(coll: Coll, rows: Record<string, unknown>[]): Promise<void> {
  MEM[coll] = rows;
  if (!KV_READY) return;
  try {
    await kv.set(coll, rows);
  } catch (err) {
    console.warn(`[write] KV write failed for ${coll}, keeping in-memory:`, err);
  }
}

function unauthorized(err: AuthError) {
  return NextResponse.json(
    { error: err.message, code: err.status === 403 ? 'permission-denied' : 'unauthenticated' },
    { status: err.status },
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
    // For volunteer reads of reports, the matrix allows reading ONLY their own
    // documents — pass the author/requester opts so enforceServer permits it.
    // (The per-document filter below still strips anything not authored by them.)
    enforceServer(claims.role as Role, 'read', COLL_MAP[coll], {
      documentAuthorId: claims.userId,
      requestUserId: claims.userId,
    });

    let data = await read(coll);
    if (coll === 'reports' && claims.role === 'volunteer') {
      data = data.filter((r) => (r as { authorId?: string }).authorId === claims.userId);
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
      const doc = {
        ...body.doc,
        id: body.doc?.id || `${coll}_${Date.now()}`,
        timestamp: Date.now(),
      };
      if (coll === 'reports') doc.authorId = claims.userId;
      enforceServer(claims.role as Role, 'create', matrixColl, {
        documentAuthorId: doc.authorId,
        requestUserId: claims.userId,
      });
      const rows = await read(coll);
      const next = [doc, ...rows];
      await write(coll, next);
      return NextResponse.json({ data: next, id: doc.id });
    }

    if (op === 'update') {
      enforceServer(claims.role as Role, 'update', matrixColl, {
        documentAuthorId: body.doc?.authorId,
        requestUserId: claims.userId,
      });
      const rows = await read(coll);
      const next = rows.map((r) =>
        (r as { id?: string }).id === body.id ? { ...r, ...body.patch, updatedAt: Date.now() } : r,
      );
      await write(coll, next);
      return NextResponse.json({ data: next });
    }

    if (op === 'delete') {
      enforceServer(claims.role as Role, 'delete', matrixColl);
      const rows = await read(coll);
      const next = rows.filter((r) => (r as { id?: string }).id !== body.id);
      await write(coll, next);
      return NextResponse.json({ data: next });
    }

    if (op === 'seedCongestion') {
      enforceServer(claims.role as Role, 'write', 'congestionState');
      await write('congestionState', body.rows);
      return NextResponse.json({ data: body.rows });
    }

    return NextResponse.json({ data: await read(coll) });
  } catch (err: unknown) {
    if (err instanceof AuthError) return unauthorized(err);
    const message = err instanceof Error ? err.message : 'internal';
    return NextResponse.json({ error: 'internal', message }, { status: 500 });
  }
}
