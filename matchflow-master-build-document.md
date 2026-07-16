# MATCHFLOW
### Master Build Document — Google Prompt Wars, Challenge 4: Smart Stadiums & Tournament Operations (FIFA World Cup 2026)

**Build window:** 10 days · **Build tool:** Google Antigravity · **Team:** Solo

---

## Working Assumptions

Stated once here so the rest of the document doesn't need to keep hedging. Overturn any of these and the relevant section gets a quick patch, not a rewrite.

| # | Assumption | Why |
|---|---|---|
| 1 | Deliverable = repo + running prototype + short demo video + this document | Covers the most likely submission formats for a virtual challenge |
| 2 | Stack is Google-forward (Gemini, Firebase, Maps Platform) but not artificially restricted | Antigravity + Google-run challenge signal this; best tool wins if a real gap exists |
| 3 | Solo build | No teammates mentioned |
| 4 | Real functioning core loop, live data intelligently mocked | 10 days doesn't support real stadium sensor integration, but "mocked" isn't an excuse for shallow |
| 5 | Judging weights roughly equal; Accessibility, Security, Problem Alignment prioritized under time pressure | Hardest to fake, most visible in a short demo |
| 6 | Demo built to survive a 3–5 min walkthrough, live or recorded | Standard format for this challenge type |
| 7 | Data fully simulated, grounded in the real 2026 World Cup footprint | Credibility without needing proprietary data access |
| 8 | Multilingual/accessibility scope: broad architecture, concrete demo slice (5 languages, 2 accessibility modes) | Avoids the "supports everything" trap that convinces no one |

---

## 1. Executive Strategy

**One-sentence concept:** Matchflow is a single AI crowd-intelligence engine — one Flow Engine, two interlocked surfaces — that gives fans instant, multilingual, accessible answers about how to move through a stadium, and gives staff and volunteers the same live signal as a real-time operations console, so both sides of the World Cup experience run on one shared truth instead of two disconnected apps.

**Product thesis:** Every pain point named in this challenge — navigation, crowd management, accessibility, transportation, multilingual assistance, operational intelligence, real-time decision support — is downstream of one thing: **how people move through a stadium, and how fast staff can react when that movement breaks down.** Most hackathon entries for this brief will build a fan chatbot *or* an ops dashboard. Matchflow builds the thing underneath both, and lets that shared intelligence power two different front doors.

**Why this is strategically strong:**

- **It resolves the single-use-case-vs-platform tension without the downside of either.** A single fan-facing chatbot is thin: one user role, near-zero security surface, and a testing story that caps out at "does the model sound right." A sprawling multi-module platform is a 10-day trap — unbuildable at real depth, and a scattered demo reads as unfocused regardless of ambition. A dual-sided product unified by one core avoids both failure modes: it's *one* system to build (the Flow Engine), expressed through two thin, focused UIs.
- **It manufactures a credible Security and Testing story instead of asserting one.** Multiple real roles (fan, volunteer, staff, organizer) create actual RBAC, actual privilege boundaries, and actual data-classification decisions to make — not decoration bolted on for the rubric. Ops workflows (incident triage, dispatch suggestion) are deterministic enough to unit-test, unlike a single generative surface.
- **It hits six of the eight listed challenge areas without stretching:** Navigation, Crowd Management, Accessibility, Operational Intelligence, Real-Time Decision Support, and Multilingual Assistance are native to the concept. Transportation (post-match egress-to-transit routing) and Sustainability (transit-nudging) fall out of the same engine as natural extensions, not bolted-on features.

**User groups targeted:** Fans (primary demo surface — this is where the "wow" lives) and venue staff/volunteers/organizers (the ops surface — this is where the rubric-scoring depth lives). Dual-sided, tightly linked by a shared intelligence core, not two apps sharing a login page.

**Challenge subproblems solved:** Navigation, Crowd management, Accessibility, Real-time decision support, Operational intelligence, Multilingual assistance (native); Transportation and Sustainability (extensions of the same egress-routing logic).

**Why it's likely to score highly across the rubric:**

| Criterion | Why Matchflow is well-positioned |
|---|---|
| Problem Alignment | Directly named challenge areas, not adjacent ones; see the full matrix in §14 |
| Accessibility | First-class routing mode and UI mode, not a settings-menu afterthought — see §9 |
| Security | Real RBAC across 4 roles, PII minimization by design, prompt-injection-aware architecture — see §12 |
| Testing | Deterministic routing/graph logic and ops workflows are unit-testable, not just "vibes-checked" — see §11 |
| Code Quality | Shared-core monorepo forces clean contracts between the two surfaces — see §10 |
| Efficiency | Model routing (fast model for high-frequency fan chat, stronger model for low-frequency ops summarization) — see §13 |

**Why this can win:** The rubric rewards exactly the kind of technical breadth that a single-surface chatbot can't produce and a sprawling platform can't finish. Matchflow's whole strategic bet is that the *architecture* — one engine, two roles, real access control — is what turns six checkbox criteria into six things the judges can actually see working.

---

## 2. Problem Framing for FIFA World Cup 2026

The 2026 tournament is the largest in the event's history: 48 teams, 104 matches, 16 stadiums across 16 host cities in three countries (11 in the United States, 3 in Mexico, 2 in Canada), running June 11 – July 19, 2026. That scale is the source of every operational pain point below.

| Pain point | What it actually looks like inside a stadium |
|---|---|
| **Stadium-scale constraints** | Venues range from ~43,000 (Toronto) to 94,000 (Dallas) capacity. A crowd-guidance system that works for a 43k soccer-specific venue breaks at 94k inside a converted NFL stadium with different concourse geometry — the product can't assume one venue shape. |
| **Multi-stakeholder coordination** | Volunteers, contracted venue staff, and organizers often don't share a system of record. A congestion spike reported by a volunteer rarely reaches the person who can act on it in real time. |
| **Crowd flow and peak load** | Halftime and full-time create synchronized surges at concessions, restrooms, and exits — the exact opposite of steady-state traffic that most "live occupancy" demos are built to show. |
| **Accessibility and multilingual complexity** | A genuinely international crowd (some matches feature two non-host nations, e.g., group games not involving the US, Mexico, or Canada) means wayfinding signage in English/French/Spanish alone will strand a meaningful share of attendees. Mobility-impaired fans need routing that accounts for elevators, ramps, and accessible-seating access points most wayfinding tools ignore entirely. |
| **Transportation and ingress/egress** | Post-match, tens of thousands of people converge on a handful of transit exits simultaneously. Stadiums like MetLife (hosting the final) or AT&T Stadium (a semifinal) have transit and rideshare infrastructure that becomes a bottleneck exactly when everyone needs it at once. |
| **Volunteer coordination** | Volunteers are usually the densest human sensor network in the building, but the least equipped — often running on paper instructions or a radio channel with no structured way to escalate what they're seeing. |
| **Venue operations pain points** | Staff triage incidents (medical, lost child, disturbance, overcrowding) manually, and situational awareness degrades as reports pile up faster than anyone can read them. |
| **Sustainability and logistics** | Idle congestion at exits — cars and rideshares queuing because transit isn't the path of least resistance — is a solvable emissions problem if the system nudges toward transit *before* the crowd defaults to rideshare out of frustration. |
| **Decision latency** | The gap between "a problem exists" and "the right person knows and can act" is the single biggest driver of bad outcomes at scale — a security incident or medical event loses value in every minute of delay. |

**Mapping to the challenge statement:** the brief asks for GenAI applied to Navigation, Crowd management, Accessibility, Transportation, Sustainability, Multilingual assistance, Operational intelligence, and Real-time decision support. Matchflow's Flow Engine is the load-bearing structure connecting all eight — see the full alignment matrix in §14.

---

## 3. Product Vision

**Product name:** Matchflow
**Tagline:** *One flow engine. Every gate, every language, every decision.*

**Positioning statement:** For fans and stadium operations teams at FIFA World Cup 2026 venues, Matchflow is the shared crowd-intelligence layer that turns raw stadium signals into safe, fast, accessible movement decisions — unlike single-purpose wayfinding apps or static ops dashboards, Matchflow keeps both sides of the stadium working from the same live picture.

**Primary users:** Fans and attendees (including mobility-impaired and non-English-speaking fans) navigating a match day end-to-end.

**Secondary users:** Volunteers, venue staff, and organizers responsible for crowd safety and operational response.

**Core value proposition:**
- For fans: never guess where to go, never get stuck in a language you don't speak, never learn about a safety issue the hard way.
- For staff and volunteers: never be the last to know about a problem everyone around you can already see.

**Before vs. after:**

| Before | After |
|---|---|
| Fan asks a volunteer for directions in a language neither speaks well | Fan asks Matchflow by voice or text in their own language and gets a live, congestion-aware route |
| A volunteer notices a bottleneck and has no structured way to escalate it | Volunteer files a one-tap report; it's summarized, deduplicated, and prioritized on the ops console in seconds |
| Ops staff scroll a radio log trying to reconstruct what's happening | Ops staff see a live, AI-summarized incident feed with suggested (not automated) response actions |
| Accessible routing is a static PDF map, if it exists at all | Accessible routing is a first-class mode in the same assistant everyone else uses |
| Post-match egress is a mass of people defaulting to rideshare | Matchflow nudges toward the fastest *and* most transit-friendly exit path in real time |

