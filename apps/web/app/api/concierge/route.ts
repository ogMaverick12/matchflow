import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { askFlowEngine } from '@matchflow/flow-engine';
import { verifySession, extractToken, AuthError } from '@/lib/auth';
import { Role } from '@/lib/rbac';
import { AskConciergeRequest } from '@matchflow/types';

// Serverless concierge — thin wrapper around the shared flow-engine.
// The engine (packages/flow-engine) owns the Gemini call, the tool-execution
// path, and the deterministic fallback. This route only supplies the live
// grounding context (congestion map + active incidents) from the shared store.
//
// Requires a valid signed session token. The role used is the one baked into
// the verified token — never the client-supplied `role` field.

type IncidentRow = { zoneId: string; summary: string; severity: string; status: string };
type CongestionRow = { zoneId: string; densityScore: number };

const KV_READY = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

async function readCollection(coll: string): Promise<unknown[]> {
  if (!KV_READY) return [];
  try {
    const v = await kv.get(coll);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req);
    const claims = await verifySession(token);
    if (!claims) {
      return NextResponse.json(
        { success: false, error: { code: 'unauthenticated', message: 'Missing or invalid session token.' } },
        { status: 401 }
      );
    }

    const body = (await req.json()) as Partial<AskConciergeRequest>;
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
      .filter((i) => i?.status === 'active')
      .map((i) => ({ zoneId: i.zoneId, summary: i.summary, severity: i.severity, status: i.status }));

    let data;
    try {
      data = await askFlowEngine(
        {
          query: body.query,
          sessionId: claims.userId,
          userId: claims.userId,
          role: claims.role as Role,
          language: body.language || 'en',
          accessibilityMode: body.accessibilityMode || { mobilityRouting: false, highContrast: false, simplifiedLanguage: false }
        },
        zoneCongestion,
        { incidents: activeIncidents }
      );
    } catch {
      // Graceful degradation: if the engine/LLM call fails, return a safe
      // deterministic notice rather than 500ing the request.
      data = {
        answerText:
          "I'm sorry, the concierge is temporarily unavailable. Please check the live concourse map for wayfinding and congestion updates.",
        detectedLanguage: body.language || 'en'
      };
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: { code: 'unauthenticated', message: err.message } }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'error';
    return NextResponse.json({ success: false, error: { code: 'internal', message } }, { status: 500 });
  }
}
