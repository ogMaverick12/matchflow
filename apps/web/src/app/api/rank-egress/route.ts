import { NextRequest, NextResponse } from 'next/server';
import { rankEgressOptions } from '@matchflow/flow-engine';
import { EgressOption, RankEgressRequest } from '@matchflow/types';

// Serverless egress ranking — calls Gemini when a key is present, else
// returns the deterministic local ranking. Mirrors the functions fallback.

const MODEL = 'gemini-flash-latest';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<RankEgressRequest>;
    if (!body?.options || !Array.isArray(body.options) || body.options.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'invalid-argument', message: 'Missing options.' } },
        { status: 400 },
      );
    }

    const options = body.options as EgressOption[];

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const zoneSummary = Object.entries(body.zoneScores || {})
          .map(([z, s]) => `${z}: ${Math.round(s * 100)}% density`)
          .join(', ');
        const optionsSummary = options
          .map(
            (o) =>
              `- ${o.name} (${o.type}) via ${o.gate}: est. ${o.estimatedMinutes} min, queue ${Math.round(o.currentQueueScore * 100)}%, green ${Math.round(o.sustainabilityScore * 100)}%`,
          )
          .join('\n');

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: `Live zone congestion: ${zoneSummary}\n\nAvailable egress options:\n${optionsSummary}`,
                    },
                  ],
                },
              ],
            }),
          },
        );
        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            return NextResponse.json({ success: true, data: parsed });
          }
        }
      } catch (err) {
        console.warn(
          '[rankEgressOptions] Gemini call failed, falling through to deterministic ranking:',
          err,
        );
      }
    }

    const sorted = [...options].sort((a, b) => {
      const scoreA =
        (1 - a.currentQueueScore) * 0.5 +
        a.sustainabilityScore * 0.3 +
        (1 - a.estimatedMinutes / 60) * 0.2;
      const scoreB =
        (1 - b.currentQueueScore) * 0.5 +
        b.sustainabilityScore * 0.3 +
        (1 - b.estimatedMinutes / 60) * 0.2;
      return scoreB - scoreA;
    });
    return NextResponse.json({
      success: true,
      data: {
        rankedOptions: sorted.map((o, i) => ({
          id: o.id,
          rank: i + 1,
          rationale:
            i === 0
              ? 'Best combination of speed and sustainability given current congestion.'
              : 'Alternative option.',
          recommended: i === 0,
        })),
        summary: `${sorted[0].name} via ${sorted[0].gate} is currently the fastest option (est. ${sorted[0].estimatedMinutes} min).`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error';
    return NextResponse.json(
      { success: false, error: { code: 'internal', message } },
      { status: 500 },
    );
  }
}
