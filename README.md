# MatchFlow 🏟️

### FIFA World Cup 2026 Smart Stadium Concierge & Crowd Intelligence Platform

MatchFlow is a next-generation, dual-surface crowd intelligence platform designed for the FIFA World Cup 2026 at Mercedes-Benz Stadium. Built on the **"One Engine, Two Doors"** architecture, it provides fans with real-time wayfinding and egress optimization while offering operators actionable venue dispatch intelligence.

---

## 🏗️ Architecture: "One Engine, Two Doors"

MatchFlow uses a monorepo structure separating core business logic from consumer surfaces:

`                                ┌────────────────────────────────┐
                                │       MatchFlow Monorepo       │
                                └────────────────────────────────┘
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
       ┌──────────────────┐                                          ┌──────────────────┐
       │   apps/web/fan   │◀─ ─ ─ ─ ─ ─ [ Same Live Moment ] ─ ─ ─ ─▶│   apps/web/ops   │
       │  (NextJS / Fan)  │                                          │   (NextJS / Ops) │
       └────────┬─────────┘                                          └────────┬─────────┘
                │ imports                                                     │ imports
                │                ┌─────────────────────────────┐              │
                ├───────────────▶│ packages/flow-engine (AI)   │◀─────────────┤
                │                └──────────────┬──────────────┘              │
                │                               │ imports                     │
                │                ┌──────────────▼──────────────┐              │
                └───────────────▶│ packages/concourse-graph    │◀─────────────┘
                                 └─────────────────────────────┘`

- **Fan Concierge Surface (pps/web/(fan))**: Mobile-first Web App providing voice/text concierge routing, live crowd density heatmaps, and post-match transit recommendations.
- **Operations Surface (pps/web/(ops))**: High-contrast, accessibility-first operations console for stadium staff to view active incidents, monitor dispatcher coverage, and approve AI dispatch suggestions.
- **Flow Engine (packages/flow-engine)**: Core AI orchestration layer. Interfaces with the Gemini API, routes queries to model tiers, processes user signals, and provides deterministic fallbacks on timeouts.
- **Concourse Graph (packages/concourse-graph)**: Single source of truth for the physical layout. Contains nodes, edges, and accessibility subgraphs (mobility-compliant routing).

---

## ⚡ Key Features

1. **AI Concierge Wayfinding & Path Streaming**: Captures fan requests, applies tool calls to resolve nodes, streams path coordinates word-by-word, and recalculates path weights dynamically using live congestion data.
2. **Deterministic Mobility Routing (WCAG 2.2 AA)**: Guarantees accessible routing by using the precomputed step-free concourse subgraph. If no accessible path exists, it never falls back silently; instead, it raises a strict, clear error.
3. **Gemini-Powered Egress Transit Planner**: Computes the fastest and greenest exit paths using gemini-3.5-flash with a strict client-side timeout budget.
4. **Operations Dispatch & Real-Time Incident Reporting**: Auto-aggregates crowd spikes reported by fans/volunteers into active incidents and suggests nearby personnel for dispatches.
5. **Seeded Congestion Simulator**: A bounded random-walk simulator with scripted halftime, food rush, and exit wave surges to reproduce the live presentation flow on demand.
6. **Robust Telemetry & Fallback Analytics**: Logs structured interaction data locally to verify performance metrics, model response speeds, and system fallbacks.

---

## 🔑 Do we need an API Key?

**Yes, for production features, but local simulation runs out-of-the-box.**

### 1. Gemini API Key (GEMINI_API_KEY)

- Required by the Flow Engine and Cloud Functions to communicate with the Gemini models (gemini-3.5-flash for latency-critical paths, gemini-3.5-pro for reasoning-critical ops summaries).
- **Offline Fallback:** If the key is missing or calls time out, MatchFlow automatically switches to deterministic in-memory routing and heuristics (e.g. Dijkstra on standard edges, weighted egress calculation).

### 2. Firebase Credentials (NEXT_PUBLIC_FIREBASE_API_KEY)

- Required to connect to Firestore and Performance Monitoring.
- **Mock DB:** When running in development, MatchFlow uses a structured, in-memory local state adapter (db.ts) simulating Firestore subscriptions.

---

## 🚀 Local Setup & Running

Install dependencies at the monorepo root:
`ash
npm install
`

### 1. Run Web Applications (Fan & Ops)

To start the Next.js development server running both surfaces:
`ash
npm run dev -w apps/web
`
Open [http://localhost:3000](http://localhost:3000) for the Fan interface and [http://localhost:3000/dashboard](http://localhost:3000/dashboard) for the Ops Dashboard.

### 2. Run Accessibility & E2E Tests

Tests are orchestrated via Playwright. Verify focus orders, ARIA structures, and routing flows:
`ash
npx playwright test
`

### 3. Run Golden-Set Regression Suite

Evaluates the 150-query multi-language benchmark suite against expected classifications:
`ash
npm run test -w apps/functions
`

---

## 🌐 Deployment to Vercel

Since MatchFlow is configured as a Turborepo/npm workspaces monorepo, Vercel detects the setup automatically.

1. Import the repository in your **Vercel Dashboard**.
2. Set the **Root Directory** to pps/web.
3. Add the following **Environment Variables**:
   - GEMINI_API_KEY: Your Gemini API key.
   - NEXT_PUBLIC_FIREBASE_API_KEY: Firebase API key (optional for mock mode).
4. Click **Deploy**. Vercel will automatically build the NextJS assets and deploy them to global edge networks.
