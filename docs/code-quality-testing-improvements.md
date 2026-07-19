# MatchFlow Code Quality & Testing Improvements Plan

> **Goal:** Improve Code Quality from 88→95+ and Testing from 96→99+ for Google Virtual Prompt Wars competition.

## Wave 1 — Independent Tasks (Parallel)

### A. Fix Broken Tests + Script Wiring

- Fix `test/integration/batch-surge.test.ts` assertions (wrong model names, wrong constant)
- Add `api-rbac.test.ts` to `test:integration` script or document why it's separate
- Remove legacy `test-security-rules.js` and `apps/functions/test-backend.js` (or promote to CI)

### B. Eliminate All `any` Types

- 31 instances across `flow-engine` (10), `db/route.ts` (6), `db.ts` (4), others
- Replace with proper types or `unknown` + type narrowing for catch blocks

### C. Add JSDoc to `packages/types` Exports

- All 17 exported interfaces + types need doc comments
- This is the foundation package; zero documentation is a major gap

### D. Fix `.replace('_', ' ')` Bug + Remove console.* from Prod

- 9 instances of `.replace('_', ' ')` → `.replaceAll('_', ' ')`
- 31 `console.*` statements in production code → remove or gate behind `NODE_ENV`

### E. Extract Duplicated Constants

- Gemini model names (4 different variable names)
- Density thresholds (scattered across 6+ files)
- Egress scoring formula (4 identical copies)
- Deterministic fallback sort (3 copies)

### F. Fix Silent Catches + Remove Unused Imports

- 15 empty/swallowed catch blocks → proper error handling or logging
- 4 unused imports → remove

### G. Add ESLint TS Rules + Prettier

- Install `@typescript-eslint`, enable `no-explicit-any`, `consistent-type-imports`
- Create root `.prettierrc` + `.prettierignore`

### H. Add React Error Boundaries

- Route-level error boundaries for fan and ops layouts
- Prevent full white-screen crashes

## Wave 2 — Test Utilities (Prerequisite for Wave 3)

### I. Create Shared Test Utilities

- `test/helpers/mockFirestore.ts` — shared Firestore mock with query chaining
- `test/helpers/fixtures.ts` — session tokens per role, graph fixtures, report/incident factories
- `test/helpers/assertions.ts` — custom matchers for RBAC, routing, etc.

## Wave 3 — New Unit Tests (Parallel, depend on Wave 2)

### J. Auth Unit Tests (`apps/web/src/lib/auth.ts`)

- `signSession()` round-trip
- `verifySession()` — expired, tampered, malformed, empty
- `extractToken()` — Bearer priority, cookie fallback
- `verifyHmac()` — constant-time comparison

### K. Flow-Engine Unit Tests

- `searchNodeByKeyword()` — all 15+ keyword mappings, partial matches, case sensitivity
- `deterministicRoute()` — Gemini-free fallback, language branches
- `detectLanguage()` — Spanish, French, Portuguese, Arabic
- `noAccessiblePathMessage()` — 5 language variants
- `executeTool()` — routeLookup, gateLookup, incidentStatusLookup, unknown tool
- `summarizeTool()` — routeLookup/gateLookup/incidentStatusLookup in 4 languages
- `rankEgressOptions()` — scoring formula, zone penalty, sort order
- `rankDispatches()` — empty roster, all same zone, multiple staff same zone

### L. Analytics + DB Unit Tests

- `classifyQuery()` — 8 categories + default, empty string, long string
- `getFallbackRate()` — division-by-zero edge case
- `subscribeWithDedup()` — polling, change detection, cleanup
- `apiGet()/apiPost()` — error handling

### M. Edge Case Tests for Existing Files

- `concourse-graph`: identity path, both accessible+congestion, empty congestion, high congestion
- `failure-injection`: gate/food/seating keywords, French/Portuguese/Arabic detection
- `security-rules`: fan CREATE, volunteer CREATE, staff CREATE/UPDATE, organizer UPDATE/DELETE

### N. Negative/Failure Tests

- `executeTool()` unknown tool
- `checkRateLimit()` concurrent requests
- `simplifyText()` empty/long input
- `rankEgressOptions()` empty options
- API routes: malformed JSON, missing body, unknown collection

### O. Legacy Cleanup + CI

- Delete or move `test-security-rules.js` and `apps/functions/test-backend.js`
- Fix CI workflow: add `--test` flag to tsx commands, ensure build before Playwright
