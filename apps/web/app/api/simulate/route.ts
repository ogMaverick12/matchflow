import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { verifySession, extractToken } from '@/lib/auth';
import { enforceServer, AuthError } from '@/lib/rbac';

// Server-side congestion simulator. Organizer POSTs here to publish a density
// snapshot into the shared store. Writing congestionState is organizer-only
// (see RBAC matrix), so this requires a verified organizer token.

const ZONES = ['Zone_A', 'Zone_B', 'Zone_C', 'Zone_D'];
const SEED: Record<string, number> = { Zone_A: 0.32, Zone_B: 0.18, Zone_C: 0.45, Zone_D: 0.25 };

async function getState(): Promise<Record<string, number>> {
  try {
    const v = await kv.get('congestionState');
    // Normalize either stored shape (array of zone rows, or a raw score map)
    // into a { zoneId: densityScore } map for the random-walk logic.
    if (Array.isArray(v)) {
      const m: Record<string, number> = {};
      for (const row of v as Array<{ zoneId: string; densityScore: number }>) {
        if (row?.zoneId) m[row.zoneId] = row.densityScore;
      }
      return m;
    }
    if (v && typeof v === 'object') return v as Record<string, number>;
  } catch { /* fall through */ }
  return { ...SEED };
}
const KV_READY = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

async function setState(rows: Array<{ zoneId: string; densityScore: number }>) {
  if (!KV_READY) return;
  try { await kv.set('congestionState', rows); } catch { /* in-memory fallback below */ }
}

const MEM = { ...SEED };

export async function POST(req: NextRequest) {
  try {
    const claims = await verifySession(extractToken(req));
    if (!claims) throw new AuthError('Missing or invalid session token.', 401);
    enforceServer(claims.role, 'write', 'congestionState');

    const body = await req.json().catch(() => ({}));
    const incoming = (body?.scores || {}) as Record<string, number>;

    const next: Record<string, number> = { ...MEM };
    for (const z of ZONES) {
      if (typeof incoming[z] === 'number') next[z] = incoming[z];
      else {
        // bounded random walk
        const drift = (Math.random() - 0.5) * 0.08;
        next[z] = Math.min(0.95, Math.max(0.05, next[z] + drift));
      }
    }
    Object.assign(MEM, next);

    const rows = ZONES.map(z => ({
      zoneId: z, name: z.replace('_', ' '),
      level: '100', densityScore: parseFloat(next[z].toFixed(3)),
      lastUpdated: Date.now(), trend: 'stable' as const
    }));
    await setState(rows);

    return NextResponse.json({ data: rows });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.status === 403 ? 'permission-denied' : 'unauthenticated' }, { status: err.status });
    }
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
