# @matchflow/types

Part of the **"one engine, two doors"** Matchflow monorepo architecture.

## Role

`types` is the **shared contract layer** — TypeScript interfaces and types shared across `apps/web`, `apps/functions`, `packages/flow-engine`, and `packages/concourse-graph`. It has **zero runtime code** — it is a pure type-definition package.

## Why a Separate Package?

Both the Cloud Functions (Node.js/CommonJS) and the Next.js web app (ESM) share the same domain objects. Without a shared types package, they would diverge silently. `@matchflow/types` makes type mismatches a compile error, not a runtime surprise.

## Key Types

```typescript
// Core domain entities
interface CongestionZone { zoneId, name, level, densityScore, lastUpdated, trend }
interface Incident { id, sourceReportIds, summary, severity, status, zoneId, ... }
interface Report { id, authorId, authorRole, category, description, zoneId, timestamp }
interface Dispatch { id, incidentId, staffName, role, status, suggestedBy, timestamp }
interface Session { sessionId, userId, role, language, accessibilityMode }

// Cloud Function request/response pairs
interface AskConciergeRequest / AskConciergeResponse
interface SummarizeIncidentRequest / SummarizeIncidentResponse
interface SuggestDispatchRequest / SuggestDispatchResponse
interface SimplifyTextRequest / SimplifyTextResponse

// User roles (RBAC)
type UserRole = 'fan' | 'volunteer' | 'staff' | 'organizer'

// Accessibility mode
interface AccessibilityMode {
  mobilityRouting: boolean;    // step-free routing via ACCESSIBLE_ADJ
  highContrast: boolean;       // CSS .high-contrast class
  simplifiedLanguage: boolean; // trigges simplifyText Cloud Function
}
```

## Architecture Position

```
  @matchflow/types   ← YOU ARE HERE
       │
       ├── imported by apps/web (TypeScript)
       ├── imported by apps/functions (TypeScript)
       ├── imported by packages/flow-engine
       └── imported by packages/concourse-graph
```

## Adding New Types

1. Add the interface/type to `src/index.ts`
2. Run `npm run build` in this package
3. All consumers pick up the change automatically (workspace references)

> [!IMPORTANT]
> Do not add any runtime logic or imports to this package. It must remain a pure type declaration package so it can be imported in both CommonJS and ESM contexts without bundler conflicts.