**North star goals:** (1) Time-to-answer for a fan question under 5 seconds. (2) Time-from-incident-report to ops-console-visibility under 15 seconds. (3) Zero fan-facing feature that isn't also usable in the accessible/simplified mode.

**Product principles:**
1. One engine, two doors — never build a fan feature and an ops feature that don't share underlying logic.
2. Suggest, don't decide — AI proposes actions for ops (dispatch, prioritization); a human always approves anything that moves staff or triggers an alert.
3. Accessible by default, not by toggle — the accessible route mode and simplified-language mode are core paths, not settings buried three menus deep.
4. Degrade gracefully — if Gemini is slow or unavailable, fall back to deterministic lookup rather than showing an error.
5. Design for the concourse, not the boardroom — every screen has to work one-handed, in bright sun or a dark tunnel, held by someone who's been standing for three hours.

---

## 4. Feature Architecture

Every feature below carries: user(s), problem solved, AI/system behavior, why it matters for scoring, complexity, and MVP priority (P0 = must exist for the demo to work, P1 = strengthens the score, P2 = cut first under time pressure).

### A. Core Flagship Features

| Feature | User(s) | Problem Solved | AI/System Behavior | Scoring Impact | Complexity | Priority |
|---|---|---|---|---|---|---|
| **Conversational Wayfinding** | Fans | "Where do I go?" in any supported language | Gemini function-calls into the concourse graph + live congestion state; returns route + ETA | Problem Alignment, Accessibility | High | P0 |
| **Live Congestion-Aware Rerouting** | Fans | Static maps don't know about a bottleneck forming right now | Simulated concourse-zone density feed re-scores routes every refresh cycle | Problem Alignment, Efficiency | High | P0 |
| **Incident Intelligence Feed** | Staff, Organizers | Reports pile up faster than humans can read them | Gemini summarizes, deduplicates, and severity-ranks incoming multilingual reports | Problem Alignment, Efficiency | Medium | P0 |
| **Dispatch Advisor** | Staff, Organizers | Deciding who to send where, under pressure, is slow | Suggests (never auto-executes) staff/volunteer reassignment based on incident queue + roster location | Problem Alignment, Security (human-in-the-loop) | Medium | P0 |

### B. Supporting Features

| Feature | User(s) | Problem Solved | AI/System Behavior | Scoring Impact | Complexity | Priority |
|---|---|---|---|---|---|---|
| **Volunteer One-Tap Reporting** | Volunteers | No structured way to escalate what they see | Structured form + free-text field, auto-tagged and routed into the Incident Feed | Problem Alignment | Low | P0 |
| **Post-Match Transit/Egress Planner** | Fans | Mass exit congestion, transit vs. rideshare decision paralysis | Recommends least-congested exit + transit option, factoring live egress-zone density | Transportation, Sustainability | Medium | P1 |
| **Match-Day Context Panel** | Fans | Not knowing what's happening around them (kickoff time, gates closing, weather) | Simple live-status panel, no AI needed — deliberately deterministic | Problem Alignment | Low | P1 |
| **Organizer Health Overview** | Organizers | No single view of stadium-wide state | Aggregated view across zones: congestion, incidents, dispatch status | Operational Intelligence | Medium | P1 |

### C. AI-Native Features

Features that are only meaningfully better *because* GenAI exists — the ones that would be a materially worse product with a rules-engine instead.

| Feature | User(s) | Problem Solved | AI Behavior | Scoring Impact | Complexity | Priority |
|---|---|---|---|---|---|---|
| **Multilingual Conversational Concierge** | Fans | Rule-based translation of fixed phrases can't handle open-ended questions | Full conversational Gemini agent with function-calling into deterministic tools (routing, lookup) — language detected automatically, no manual switch needed | Problem Alignment, Accessibility | High | P0 |
| **Accessibility Simplifier** | Fans (cognitive load, non-native readers) | Wayfinding text is often dense or jargon-heavy | On-demand rewrite of any response into short-sentence, plain-language form | Accessibility | Low | P0 |
| **Incident Summarization & Deduplication** | Staff | 40 volunteers reporting the "same" bottleneck looks like 40 separate incidents | Gemini clusters semantically similar reports into one incident card with a confidence/severity score | Efficiency, Operational Intelligence | Medium | P0 |
| **Voice Input (Fan Concierge)** | Fans (mobility, literacy, hands-full scenarios) | Typing while carrying food, a child, or a phone in an unfamiliar alphabet is a real barrier | Speech-to-text into the same function-calling pipeline as text | Accessibility | Medium | P1 |

### D. Operations Features

| Feature | User(s) | Problem Solved | Behavior | Scoring Impact | Complexity | Priority |
|---|---|---|---|---|---|---|
| **Role-Based Ops Console** | Staff, Organizers | Volunteers, staff, and organizers need different views of the same truth | Firebase custom-claims RBAC gates which panels/actions are visible | Security | Medium | P0 |
| **Live Congestion Heatmap (Ops view)** | Staff, Organizers | Text reports alone don't convey spatial urgency | Zone-level density visualization over a concourse schematic | Operational Intelligence | Medium | P0 |
| **Audit Log** | Organizers | No record of who was told what, when, during an incident | Every dispatch suggestion + human approval is logged, immutable within the session | Security | Low | P1 |

### E. Fan Experience Features

| Feature | User(s) | Problem Solved | Behavior | Scoring Impact | Complexity | Priority |
|---|---|---|---|---|---|---|
| **Language + Accessibility Onboarding** | All fans | Forcing a settings hunt before the product is useful | One-screen selection at first launch, changeable anytime | Accessibility | Low | P0 |
| **"Find My Gate/Seat/Nearest X" Quick Actions** | Fans | Not every question needs a full conversation | One-tap common queries that skip the chat interface entirely | Problem Alignment | Low | P1 |
| **Offline-Degraded Mode** | Fans | Stadium Wi-Fi/cell congestion is close to guaranteed at 60k+ capacity | Cached static concourse map + last-known gate info available with zero connectivity | Efficiency, Accessibility | Medium | P2 |

### F. Accessibility Features

| Feature | User(s) | Problem Solved | Behavior | Scoring Impact | Complexity | Priority |
|---|---|---|---|---|---|---|
| **Mobility-Accessible Routing Mode** | Mobility-impaired fans | Standard routing ignores elevators, ramps, accessible-seating access | Concourse graph edges tagged with accessibility metadata; routing mode filters the pathfinding accordingly | Accessibility | Medium | P0 |
| **High-Contrast / Low-Stimulation Mode** | Vision-impaired, neurodivergent, migraine-sensitive fans | Default UI can be visually overwhelming under stress | Theme toggle: increased contrast, reduced motion, reduced animation density | Accessibility | Low | P0 |
| **Screen Reader / Keyboard Full Support** | Blind/low-vision fans, ops staff | Most hackathon UIs are mouse/touch-only | Semantic HTML, ARIA labeling, full tab-order keyboard navigation across both surfaces | Accessibility | Medium | P0 |
| **Captioned Voice Responses** | Deaf/hard-of-hearing fans | Voice-first features exclude this group by default | Every voice response ships with a synchronized text transcript, always visible, never voice-only | Accessibility | Low | P0 |


---

## 5. PRD — Product Requirements Document

### Product Overview
Matchflow is a dual-surface crowd-intelligence platform for FIFA World Cup 2026 venues. A shared Flow Engine ingests simulated live signals (concourse density, incident reports, transit status) and powers two front ends: a multilingual, accessibility-first fan concierge, and a role-gated operations console for volunteers, staff, and organizers.

### Objectives
1. Demonstrate GenAI materially improving at least four of the eight named challenge areas at real depth, not surface level.
2. Ship a working, demoable core loop within 10 days as a solo build.
3. Produce a submission that scores defensibly across all six judged criteria, not just the visually obvious ones (UX, Problem Alignment).

### Success Metrics (demo-day, not production KPIs)
| Metric | Target |
|---|---|
| Fan concierge response time (perceived) | < 3s to first token, < 5s full answer |
| Incident report → ops console visibility | < 15s |
| Accessible-mode feature parity | 100% of fan-facing features usable in accessible/simplified mode |
| Languages demoed live | ≥ 5 |
| Automated test coverage on core Flow Engine logic | ≥ 70% of routing/graph functions |
| Demo scenario completion without manual intervention | 100% (rehearsed run) |

### In Scope
- Fan conversational concierge (text + voice) with routing, lookup, and accessibility simplification
- Simulated live concourse congestion model
- Volunteer reporting → AI summarization → ops incident feed
- Role-based ops console (volunteer, staff, organizer views)
- Dispatch suggestion engine (human-approved, never autonomous)
- Mobility-accessible and high-contrast/low-stimulation UI modes
- Post-match transit/egress recommendation

### Out of Scope (explicitly, for this build)
- Real IoT/sensor integration (turnstile counters, CCTV-based crowd counting) — simulated instead
- Payment, ticketing, or seat-purchase flows
- Native mobile apps (PWA only)
- Multi-stadium/multi-tenant admin configuration (single demo venue only)
- Real SMS/push notification infrastructure (in-app only for demo)

### Personas
| Persona | Goals | Frustrations |
|---|---|---|
| **Amara, 29, traveling fan (Nigeria → Atlanta)** | Get to her seat, find accessible restrooms for her mother, understand exit options post-match | English is her third language; signage assumes fluency |
| **Diego, 19, first-time volunteer (Dallas)** | Be useful, not overwhelmed, know when to escalate | No formal radio training, unsure what's "worth reporting" |
| **Priya, 41, venue operations staff (Atlanta)** | Maintain situational awareness across a 71,000-capacity venue | Report volume outpaces her ability to read and prioritize manually |
| **Marcus, 35, mobility-impaired fan (wheelchair user)** | Reach his seat and the restroom without guessing which routes are actually accessible | Static accessible-seating maps are outdated or don't account for temporary obstructions |

