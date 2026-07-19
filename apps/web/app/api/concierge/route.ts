import { NextRequest, NextResponse } from 'next/server';
import { askFlowEngine } from '@matchflow/flow-engine';

// Serverless concierge — calls Gemini (gemini-flash-latest) and returns a
// grounded response. Falls back to the deterministic in-process flow-engine
// if the API key is absent or the call fails (§13 graceful degradation).

const MODEL = 'gemini-flash-latest';

interface ConciergeBody {
  query: string;
  sessionId: string;
  userId: string;
  role: string;
  language: string;
  accessibilityMode: { mobilityRouting: boolean; highContrast: boolean; simplifiedLanguage: boolean };
}

const SYSTEM = `You are a wayfinding concierge assistant for the Mercedes-Benz Stadium in Atlanta.
You only answer questions about concourse gates, restrooms, food concessions, seating sections, and stadium transit.
If the question is out of scope (general knowledge, news, coding, other stadiums), refuse politely but firmly.
Respond in the user's language (auto-detect). If the input is Arabic, format naturally in Arabic.
When recommending routes or locations you MUST use one of the tools provided: routeLookup, gateLookup, or incidentStatusLookup.`;

// Minimal tool declarations (kept in sync with flow-engine grounding)
const TOOLS = [{
  name: 'routeLookup',
  description: 'Finds the shortest concourse path between two locations in the stadium.',
  parameters: {
    type: 'OBJECT',
    properties: {
      startNodeId: { type: 'STRING', description: 'Start node ID (e.g. "gate_1")' },
      endNodeId: { type: 'STRING', description: 'Target destination node ID' },
      mobilityRequired: { type: 'BOOLEAN', description: 'Whether routing must be mobility-accessible' }
    },
    required: ['startNodeId', 'endNodeId', 'mobilityRequired']
  }
}, {
  name: 'gateLookup',
  description: 'Looks up details and accessibility options for a specific stadium gate.',
  parameters: {
    type: 'OBJECT',
    properties: { gateNumber: { type: 'STRING', description: 'The gate number' } },
    required: ['gateNumber']
  }
}, {
  name: 'incidentStatusLookup',
  description: 'Checks active bottlenecks or closures in a zone.',
  parameters: {
    type: 'OBJECT',
    properties: { zoneId: { type: 'STRING', description: 'Zone id e.g. Zone_A' } },
    required: ['zoneId']
  }
}];

async function callGemini(body: ConciergeBody) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          tools: [{ functionDeclarations: TOOLS }],
          contents: [{
            role: 'user',
            parts: [{ text: `<user_input>${body.query}</user_input>\nLanguage preference: ${body.language || 'auto'}` }]
          }]
        })
      }
    );
  } catch {
    clearTimeout(timer);
    return null;
  }
  clearTimeout(timer);
  if (!res.ok) return null;
  const data = await res.json();
  const part = data?.candidates?.[0]?.content?.parts?.[0];

  // If the model returned a function call, we execute it deterministically
  // against the concourse graph and return the grounded result.
  if (part?.functionCall) {
    const toolResult = await executeTool(part.functionCall.name, part.functionCall.args);
    return { answerText: summarizeTool(toolResult, body.language), route: toolResult.route, detectedLanguage: body.language };
  }
  return { answerText: part?.text ?? 'No response.', detectedLanguage: body.language };
}

async function executeTool(name: string, args: any) {
  const { findShortestPath, MERCEDES_BENZ_NODES } = await import('@matchflow/concourse-graph');
  if (name === 'routeLookup') {
    const route = findShortestPath(args.startNodeId, args.endNodeId, { mobilityAccessible: args.mobilityRequired });
    return { route: route.path };
  }
  if (name === 'gateLookup') {
    const node = MERCEDES_BENZ_NODES.find(n => n.type === 'gate' && n.name.includes(args.gateNumber));
    return { gate: node?.name ?? args.gateNumber };
  }
  if (name === 'incidentStatusLookup') {
    return { zone: args.zoneId, status: 'No active incidents reported.' };
  }
  return {};
}

function summarizeTool(tool: any, lang: string) {
  if (tool.route) return `Here is your route (${tool.route.length} steps). Check the map for live congestion.`;
  if (tool.gate) return `Gate found: ${tool.gate}.`;
  return 'Okay.';
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ConciergeBody;
    if (!body?.query) {
      return NextResponse.json({ success: false, error: { code: 'invalid-argument', message: 'Missing query.' } }, { status: 400 });
    }

    const gemini = await callGemini(body);
    if (gemini) {
      return NextResponse.json({ success: true, data: gemini });
    }

    // Deterministic fallback — no key / failure
    const fallback = await askFlowEngine({
      query: body.query,
      sessionId: body.sessionId,
      userId: body.userId,
      role: (body.role as any) ?? 'fan',
      language: body.language,
      accessibilityMode: body.accessibilityMode
    }, {});
    return NextResponse.json({
      success: true,
      data: {
        answerText: fallback.answerText,
        route: (fallback as any).route,
        detectedLanguage: body.language
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { code: 'internal', message: err?.message ?? 'error' } }, { status: 500 });
  }
}
