import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// Shared data API — backs the MatchFlow collections (congestionState,
// reports, incidents, dispatches). Uses Vercel KV when bound;
// otherwise falls back to an in-memory store so the app still runs
// locally / before KV is provisioned. (§6: data is simulated.)

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

async function read(coll: Coll): Promise<any[]> {
  try { return (await kv.get(coll)) ?? MEM[coll]; } catch { return MEM[coll]; }
}
async function write(coll: Coll, rows: any[]): Promise<void> {
  try { await kv.set(coll, rows); } catch { MEM[coll] = rows; }
}

// GET /api/db?coll=incidents  → array
// POST /api/db  body: { coll, op, doc?, id?, where? }  → updated array
export async function GET(req: NextRequest) {
  const coll = (req.nextUrl.searchParams.get('coll') || '') as Coll;
  if (!(coll in MEM)) return NextResponse.json({ error: 'unknown collection' }, { status: 400 });
  return NextResponse.json({ data: await read(coll) });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const coll = body?.coll as Coll;
  if (!(coll in MEM)) return NextResponse.json({ error: 'unknown collection' }, { status: 400 });

  const rows = await read(coll);
  const op = body?.op;

  if (op === 'insert') {
    const doc = { ...body.doc, id: body.doc?.id || `${coll}_${Date.now()}`, timestamp: Date.now() };
    const next = [doc, ...rows];
    await write(coll, next);
    return NextResponse.json({ data: next, id: doc.id });
  }
  if (op === 'update') {
    const next = rows.map((r: any) => (r.id === body.id ? { ...r, ...body.patch, updatedAt: Date.now() } : r));
    await write(coll, next);
    return NextResponse.json({ data: next });
  }
  if (op === 'seedCongestion') {
    await write('congestionState', body.rows);
    return NextResponse.json({ data: body.rows });
  }
  return NextResponse.json({ data: rows });
}