### User Stories (representative sample)
- As a fan who doesn't speak English or French, I want to ask a question in my own language and get an answer I trust, so I don't have to rely on guessing or a stranger's translation.
- As a volunteer, I want to report a problem in one tap without deciding first whether it's "serious enough," so I don't hesitate during a real incident.
- As an ops staff member, I want incoming reports already grouped and prioritized, so I'm not reading forty versions of the same bottleneck.
- As a wheelchair user, I want routing that actually reflects which elevators are working right now, not a static accessibility map from the stadium's website.
- As an organizer, I want a single screen that tells me where the risk is concentrated right now, not a log I have to reconstruct myself.

### Jobs To Be Done
- When I'm lost in an unfamiliar stadium, help me get where I'm going without needing to read a language I don't speak.
- When I see something concerning, help me tell the right person fast without deciding first whether it "counts."
- When I'm responsible for thousands of people, help me see the whole picture instead of one report at a time.

### Functional Requirements
1. Fan concierge must support text and voice input, and auto-detect language from the first message.
2. Every fan-facing answer must be renderable in simplified/plain-language form on demand.
3. Routing must support a mobility-accessible mode that excludes non-accessible paths entirely, not just deprioritizes them.
4. Incident reports must be summarized and deduplicated within the target latency window, with a visible confidence/severity indicator.
5. Dispatch suggestions must require explicit human approval before any staff-facing alert is considered "actioned."
6. All role-gated views must be enforced server-side (Firestore security rules + custom claims), not just hidden client-side.
7. The system must degrade to deterministic fallback behavior if the Gemini API call fails or exceeds a latency budget.

### Non-Functional Requirements
- **Performance:** fan concierge first-token latency under 3s on a simulated 4G connection profile.
- **Availability:** core wayfinding (static map + last-known data) must remain usable with zero network connectivity.
- **Accessibility:** WCAG 2.2 AA as the floor, not the ceiling, across both surfaces.
- **Internationalization:** UI chrome (not just AI responses) must support at minimum English, Spanish, French, Portuguese, and Arabic, including RTL layout correctness for Arabic.
- **Security:** no fan PII required for core functionality; anonymous session by default.

