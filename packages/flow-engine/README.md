# @matchflow/flow-engine

Part of the **"one engine, two doors"** Matchflow monorepo architecture.

## Role

`flow-engine` is the **AI orchestration layer** — the single bridge between both surfaces (fan concierge + ops dashboard) and the Gemini API. All LLM logic lives here; no surface calls Gemini directly.

It is also responsible for:
- Routing intent to the correct Gemini model tier (fast vs. high-capability)
- Injecting live concourse context (congestion map, accessibility mode, language)
- Delegating structured tool calls to `@matchflow/concourse-graph`
- Deterministic fallbacks when Gemini times out or is unavailable

## Architecture Position

```
                      ┌─────────────────────┐
Fan surface (Next.js) │   apps/web/(fan)    │
                      └────────┬────────────┘
                               │ calls askFlowEngine()
                      ┌────────▼────────────┐  ◀── YOU ARE HERE
                      │  @matchflow/        │
                      │  flow-engine        │  ← AI orchestration
                      └────────┬────────────┘
                               │ imports
                      ┌────────▼────────────┐
                      │  @matchflow/        │
                      │  concourse-graph    │  ← physical world model + routing
                      └─────────────────────┘
                      
Cloud Functions (Node) → calls Gemini directly via google-generative-ai SDK
```

## Key Exports

| Export | Description |
|---|---|
| `askFlowEngine(req, congestionMap)` | Primary concierge entrypoint — takes a fan query + live congestion, returns `{ answerText, route? }` |
| `rankDispatches(incidentId, zoneId, roster)` | Deterministic dispatch fallback used by `suggestDispatch` function when Gemini times out |
| `ConciergeResponseData` | TypeScript type for the structured response (answerText + optional route) |

## Model Tier Routing

| Function | Model | Rationale |
|---|---|---|
| `askConcierge` | `gemini-3.5-flash` | Fan is actively waiting — sub-4s budget |
| `simplifyText` | `gemini-3.5-flash` | Best-effort accessibility aid |
| `summarizeIncident` | `gemini-3.5-pro` | Quality-critical ops intelligence |
| `suggestDispatch` | `gemini-3.5-pro` | Dispatch suggestions must be accurate |
| `rankEgressOptions` | `gemini-3.5-flash` | Fan exit planning — latency-critical |

## §13 Timeout Architecture

Every Gemini call is wrapped in `withTimeout(promise, ms)`. On breach:
- `askConcierge` → returns a safe, pre-written offline message
- `summarizeIncident` → returns a digest of raw report text
- `suggestDispatch` → calls `rankDispatches()` (deterministic proximity-based)
- `rankEgressOptions` → sorts by weighted score (speed + sustainability)

No Gemini call is ever unguarded.

## §12 Prompt Injection Safety

User-supplied text is always placed inside `<user_input>...</user_input>` delimiters and **never** inserted into `systemInstruction`. The system instruction defines the model's role; the user prompt provides context. The Cloud Functions layer sanitizes delimiter characters (`</user_input>`) from all user-supplied strings before injection.
