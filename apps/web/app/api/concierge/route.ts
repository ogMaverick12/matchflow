import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { askFlowEngine } from '@matchflow/flow-engine';

// Serverless concierge — thin wrapper around the shared flow-engine.
// The engine (packages/flow-engine) owns the Gemini call, the tool-execution
// path, and the deterministic fallback. This route only supplies the live
// grounding context (congestion map + active incidents) from the shared store.

interface ConciergeBody {
  query: string;
  sessionId: string;
  userId: string;
  role: string;
  language: string;
  accessibilityMode: { mobilityRouting: boolean; highContrast: boolean; simplifiedLanguage: boolean };
}

type IncidentRow = { zoneId: string; summary: string; severity: string; status: string };
type CongestionRow = { zoneId: string; densityScore: number };

async function readCollection(coll: string): Promise<any[]> {
  try {
    const v = await kv.get(coll);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ConciergeBody;
    if (!body?.query) {
      return NextResponse.json({ success: false, error: { code: 'invalid-argument', message: 'Missing query.' } }, { status: 400 });
    }

    // Live grounding context from the shared store (Vercel KV / Upstash).
    const [zones, incidents] = await Promise.all([
      readCollection('congestionState'),
      readCollection('incidents')
    ]);

    const zoneCongestion: Record<string, number> = {};
    for (const z of zones as CongestionRow[]) {
      if (z?.zoneId && typeof z.densityScore === 'number') zoneCongestion[z.zoneId] = z.densityScore;
    }
    const activeIncidents: IncidentRow[] = (incidents as IncidentRow[])
      .filter(i => i?.status === 'active')
      .map(i => ({ zoneId: i.zoneId, summary: i.summary, severity: i.severity, status: i.status }));

    const data = await askFlowEngine(
      {
        query: body.query,
        sessionId: body.sessionId,
        userId: body.userId,
        role: (body.role as any) ?? 'fan',
        language: body.language,
        accessibilityMode: body.accessibilityMode
      },
      zoneCongestion,
      { incidents: activeIncidents }
    );

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { code: 'internal', message: err?.message ?? 'error' } }, { status: 500 });
  }
}