### Edge Cases
- Fan asks a question with no valid answer in the current concourse graph (e.g., a gate that doesn't exist) → concierge must say so, not hallucinate a route.
- Two volunteers report contradictory information about the same zone within seconds of each other → summarizer must surface the conflict, not silently pick one.
- Network drops mid-conversation → in-flight message queues and retries; UI shows a clear "reconnecting" state, never a silent failure.
- A fan requests accessible routing to a zone that has no accessible path currently available (e.g., elevator down) → system must say so explicitly and offer the nearest viable alternative, not fail silently.

### Constraints
- Solo developer, 10-day window, Google Antigravity as the primary build environment.
- No access to real stadium infrastructure, sensor data, or FIFA systems — all live data is simulated.
- Demo must be resilient to unreliable conference/presentation Wi-Fi.

### Assumptions
See the Working Assumptions table at the top of this document.

### Failure Modes
| Failure | Impact | Mitigation |
|---|---|---|
| Gemini API latency spike during live demo | Fan concierge feels broken | Deterministic fallback lookup + visible "still thinking" state with a hard timeout |
| Firestore security rule misconfiguration | Role boundary bypass | Security rules unit-tested against the Firebase emulator before every deploy |
| Simulated data feed produces implausible values | Demo credibility damage | Bounded, seeded randomization with sanity-check assertions, not unconstrained random |
| Judges test in a language not fully polished | Weak multilingual impression | Concentrate polish on the 5 demoed languages rather than spreading thin across many |

### Accessibility Requirements
See §9 (Accessibility Strategy) for the full treatment — summarized here as a PRD-level commitment: every fan-facing feature must be accessible-mode compatible before it is considered "done," not after.

### Security/Privacy Requirements
See §12 (Security Strategy) for the full treatment. PRD-level commitment: default to the least data collection that still delivers the feature — anonymous sessions, no persistent PII for core wayfinding.

### Analytics/Telemetry Requirements
- Track (anonymized, session-scoped): query type distribution, language distribution, fallback-trigger rate, incident-to-dispatch latency.
- No analytics event may include free-text fan input verbatim in a way that could re-identify an individual; log query *categories*, not raw transcripts, in any persisted analytics store.

### Rollout Assumptions
This is a competition build, not a production rollout — "rollout" here means demo-day readiness: rehearsed scenario, seeded data reset between test runs, and a documented recovery path if a live component fails mid-demo (see §16 contingency plan).

### Risks and Mitigations
| Risk | Mitigation |
|---|---|
| Scope creep across 18 possible features | Strict P0/P1/P2 discipline from §4; P2 is cut the moment days 8–9 arrive without slack |
| Solo build means no second pair of eyes on security rules | Firestore emulator test suite substitutes for a human reviewer — see §11 |
| Demo-day network failure | Rehearsed offline-degraded fallback path (see PRD Edge Cases + §16 contingency) |

---

## 6. TRD — Technical Requirements & Design Document

### System Design

**Frontend architecture.** Single Next.js (App Router, TypeScript) application, deployed as a PWA, with two route trees sharing one component library and one data layer:
- `/app/(fan)/*` — public, no-auth-required routes (anonymous Firebase session created on load)
- `/app/(ops)/*` — auth-gated routes behind Firebase Auth, role-checked both client-side (UX) and server-side (enforcement)

One codebase, two experiences — this is the literal implementation of "one engine, two doors" from §3, not just a slogan.

**Backend architecture.** Firebase Cloud Functions (Node.js/TypeScript) as the orchestration layer, calling the Gemini API for all generative work and Firestore for all state. No separate server to provision — this is a deliberate 10-day-timeline decision, traded off explicitly in §13.

**AI orchestration architecture.** A thin orchestration layer (`packages/flow-engine`) mediates every model call: it constructs prompts from typed context objects (never raw string concatenation of user input), enforces an allow-listed function-calling schema, and validates model output against a schema before it ever reaches the client. This is the architectural backbone of the prompt-injection defense in §12.

**Data flow (fan query, happy path):**
1. Fan sends text/voice → transcribed if needed → sent to `askConcierge` Cloud Function
2. Function loads session context (language, accessibility mode, last known location) from Firestore
3. Function calls Gemini with the query + context + allow-listed tool schema (route lookup, gate lookup, incident status)
4. Gemini either answers directly or calls a tool; tool calls execute against the deterministic concourse graph, never against arbitrary code
5. Response streamed back to the client; logged (category only, not verbatim) to analytics

**Event flow (incident, happy path):**
1. Volunteer submits report → written to `reports` collection
2. Firestore trigger fires → `summarizeIncident` function calls Gemini to cluster/dedupe against open incidents
3. Result written to `incidents` collection → ops console updates via realtime listener
4. Staff/organizer approves a suggested dispatch action → write to `dispatches` collection (audit-logged, immutable)

**Role-based access model:** Four roles via Firebase custom claims — `fan` (default/anonymous), `volunteer`, `staff`, `organizer` — each mapped to specific Firestore security rules and specific ops-console panel visibility. Role assignment for volunteer/staff/organizer accounts is provisioned out-of-band (seeded for demo), not self-service signup — this is a deliberate security default, not a shortcut.

**Realtime layer:** Firestore's native realtime listeners power both the congestion heatmap and the incident feed. This is a conscious efficiency/complexity trade-off — a dedicated WebSocket/Pub-Sub layer would scale better past demo load but isn't justified inside a 10-day window (see §13).

**Storage and state model:** Firestore as the single source of truth. Key collections: `sessions` (fan, ephemeral, anonymous), `reports` (raw volunteer input), `incidents` (summarized/deduplicated), `dispatches` (audit-logged actions), `concourseGraph` (static routing data, accessibility-tagged), `congestionState` (simulated live zone density).

### AI Architecture

| Component | Purpose | Input/Output Contract | Prompting Strategy | Guardrails | Fallback | Eval Criteria | Latency Sensitivity | Cost Sensitivity |
|---|---|---|---|---|---|---|---|---|
| **Fan Concierge** | Conversational multilingual Q&A + routing | In: query text/voice + session context. Out: structured `{answerText, route?, sources: [toolCalls]}` | System prompt fixes persona + hard scope (stadium-only topics); function-calling schema restricts tool surface | Refuses out-of-scope requests; never invents a gate/route not in the concourse graph | Deterministic nearest-match lookup on API failure/timeout | Golden-set regression (see §11); response grounded in tool output, not free generation | High — user-facing, real-time | High-frequency → routed to a fast/cheap model tier |
| **Accessibility Simplifier** | Rewrite any response in plain language | In: original response text. Out: simplified text, same factual content | Constrained rewrite prompt: preserve facts, cut sentence length/complexity | Output diffed against source facts before display (basic entity-presence check) | Show original text if simplification fails | Human-rated readability spot-check | Medium | Low-frequency → cost is a non-issue |
| **Incident Summarizer** | Cluster/dedupe/prioritize raw reports | In: array of recent reports + open incidents. Out: structured incident cards with severity + confidence | Clustering prompt with explicit schema output (JSON mode), not freeform prose | Output schema-validated before write; malformed output discarded and retried once, then flagged for human review | If Gemini unavailable, reports surface unclustered/unprioritized rather than disappearing | Precision/recall against a hand-labeled synthetic report set | Medium — near-real-time, not instant | Low-frequency → stronger model tier justified |
| **Dispatch Advisor** | Suggest staff/volunteer reallocation | In: incident queue + roster + zone state. Out: ranked suggestions, never an executed action | Explicit "suggest, do not act" system instruction; output is always a proposal object, never a direct write to `dispatches` | Human approval is a required, separate write; advisor has no execution permission at the IAM level, not just the prompt level | If Gemini unavailable, ops staff use the manual incident feed without suggestions | Staff spot-check: "would I have made this call?" | Low — this is a decision-support surface, not instant-response | Low-frequency |

### Google-Aligned Implementation

| Layer | Choice | Why |
|---|---|---|
| Generative AI | Gemini API via Google AI Studio (fast tier for concierge, higher-capability tier for summarization/dispatch) | Fastest path to a working demo in 10 days; Vertex AI is the documented production upgrade path (see below), not required for the build |
| Hosting/Auth/DB | Firebase (Hosting, Auth, Firestore, Cloud Functions) | Single integrated platform minimizes infra glue code — directly serves the 10-day constraint |
| Maps | Google Maps Platform (Maps JS SDK + Directions API) | Used specifically for outdoor arrival and post-match transit/egress routing — **not** for in-stadium concourse navigation, where a custom lightweight schematic graph is more accurate (see below) |
| Observability | Firebase Performance Monitoring + Cloud Logging | Built into the same platform, zero extra provisioning |

**A deliberate, non-obvious choice worth stating explicitly:** in-stadium wayfinding does **not** use Google Maps. No consumer mapping product has concourse-level, gate-level indoor routing data for a stadium. Matchflow uses a custom, hand-authored graph (`concourseGraph` in Firestore — zones, gates, restrooms, elevators as nodes; walkable/accessible paths as edges) rendered as a lightweight SVG schematic, in the same tradition as an airport terminal map. Google Maps handles what it's actually good at: getting a fan *to* the stadium and *away* from it afterward. Conflating the two would be a credibility problem, not a feature.

### APIs, Services & Data

**Core data entities:** `Session`, `Report`, `Incident`, `Dispatch`, `ConcourseNode`, `ConcourseEdge`, `CongestionZone`, `UserRole`.

**High-level schema (illustrative, not exhaustive):**
- `ConcourseNode { id, type: gate|restroom|concession|exit|seatingBlock, zone, accessibilityTags: [elevatorAdjacent, rampAccess, accessibleSeating] }`
- `ConcourseEdge { fromNodeId, toNodeId, walkTimeSeconds, accessible: boolean }`
- `CongestionZone { zoneId, densityScore (0–1), lastUpdated, trend }`
- `Incident { id, sourceReportIds: [], summary, severity, confidence, status, zoneId }`
- `Dispatch { id, incidentId, suggestedBy: "ai"|"human", approvedBy, status, timestamp }`

**External data needs:** none required for the demo to function — this is by design. Real host-city/stadium names (per §2's verified 16-venue list) are used for narrative grounding; all live-condition data (congestion, incidents) is simulated.

**Mock data strategy:** a seeded, bounded random-walk generator drives `CongestionZone.densityScore` per zone on a fixed tick interval, with occasional scripted "spike" events tied to the rehearsed demo scenario (see §16) so the live demo is reproducible, not purely random.

**Realtime event ingestion assumptions:** in a production deployment, this tick would be replaced by an actual sensor/turnstile feed; the simulation layer is architected as a swappable module specifically so that replacement doesn't touch the Flow Engine's consuming logic.

### Security Architecture

See §12 for the full standalone treatment (threat model, attack surfaces, abuse prevention). Summarized here as the TRD-level implementation:
- **AuthN/AuthZ:** Firebase Auth + custom claims; Firestore security rules enforce role checks server-side on every read/write, not just in UI logic.
- **Prompt injection defense:** user input is never concatenated directly into a system-level instruction; it's passed as a delimited user-turn message, and all model-initiated actions are restricted to an allow-listed function schema with no arbitrary code or query execution path.
- **Secrets handling:** Gemini API keys and Firebase service credentials live in Google Secret Manager / Cloud Functions environment config — never in client bundles or committed source.
- **Logging safety:** raw fan query text is never persisted to long-lived analytics; only query category and outcome are logged.

### Performance / Efficiency

See §13 for the full standalone treatment. Summarized here as the TRD-level implementation: model routing by task criticality (fast/cheap tier for high-frequency fan chat, stronger/slower tier for low-frequency summarization and dispatch), Firestore-native caching of the static concourse graph (it rarely changes within a match day), and a hard client-side timeout with deterministic fallback on every Gemini call so a slow model response never blocks the UI indefinitely.

---

## 7. UI/UX Design System and Experience Blueprint

The brief for this challenge is explicit that a generic AI-dashboard aesthetic is a loss condition. The direction below is chosen to be premium, football-native, and cinematic — while every specific choice is also traceable to an accessibility or usability requirement, because a design that's beautiful but fails WCAG loses on a *different* rubric line.

### Visual Direction

**Theme: "Night Match."** Dark-mode-first, built around the specific visual language of a floodlit night fixture — not a generic dark-mode SaaS palette. This is a deliberate choice on three grounds: (1) most marquee World Cup matches are evening kickoffs under floodlights, so it's period-accurate rather than decorative; (2) it's genuinely *more* usable for an ops console staff will stare at for hours in a dim control room, and for fans checking their phone in a shaded concourse or a dark tunnel; (3) it reads as broadcast-grade rather than "generic AI dashboard."

**Moodboard direction, in words:** the deep navy-black of a stadium bowl at night · the warm amber wash of floodlights hitting the pitch · scoreboard-grade geometric type · the fine white linework of a pitch marking, reused as UI structure · glass and glow rather than flat fill — surfaces that feel lit from within, not painted on.

**Color palette:**

| Role | Direction | Usage |
|---|---|---|
| Base / background | Near-black navy (deep, slightly cool, not pure #000) | App background, ops console base |
| Surface | Elevated navy-charcoal, subtle glass/blur on cards | Cards, panels, modals |
| Primary accent — "Floodlight Amber" | Warm gold/amber | Primary CTAs, active states, the concierge's "listening/thinking" glow |
| Secondary accent — "Pitch Green" | Saturated grass green | Success states, "all clear" zone status, accessible-route confirmation |
| Semantic — alert | Warm red, always paired with an icon and text label, never color-only (per accessibility requirement) | Incident severity, congestion warnings |
| Text — primary | Near-white, warm-tinted (not stark #FFF, reduces glare) | Body and heading text |
| Text — secondary | Muted warm gray, contrast-checked against navy base to maintain 4.5:1+ | Captions, metadata |

All semantic color pairs (success/warning/alert) ship with a matching icon and text label by default — color is never the sole carrier of meaning, per the WCAG "don't convey info by color alone" requirement.

**Typography strategy:** a two-family pairing chosen for distinctiveness *and* multilingual/legibility performance — not just aesthetics:
- **Display — Space Grotesk.** A geometric, slightly technical grotesk with real presence at large sizes; evokes stadium signage and scoreboard type without being a literal scoreboard-digit cliché. Used for headlines, section titles, and the Matchflow wordmark.
- **Body/UI — Inter.** Chosen specifically for its extensive script coverage and proven legibility at small sizes across languages — critical given the 5-language demo requirement and the accessibility floor of body text ≥16px, 1.5 line-height.

**Layout system:** 8px spacing rhythm throughout (4/8/16/24/32/48 scale), mobile-first breakpoints for the fan surface, wider data-dense grid for the ops console. No fixed-pixel container widths — everything is responsive down to a single-hand phone width.

**Iconography:** a single consistent stroke-based icon family (Lucide — free, comprehensive, theme-able), 1.5–2px stroke weight throughout, one style (outline) per hierarchy level. No emoji as functional icons anywhere in the product — emoji render inconsistently across platforms and can't be theme-tokenized.

**Motion philosophy:** motion conveys state change, never decoration for its own sake. A "floodlight sweep" micro-interaction (a soft light gradient pass) marks the concierge actively "listening" or "thinking" — this is the one signature motion moment; everything else is restrained, 150–300ms, standard easing. `prefers-reduced-motion` is respected everywhere: animations reduce to instant or near-instant state changes when requested, no exceptions.

**Lighting / depth / glass / gradient / texture direction:** subtle glass-panel elevation (blurred, semi-transparent navy surfaces) rather than hard drop shadows; a soft amber glow behind key live numbers (congestion score, incident count) to draw the eye without relying on color alone; a very light grain/noise texture on large background fields to avoid the flat, sterile look of a template dashboard.

**Stadium-inspired motifs:** faint pitch-marking linework reused as section dividers and background structure; the concourse-schematic map style (clean, architectural, slightly technical) as a recurring visual language that ties the fan map and the ops heatmap together visually — reinforcing "one engine" even in the visual system, not just the backend.

**Hero treatment:** the fan landing screen opens on a full-bleed, softly animated floodlight-glow gradient over a dark navy field, with the Matchflow wordmark in Space Grotesk and a single, immediate action — language + accessibility mode selection — rather than a marketing-style scroll. First interaction within one screen, not five.

**Depth aesthetic:** restrained 3D/depth cues — soft elevation and glow rather than literal 3D renders — appropriate for a tool that has to remain fast and accessible, not a showcase piece that sacrifices performance for spectacle.

### UX Coverage

**Information architecture:** two top-level trees (Fan / Ops) sharing zero navigation chrome, because they're genuinely different products wearing the same visual system. Fan IA is flat (3 primary destinations max); Ops IA is role-filtered (a volunteer sees a subset of what a staff member sees, who sees a subset of what an organizer sees).

**Navigation model:** Fan surface uses a persistent bottom action bar (Ask / Map / Alerts) — thumb-reachable, ≤5 items per the touch-target navigation guideline. Ops surface uses a persistent left rail (desktop) collapsing to a bottom bar (mobile/tablet, since staff and volunteers are often on the move).

**Role-based UX differences:** Volunteers see a single-purpose "report" flow and their own report history. Staff see the full incident feed and dispatch suggestions. Organizers see the aggregated health overview plus everything staff can see. The UI literally has less on it for a volunteer — this is a usability decision, not just an access-control one: less surface area under stress is safer, not just simpler.

**Onboarding:** one screen — language auto-suggested from device locale, accessibility mode opt-in, no account creation required for fans. Ops accounts are pre-provisioned (see §12), so ops onboarding is a standard authenticated login, not a signup flow.

**Landing flow:** fan → language/accessibility screen → home. Ops → login → role-appropriate console, no landing page in between.

**Dashboard structure (ops):** top strip = live venue health summary (congestion, open incidents, dispatch status); left/main = incident feed (severity-sorted); right = heatmap. Every panel is a live Firestore listener, no manual refresh.

**Match-day experience:** a persistent, deliberately minimal context strip (kickoff time, current period, gates status) on the fan surface — deterministic, not AI-generated, because this is exactly the kind of fact that shouldn't be left to a language model.

**Real-time alert UX:** fan-facing alerts (e.g., "your planned exit is now congested") are non-blocking toasts with a one-tap reroute action — never a modal that stops the user mid-task. Ops-facing incident alerts are persistent list items with clear severity coding (icon + color + text), never a transient toast that could be missed.

**AI assistant interactions:** the concierge is presented as a conversation, but every response that involves a route or fact is grounded and shows *why* (e.g., "via Gate C — Gate B is congested right now"), not just an answer with no visible reasoning. This is both a trust feature and a subtle Testing/Security signal — outputs are traceable to tool calls, not opaque generation.

**Fan navigation flow, accessibility flow, volunteer flow, ops control flow:** each detailed as full end-to-end journeys in §8.

**Empty states:** no incidents = a calm, explicitly reassuring "All zones normal" state with the live congestion heatmap still visible (not a blank screen implying the feature is broken).

**Error states:** every error names what happened and offers a next action ("Couldn't reach Matchflow — showing last known map" + retry), never a bare error code or silent failure.

**Offline/poor-network behavior:** the static concourse map, last-known gate/zone data, and cached UI shell all work fully offline (see PRD Edge Cases and Offline-Degraded Mode in §4); the AI concierge clearly states when it's unavailable rather than hanging indefinitely.

### Screen-by-Screen Inventory

| Screen | Purpose | Key Components | AI Interactions | Mobile/Desktop | Accessibility Notes |
|---|---|---|---|---|---|
| **Landing / Hero (Fan)** | First-touch language + accessibility setup | Wordmark, language selector, accessibility mode toggle | None — deterministic setup | Mobile-first, single column | Screen-reader labeled controls; large touch targets |
| **Fan Home** | Match-day context + entry point to core actions | Context strip, 3 quick actions (Ask/Map/Alerts), recent activity | Surfaces AI-suggested "you might need" prompt based on time-to-kickoff | Mobile-first | High-contrast mode toggle always visible, not buried |
| **Stadium Navigation Assistant** | Core conversational wayfinding | Chat thread, voice input button, inline route cards | Full concierge — text/voice, function-calling into routing | Mobile primary, works on desktop for demo/judge testing | Captioned voice responses; keyboard-navigable chat history |
| **Live Crowd Heatmap / Routing View** | Visualize congestion, choose a route | Concourse schematic, zone density overlay, route overlay | Route re-scoring reacts live to congestion state | Both — richer detail on desktop/ops, simplified on fan mobile | Color+icon+text zone status, never color alone |
| **Transportation / Exit Planning** | Post-match egress + transit choice | Exit recommendation card, transit vs. rideshare comparison | AI ranks options by live egress-zone density + transit status | Mobile-first | Text alternative to any map-only information |
| **Multilingual Assistant Interface** | Language switching, voice/text toggle | Language picker (5 demoed languages, extensible), input mode toggle | Auto-detects language; manual override always available | Mobile-first | RTL layout correctness verified for Arabic |
| **Accessibility Support Hub** | Central accessible-mode controls | Mobility-routing toggle, high-contrast toggle, simplified-language toggle, text size control | Simplifier available inline on any prior response | Mobile-first | This screen is itself a WCAG AA reference implementation |
| **Volunteer Command Center** | Fast, low-friction incident reporting | One-tap report categories + free-text field, "my reports" history | AI classifies/tags free-text on submit | Mobile-first (volunteers are standing, moving) | Large touch targets; works one-handed |
| **Venue Ops Dashboard** | Main staff/organizer live overview | Health summary strip, incident feed, heatmap panel | Aggregates all AI-summarized signals | Desktop-primary, functional on tablet | Full keyboard navigation; screen-reader landmark regions |
| **Incident Intelligence Panel** | Deep-dive on a specific incident | Source reports, AI summary, severity/confidence, dispatch suggestion + approve action | Summarization + dispatch advisor live here | Desktop-primary | Every AI suggestion labeled as a suggestion, never implied as automatic |
| **Sustainability / Queue Optimization View** | Post-match transit-nudging, queue state | Transit capacity indicator, "greener route" suggestion | AI weighs speed vs. transit-friendliness | Mobile (fan-facing) | Plain-language rationale, not just a badge |
| **Admin / Organizer Control Surface** | Aggregated cross-zone view, role management | Zone-by-zone summary, staff roster/location, audit log access | Highest-level aggregation of all AI signals | Desktop-primary | Full audit trail is itself screen-reader accessible, not an image/export-only view |

---

## 8. End-to-End User Flows

Each flow: trigger → steps → AI touchpoints → failure points → recovery path → UX rationale.

### 1. Fan Arriving at the Stadium
- **Trigger:** Fan opens Matchflow for the first time near the venue.
- **Steps:** Landing screen → language auto-suggested from locale (confirm/change) → accessibility mode opt-in → Fan Home with live match-day context strip → quick-action prompt ("Need your gate?").
- **AI touchpoints:** none in setup (deliberately deterministic); AI-suggested quick action on Home based on time-to-kickoff.
- **Failure points:** wrong language auto-detected; poor connectivity on arrival (dense crowd near entry).
- **Recovery:** one-tap language override always visible; offline shell loads from cache if network fails.
- **UX rationale:** the highest-stakes moment for trust is the first 10 seconds — zero friction, zero account creation, immediate usefulness.

### 2. Fan Needing Navigation / Food / Gate / Restroom / Seat Help
- **Trigger:** Fan taps "Ask" or a quick action.
- **Steps:** Query (text/voice) → concierge resolves via function-calling → route card with rationale → optional "start walking" live-tracking mode.
- **AI touchpoints:** full concierge pipeline — intent parsing, tool-calling, response grounding.
- **Failure points:** ambiguous query ("bathroom" — which one, nearest to what); no valid route found.
- **Recovery:** concierge asks one clarifying question rather than guessing; explicit "no route found" message with nearest alternative, never a hallucinated answer.
- **UX rationale:** grounding every answer in a visible tool call (§7) builds trust fast — critical for a first-time user in an unfamiliar building.

### 3. Fan Needing Multilingual Support
- **Trigger:** Fan types or speaks in a non-English language.
- **Steps:** Language auto-detected mid-conversation if it changes → concierge responds in kind → manual override available anytime.
- **AI touchpoints:** language detection + generation in the detected language, grounded in the same tool-calling pipeline as English.
- **Failure points:** code-switching mid-message; a demoed language edge case not fully covered.
- **Recovery:** manual language selector always one tap away; simplified-language mode as a fallback for a partially-understood answer.
- **UX rationale:** language support has to feel like a non-event, not a "mode" the fan has to discover and activate.

### 4. Disabled Attendee Requiring Accessible Routing
- **Trigger:** Fan enables mobility-accessible mode (onboarding or Accessibility Hub).
- **Steps:** All subsequent routing requests filter the concourse graph to accessible-tagged edges only → route explicitly confirms accessibility (elevator/ramp status) rather than assuming.
- **AI touchpoints:** concierge pipeline identical to standard routing, but constrained to the accessible-edge subgraph.
- **Failure points:** the only accessible path to a destination is currently obstructed (e.g., elevator down in the simulated state).
- **Recovery:** system states this explicitly and offers the nearest accessible alternative — it never silently returns a non-accessible route because it "couldn't find" an accessible one.
- **UX rationale:** the PRD commitment in §5 — accessible mode is a first-class path, not a degraded one — has to hold even in the failure case, or it's not really first-class.

### 5. Volunteer Receiving Task Guidance
- **Trigger:** Volunteer observes something during a shift.
- **Steps:** Open Volunteer Command Center → one-tap category or free-text report → immediate confirmation the report was received → optional follow-up if AI classification needs clarification.
- **AI touchpoints:** classification/tagging on submit; clustering against existing incidents happens server-side, invisible to the volunteer.
- **Failure points:** volunteer unsure whether something is "worth" reporting; connectivity drop mid-report.
- **Recovery:** UI copy explicitly normalizes low-threshold reporting ("not sure? report it anyway"); reports queue locally and retry on reconnect.
- **UX rationale:** the entire value of the volunteer network as a sensor grid depends on removing hesitation — friction here has a direct safety cost.

### 6. Operations Manager Responding to Congestion or Incident
- **Trigger:** New incident card appears in the feed, or congestion crosses a threshold on the heatmap.
- **Steps:** Staff opens Incident Intelligence Panel → reviews AI summary + source reports → reviews dispatch suggestion → approves, edits, or dismisses.
- **AI touchpoints:** summarization/deduplication (already complete by this point), dispatch advisor suggestion.
- **Failure points:** AI suggestion is a poor fit for the actual situation (roster location was stale, for example).
- **Recovery:** staff can dismiss or manually reassign — the suggestion is always editable, never a forced action; this is a hard architectural constraint (§6), not just a UI affordance.
- **UX rationale:** trust in a decision-support tool depends entirely on it being genuinely overridable, visibly and easily.

### 7. Organizer Monitoring Stadium Health in Real Time
- **Trigger:** Ongoing, passive — organizer keeps the Admin Control Surface open throughout the match.
- **Steps:** Aggregated health view updates live → organizer drills into any zone or incident for detail → reviews audit log as needed.
- **AI touchpoints:** aggregation of all summarization/heatmap signals; no separate AI call at this level.
- **Failure points:** signal overload if incident volume spikes simultaneously.
- **Recovery:** severity-based sorting keeps the most urgent items at the top regardless of volume; the health summary strip stays legible even when the detailed feed is busy.
- **UX rationale:** an organizer's job is situational awareness, not task execution — the UI has to support long, low-intensity glancing rather than constant interaction.

### 8. Post-Match Exit Flow and Transport Coordination
- **Trigger:** Match ends (or fan manually opens the Transportation screen pre-emptively).
- **Steps:** Fan is prompted with an exit + transit recommendation → can compare against rideshare → confirms and gets live-updating directions to the chosen exit.
- **AI touchpoints:** ranks exit/transit options against live simulated egress-zone density and transit status.
- **Failure points:** everyone gets the same "best" recommendation simultaneously, creating a new bottleneck.
- **Recovery:** recommendations are re-scored on a short interval and intentionally diversified across viable near-equivalent options rather than funneling all fans to a single "best" exit.
- **UX rationale:** this is the clearest place where Sustainability and Transportation intersect — the system actively spreads load rather than just reporting it.

---

## 9. Accessibility Strategy

Accessibility is a judged rubric line, not just a feature category — treated here as a first-class pillar with the same rigor as Security.

| Area | Commitment |
|---|---|
| **WCAG target** | 2.2 AA as the floor across both surfaces, verified with automated tooling (axe-core in CI, see §11) and manual spot checks, not asserted without evidence |
| **Keyboard navigation** | Full tab-order coverage on both surfaces; logical order matches visual order; no keyboard traps in modals or the chat interface |
| **Screen reader support** | Semantic HTML and ARIA landmarks throughout; every icon-only control has an accessible label; chat responses are announced as they stream, not just after completion |
| **Color contrast** | 4.5:1 minimum for body text, 3:1 for large text and UI glyphs, verified against the Night Match palette specifically (dark theme contrast failures are common and checked explicitly, not assumed safe because "dark mode looks fine") |
| **Motion sensitivity** | `prefers-reduced-motion` respected everywhere; the signature "floodlight sweep" interaction has a static equivalent |
| **Captioning / translation / voice** | Every voice response ships a synchronized visible transcript — voice is additive, never voice-only; 5 languages fully supported at demo time with an architecture that doesn't hardcode language count |
| **Easy-read / simplified-language mode** | On-demand rewrite of any response into short-sentence, plain-vocabulary form, available inline without leaving the conversation |
| **High-contrast / low-stimulation variant** | A distinct theme mode — not just "turn up contrast" but also reduced animation density and simplified visual hierarchy, aimed at both vision-impaired and neurodivergent/migraine-sensitive users |
| **Mobility-accessible routing** | First-class routing mode filtering to accessibility-tagged concourse edges, with explicit failure messaging rather than silent fallback (see Flow 4 in §8) |
| **Hearing impairment support** | Captioned voice output (above); no feature is exclusively audio-only anywhere in the product |
| **Visual impairment support** | Screen reader support (above) + high-contrast mode + no information conveyed by color alone |
| **Cognitive load reduction** | Volunteer UI deliberately shows less, not more (§7); simplified-language mode; grounded/explained AI answers rather than opaque responses that require the user to just "trust it" |

**How the design stays premium while staying accessible:** the Night Match visual system was chosen *because* its core moves — high-contrast warm-on-navy text, restrained motion, icon+text+color redundancy — are accessibility requirements first and aesthetic choices second. This isn't a "premium version" and an "accessible version" of the product; there is one version, and the constraints of accessibility shaped what "premium" means here (broadcast-legible from a distance, usable one-handed, readable in direct sun or a dark tunnel) rather than being layered on afterward.

---

## 10. Code Quality Strategy

**Monorepo structure:**
```
matchflow/
├── apps/
│   ├── web/                 # Next.js app — fan + ops routes
│   └── functions/           # Firebase Cloud Functions
├── packages/
│   ├── flow-engine/         # Shared orchestration: prompt construction, tool schemas, model calls
│   ├── concourse-graph/     # Routing/pathfinding logic — pure functions, framework-agnostic
│   ├── ui/                  # Shared component library (fan + ops)
│   └── types/               # Shared TypeScript types/interfaces across all packages
├── firestore.rules
├── firestore.indexes.json
└── firebase.json
```

**Frontend folder structure (within `apps/web`):** feature-based, not type-based — `features/concierge/`, `features/heatmap/`, `features/incidents/`, etc., each owning its own components, hooks, and tests, rather than a single sprawling `components/` folder.

**Naming conventions:** PascalCase components, camelCase functions/variables, `use*` prefix strictly reserved for hooks, Cloud Functions named as verbs (`askConcierge`, `summarizeIncident`, `suggestDispatch`) matching the event-flow names used throughout this document — a deliberate choice so the code and this spec stay traceable to each other.

**Component design philosophy:** presentational components stay pure (props in, JSX out); all Firestore/Gemini interaction lives in hooks or the `flow-engine` package, never inline in a component body. This is what makes the AI-behavior testing in §11 possible at all — logic that isn't tangled into JSX can be unit-tested directly.

**Reusability strategy:** the `ui` package is shared between fan and ops surfaces deliberately — a `<SeverityBadge>` or `<RouteCard>` built once for one surface is available to the other, reinforcing the "one engine, two doors" principle in the codebase itself, not just the architecture diagram.

**State management:** React Query (or SWR) for all Firestore-derived server state — no separate global client-state store is justified at this scope; local component state (`useState`) for pure UI state only.

**API contract hygiene:** every Cloud Function has a typed request/response interface exported from `packages/types`, imported by both the function and the client — a contract change that breaks the client is a compile error, not a runtime surprise.

**Type safety strategy:** TypeScript strict mode across the entire monorepo, no `any` without an inline justification comment; Gemini's structured/JSON-mode output is runtime-validated (e.g., with Zod) against the same types before being trusted, since a model output isn't automatically type-safe just because a TypeScript interface exists for it.

**Error handling standards:** every Cloud Function returns a typed `{success, data}` or `{success: false, error: {code, message}}` shape — no bare thrown strings, no silently swallowed errors; client-side, every async boundary has an explicit loading/error/success state (see §7 error-state UX).

**Logging standards:** structured logging (Cloud Logging) with consistent fields (`userId` omitted for fans by default, `sessionId`, `functionName`, `latencyMs`, `outcome`) — see §12 for what is deliberately never logged.

**Linting / formatting / CI quality gates:** ESLint + Prettier enforced pre-commit; CI blocks merge on lint failure, type error, or failing test — see §11 for the full CI test matrix.

**Documentation standards:** every package has a README explaining its role in the "one engine, two doors" architecture; every Cloud Function has a doc-comment stating its contract, not just its implementation.

**PR checklist (even for a solo build — self-review discipline substitutes for a second reviewer):**
- [ ] Does this touch a Firestore security rule? If so, is there an emulator test for it?
- [ ] Does this touch AI-generated output? If so, is it schema-validated before use?
- [ ] Does this add a fan-facing feature? If so, does it work in accessible/simplified mode?
- [ ] Does this add a new dependency? Is it justified given the 10-day budget?

**What excellent code quality looks like for this project, specifically:** not "clever" code — code where a judge reading `packages/flow-engine` for five minutes can see exactly how a fan question becomes a grounded answer, and where a judge reading `firestore.rules` can see exactly why a volunteer can't read an organizer's audit log.

---

## 11. Testing Strategy

| Test type | What it covers | Priority |
|---|---|---|
| **Unit tests** | `concourse-graph` pathfinding (including accessible-edge filtering), summarization output schema validation, dispatch-suggestion ranking logic | P0 — highest ROI, fully deterministic, fast to write |
| **Integration tests** | Firestore security rules via the Firebase emulator (role X cannot read/write collection Y) | P0 — this is the direct evidence behind the Security score, not just an assertion |
| **End-to-end tests** | Fan asks a question → receives a grounded route (Playwright, scripted against seeded data) | P1 |
| **AI behavior tests** | Golden-set of ~30 representative fan queries per demoed language, checked for: grounded (not hallucinated) route references, appropriate refusal on out-of-scope questions | P0 |
| **Prompt regression tests** | Re-run the golden set on every change to the concierge system prompt; flag any answer that newly diverges from the expected tool-call pattern | P1 |
| **Security tests** | Attempted role-escalation via direct Firestore calls (bypassing the UI); attempted prompt injection via a report's free-text field | P0 |
| **Accessibility tests** | Automated: axe-core scan on every screen in CI. Manual: full keyboard-only pass, screen reader pass (VoiceOver/NVDA) on the core concierge and reporting flows | P0 |
| **Performance tests** | Simulated concurrent-session load against Cloud Functions (order of magnitude: hundreds of concurrent fan sessions) to sanity-check latency under load | P1 |
| **Failure injection tests** | Force Gemini API timeout/error and confirm deterministic fallback fires correctly, every time | P0 — directly tests the fallback promise made throughout this document |
| **Mock data testing** | Confirm the seeded congestion/incident simulator produces bounded, plausible values across its full random range, not just the happy path | P1 |
| **Demo-day smoke tests** | A short, scripted pass through the exact rehearsed demo scenario, run immediately before presenting | P0 |

**What to test first:** the concourse-graph pathfinding and the Firestore security rules — both are fully deterministic, fast to write, and directly underpin two separate rubric criteria (Testing itself, and Security).

**How to simulate stadium conditions:** the seeded random-walk congestion generator (§6) doubles as a test fixture — the same seed used in automated tests can be replayed live for the demo, so "tested" and "demoed" are the same code path, not two divergent ones.

**How to test AI outputs safely:** never assert exact string equality on model output (models don't produce identical text twice); instead assert on structure (did it call the expected tool?), grounding (does the cited route/gate actually exist in the concourse graph?), and refusal behavior (does it correctly decline an out-of-scope question?).

**What automated checks run in CI:** lint → type-check → unit tests → Firestore emulator integration tests → axe-core accessibility scan → AI golden-set regression (non-blocking warning, since model output has some inherent variance) → build.

---

## 12. Security Strategy

**Threat model (top scenarios considered):**
1. A malicious or careless volunteer report contains text designed to manipulate the summarizer's behavior (prompt injection via user-generated content).
2. An unauthenticated actor attempts to read or write ops-only Firestore collections directly, bypassing the UI entirely.
3. A fan's conversation history or query content is exposed in a way that re-identifies them.
4. An ops account's credentials are compromised, and the attacker attempts to trigger unauthorized dispatch actions.
5. API keys or service credentials are exposed via client bundle inspection.

**Attack surfaces:** the public fan-facing Cloud Functions (highest exposure, no auth required by design), the Firestore database (mitigated by security rules, not obscurity), the Gemini API integration (mitigated by the allow-listed function-calling architecture in §6), and the ops authentication flow.

**User data classification:**
| Data | Classification | Handling |
|---|---|---|
| Fan session (anonymous) | Low sensitivity | Ephemeral, no PII required, short retention |
| Fan query content | Medium sensitivity (could reveal location/health context, e.g., accessibility needs) | Never persisted verbatim to analytics; category-only logging |
| Volunteer/staff/organizer identity | Higher sensitivity | Authenticated, role-scoped, standard Firebase Auth handling |
| Incident/dispatch records | Operationally sensitive | Role-gated read access; immutable audit trail |

**Admin vs. public boundaries:** enforced at the Firestore security-rule layer (server-side), never trusted to client-side route protection alone — a judge inspecting the code should be able to verify this directly in `firestore.rules` rather than taking a UI screenshot's word for it.

**Model misuse risks:** the Dispatch Advisor is architected so it has no execution permission at the IAM/security-rule level — even a fully "jailbroken" prompt cannot cause it to directly trigger a dispatch, because the write path to the `dispatches` collection requires a separate, human-originated authenticated action. This is a structural guarantee, not a prompt-level promise.

**Prompt injection and hallucination controls:** user input (fan queries, volunteer report text) is always passed as a delimited user-turn message, never concatenated into system-level instructions; the model's tool-calling surface is allow-listed and schema-validated, so even a successfully "injected" instruction has no arbitrary action available to take; hallucination is constrained by grounding every route/gate reference in an actual tool call against the concourse graph, not free generation.

**Moderation / abuse handling:** rate limiting (below) plus a lightweight content check on free-text volunteer reports before they reach the summarizer, flagging clearly abusive/off-topic input for human review rather than silently processing it.

**Incident logging:** every dispatch suggestion and every human approval/dismissal is written to an immutable, timestamped record — this is the audit trail an organizer can review after the fact.

**Auth session protection:** standard Firebase Auth session handling; ops sessions time out after a period of inactivity given the sensitivity of the console.

**Rate limiting:** per-session rate limits on `askConcierge` calls to prevent both cost abuse and a crude denial-of-service vector against the Gemini API quota.

**Secrets management:** all API keys and service credentials in Google Secret Manager / Cloud Functions environment configuration — never in client-side code or committed to the repository; this is verified in CI via a basic secret-scanning check.

**Data retention:** fan session data expires quickly by default (no long-term need once a match day ends); incident/dispatch records persist for the demo's operational purposes but contain no unnecessary fan PII in the first place, because the design goal was never to need it.

**Privacy-safe analytics:** category-level telemetry only (see PRD §5) — the analytics pipeline is designed so that even a full database export couldn't reconstruct an individual fan's verbatim conversation.

---

## 13. Efficiency Strategy

**Model selection strategy:** two Gemini tiers, chosen by task criticality, not uniformly:
- **Fast tier** — Fan Concierge (high-frequency, latency-critical, user is actively waiting)
- **Higher-capability tier** — Incident Summarization and Dispatch Advisor (lower-frequency, latency-tolerant, quality of judgment matters more than milliseconds)

**Model routing by task criticality:** this two-tier split is the single biggest efficiency lever in the system — it means the majority of API calls (fan chat, by volume) run on the cheapest, fastest path, while the calls that actually need deeper reasoning (summarizing conflicting reports, ranking a dispatch decision) are the minority of calls, where a slower/stronger model is affordable.

**Token optimization:** system prompts are fixed and short; per-turn context includes only the current session's relevant state (not full conversation history re-sent unnecessarily), and tool-call results are summarized before being fed back into the next turn rather than passing raw data structures.

**Caching:** the static `concourseGraph` (gates, zones, accessibility tags) is cached client-side after first load — it changes essentially never within a match day, so re-fetching it per query is pure waste.

**Precomputation opportunities:** the accessible-edge subgraph is precomputed once per venue configuration rather than filtered at request time on every accessible-mode query.

**Async vs. sync task split:** fan concierge responses are synchronous/streamed (user is waiting); incident summarization is async, triggered by a Firestore write, with the ops console updating via listener rather than polling.

**Summarization pipelines:** incoming reports are batched on a short interval rather than triggering a fresh summarization call per individual report — this bounds API call volume during a genuine surge (e.g., many volunteers reporting the same event within seconds) instead of letting it scale linearly with report count.

**Streaming UX:** the fan concierge streams tokens as they're generated, so perceived latency (time-to-first-token) is what's optimized for the demo, not just total completion time.

**Graceful degradation when data is missing:** every AI-dependent feature has a defined, tested (§11) deterministic fallback — this document treats "the model is slow or down" as an expected condition to design for, not an edge case to hope never happens.

**Keeping latency low during match-day spikes:** the batched summarization approach above is specifically a spike-mitigation design, not just a general optimization — the failure mode this prevents is exactly the halftime/full-time surge named in §2.

---

## 14. Problem Statement Alignment Matrix

| Feature | Challenge Requirement(s) | Target User | GenAI Usage | Operational Value | Judging Impact |
|---|---|---|---|---|---|
| Conversational Wayfinding | Navigation, Multilingual Assistance | Fans | Full generative concierge, function-calling | Reduces staff burden of directions requests | Problem Alignment, Accessibility |
| Live Congestion-Aware Rerouting | Navigation, Crowd Management | Fans | Route re-scoring against live signal | Reduces bottleneck severity in real time | Problem Alignment, Efficiency |
| Incident Intelligence Feed | Operational Intelligence, Real-Time Decision Support | Staff, Organizers | Summarization, deduplication | Faster, more accurate situational awareness | Problem Alignment, Efficiency |
| Dispatch Advisor | Real-Time Decision Support, Operational Intelligence | Staff, Organizers | Suggestion generation (human-approved) | Faster response without removing human judgment | Problem Alignment, Security |
| Volunteer One-Tap Reporting | Operational Intelligence | Volunteers | Classification/tagging | Turns informal observation into structured signal | Problem Alignment |
| Post-Match Transit/Egress Planner | Transportation, Sustainability | Fans | Ranks options against live + transit data | Reduces exit-congestion severity, nudges toward transit | Problem Alignment |
| Multilingual Conversational Concierge | Multilingual Assistance, Accessibility | Fans | Auto-detected multilingual generation | Removes language as an access barrier | Problem Alignment, Accessibility |
| Accessibility Simplifier | Accessibility | Fans | Constrained rewrite | Reduces cognitive load, supports non-native readers | Accessibility |
| Mobility-Accessible Routing Mode | Accessibility, Navigation | Fans | Constrained pathfinding over AI-agnostic graph | Genuine independence for mobility-impaired fans | Accessibility |
| Role-Based Ops Console | Operational Intelligence | Staff, Volunteers, Organizers | None (deterministic RBAC) | Right information to the right role, nothing more | Security |
| Live Congestion Heatmap | Crowd Management, Operational Intelligence | Staff, Organizers, Fans | Visualization of live signal | Spatial situational awareness | Problem Alignment |

## 15. Build Plan / Implementation Roadmap

Fit to the actual 10-day window.

### Phase 0 — Concept Lock (Day 0)
- Antigravity project scaffold (monorepo structure from §10), Firebase project provisioned, Gemini API access confirmed.
- Concourse graph authored for one representative demo venue (a real host stadium from §2's list, chosen for a clear, demoable concourse shape).
- **Risk area:** none yet — this phase is pure setup.

### Phase 1 — MVP (Days 1–3)
- Core Flow Engine: concourse graph pathfinding, basic congestion simulation.
- Fan Concierge: text-only, English-only, grounded routing (no multilingual/voice yet).
- Ops console skeleton: incident feed and heatmap rendering against mocked (not yet AI-summarized) data.
- Firebase Auth + RBAC skeleton for the four roles.
- **What's mocked:** AI summarization (raw reports shown unprocessed), dispatch suggestions (not yet built).
- **Dependencies:** concourse graph must exist before routing can be tested.
- **Risk area:** underestimating concourse-graph authoring time — this is the one piece with no shortcut, since it has to actually represent a real venue's logic.

### Phase 2 — Polished Competition Build (Days 4–7)
- Gemini integration goes live: concierge grounding, incident summarization/deduplication, dispatch advisor.
- Multilingual support (5 languages) and voice input added to the concierge.
- Accessibility modes fully implemented (mobility routing, high-contrast, simplified-language) across both surfaces.
- Design system (§7) fully applied — this is where "generic dashboard" risk is eliminated.
- **What's mocked:** still no real sensor data — congestion simulation remains seeded/bounded random-walk, now tied to the specific demo scenario script (§16).
- **Risk area:** multilingual polish spread too thin — mitigated by the explicit 5-language scope decision in the Working Assumptions rather than an open-ended "supports many languages" claim.

### Phase 3 — Advanced Differentiators (Days 8–9)
- Sustainability/transit-nudging polish, offline-degraded mode, testing suite completion (§11 full matrix), security hardening pass (§12 threat-model verification).
- Automated accessibility scan (axe-core) run and issues fixed, not just run and ignored.
- **Risk area:** this is the phase most likely to get compressed — P2 features (see §4 priority tags) are cut first if days 8–9 arrive without slack, not P0/P1.

### Phase 4 — Final Demo Hardening (Day 10)
- Full smoke test of the exact rehearsed demo scenario (§16).
- Offline/failure-fallback paths explicitly re-tested, not assumed still-working from Phase 1.
- Submission packaging: repo cleanup, README, demo video recording, this document finalized.
- **Risk area:** none acceptable at this point — Day 10 has zero room for new feature work, only verification.

### Must-Build vs. Nice-to-Have

| Category | Items |
|---|---|
| **Must-build (P0)** | Everything tagged P0 in §4 — concierge core loop, incident summarization, dispatch advisor (suggest-only), RBAC, mobility routing, high-contrast mode, captioned voice |
| **Nice-to-have (P1)** | Transit/egress planner polish, organizer health overview, voice input, offline mode |
| **High-ROI polish** | The design system (§7) — a judge's first 10 seconds are visual; this is the highest-impact-per-hour item in Phase 2 |
| **Highest impact-per-effort item overall** | The "same event, two views" demo reveal (§16) — costs almost nothing beyond features already being built, and is the single biggest driver of the product actually being *remembered* |

## 16. Demo Strategy and Pitch Narrative

**The 3–5 minute demo narrative — built around one structural idea: show the same real-world event from both sides of the product, live, to prove it's one engine and not two disconnected demos.**

**What to show first:** cold open, no title slide preamble — a fan mid-scenario, phone in hand, asking Matchflow a real question by voice, in a language other than English, at a congested concourse.

**Live scenario storyboard:**
1. *(0:00–0:45)* Fan asks, by voice, in Spanish: "¿Dónde está el baño accesible más cercano?" Matchflow responds instantly, in Spanish, with a route — and the route visibly avoids a zone the demo has scripted as congested.
2. *(0:45–1:30)* Cut immediately to the Ops console. The *same* congestion spike the fan's route just avoided appears as a live incident card — AI-summarized from several seeded volunteer reports arriving in the same window. This is the reveal: one engine, two views, same live moment.
3. *(1:30–2:15)* Staff reviews the incident, sees the dispatch suggestion, approves it with one click — narrate explicitly that this is a suggestion requiring human approval, not an autonomous action, tying directly back to the Security story.
4. *(2:15–3:00)* Quick cut to the Accessibility Hub — toggle high-contrast mode live, show the mobility-accessible routing mode returning a genuinely different (correct) path, show a simplified-language rewrite of a prior answer.
5. *(3:00–3:45)* Post-match transit planner — show the exit/transit recommendation and briefly state the sustainability rationale (spreading load, nudging toward transit).
6. *(3:45–4:30)* Close on the alignment matrix (§14) or a fast visual summary of it — explicitly naming which rubric criteria the judges just watched get demonstrated, not just implied.

**What "wow" transitions to include:** the cut from the fan's phone to the ops console showing the *same* event is the single wow moment this demo is built around — everything else supports it rather than competing with it for attention.

**How to show AI intelligence clearly:** every AI-generated response the judges see should visibly show its grounding (the route rationale, the incident's source reports) — this makes the intelligence legible instead of a black box, which matters as much for judge trust as for the product itself.

**Demo script outline:** written and rehearsed as a fixed sequence against the seeded demo data (§6), not improvised live — the seeded/bounded simulation exists specifically so this sequence is reproducible on demand.

**Contingency plan if a live feature fails:**
- If Gemini is slow/unavailable during the live demo: the deterministic fallback (§6, §13) is not a hidden failure state — it's rehearsed as a visible line: "and if the model's slow, here's what a fan sees instead" — turning a risk into a demonstrated feature.
- If network fails entirely: a pre-recorded backup clip of the exact same scripted sequence is ready to play, so the narrative never has to be reconstructed live under pressure.

## 18. Judge-Maximization Review

Self-critique against the rubric — calibrated honestly, not inflated. A strategist who scores their own concept a 10 across the board isn't credible to the person actually reading it.

| Criterion | Score /10 | Weaknesses | What Would Increase the Score | Final Improvements Before Build |
|---|---|---|---|---|
| **Code Quality** | 8 | Solo build in 10 days means less time for a second-reviewer pass than the PR checklist in §10 implies is ideal | A second contributor, even for a few hours of review, would catch what self-review misses | Budget explicit self-review time in Phase 4, not just feature-completion time |
| **Security** | 8 | Firestore security rules are only as good as their test coverage — a single missed rule is a real gap, not a cosmetic one | A dedicated security-rule fuzzing pass beyond the emulator test suite in §11 | Treat §11's security integration tests as P0, not P1, from day one — already reflected above, but worth restating as the single highest-leverage test category |
| **Efficiency** | 7 | Firestore realtime listeners (chosen for 10-day feasibility in §6) will not scale past demo load — this is a stated, deliberate trade-off, not an oversight, but it is a real ceiling | A documented, credible path to Pub/Sub or a dedicated realtime layer for production, presented honestly as future work rather than glossed over | Make sure this trade-off is stated explicitly in the submission narrative — judges respect an honest scaling limitation more than an implied claim of infinite scale |
| **Testing** | 8 | AI behavior testing (golden-set regression) is inherently softer evidence than a pure unit test — model variance means "passing" is probabilistic, not binary | A larger golden set and a documented pass-rate threshold, rather than a binary pass/fail framing | Report the golden-set pass rate as a number in the submission, not just "tests exist" |
| **Accessibility** | 9 | Genuinely first-class by design, but demoed depth (5 languages, not "all languages"; one venue's concourse graph, not sixteen) is real scope-limiting, worth naming rather than hiding | A second demoed venue would prove the concourse-graph approach generalizes, not just works once | Explicitly state in the submission that the architecture is venue-agnostic even though only one venue is authored for the demo — the TRD (§6) already makes this true; the pitch needs to say so |
| **Problem Statement Alignment** | 9 | Six of eight challenge areas at real depth is strong; Sustainability and Transportation are real but are extensions rather than core pillars, and a sharp judge will notice the difference in depth | More built-out egress/transit logic, if time allows in Phase 3 | Keep the alignment matrix (§14) honest about which rows are "core" vs. "extension" rather than presenting all eleven features as equally deep |

**Overall assessment:** the concept is strong specifically because its weaknesses are the kind that come from an honest, feasible 10-day scope decision (Firestore over a dedicated realtime layer, one venue over sixteen, five languages over "all") rather than from a shallow understanding of the problem. Naming those trade-offs explicitly in the submission is very likely worth more to a technical judge than pretending they don't exist.
