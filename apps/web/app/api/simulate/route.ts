import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// Server-side congestion simulator. Organizer (or any client) POSTs here
// to publish a density snapshot into the shared store. In production this
// would be a Vercel Cron / real sensor feed; here it is organizer-driven
// so the ops heatmap reflects live, scripted demo spikes (§16).

const ZONES = ['Zone_A', 'Zone_B', 'Zone_C', 'Zone_D'];
const SEED: Record<string, number> = { Zone_A: 0.32, Zone_B: 0.18, Zone_C: 0.45, Zone_D: 0.25 };

async function getState(): Promise<Record<string, number>> {
  try { return (await kv.get('congestionState')) ?? { ...SEED }; } catch { return { ...SEED }; }
}
async function setState(s: Record<string, number>) {
  try { await kv.set('congestionState', s); } catch { /* in-memory fallback below */ }
}

const MEM = { ...SEED };

export async function POST(req: NextRequest) {
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
  await setState(next);

  const rows = ZONES.map(z => ({
    zoneId: z, name: z.replace('_', ' '),
    level: '100', densityScore: parseFloat(next[z].toFixed(3)),
    lastUpdated: Date.now(), trend: 'stable' as const
  }));
  return NextResponse.json({ data: rows });
}
