# @matchflow/concourse-graph

Part of the **"one engine, two doors"** Matchflow monorepo architecture.

## Role

`concourse-graph` owns the **physical world model** of Mercedes-Benz Stadium. It is the single source of truth for:

- The weighted, directed concourse node graph (`MERCEDES_BENZ_NODES`, `MERCEDES_BENZ_EDGES`)
- Shortest-path routing with live-congestion edge weights (Dijkstra's algorithm)
- Mobility-accessible path filtering — precomputed `ACCESSIBLE_ADJ` subgraph (stairs/escalators excluded)
- Explicit failure typing: `{ error: 'NO_ACCESSIBLE_PATH' | 'UNREACHABLE' }` — never a silent fallback

## Architecture Position

```
                      ┌─────────────────────┐
Fan surface (Next.js) │   apps/web          │
Ops surface (Next.js) │   apps/web (ops)    │
                      └────────┬────────────┘
                               │ calls
                      ┌────────▼────────────┐
                      │  @matchflow/        │
                      │  flow-engine        │  ← orchestrates intent → Gemini → graph
                      └────────┬────────────┘
                               │ imports
                      ┌────────▼────────────┐  ◀── YOU ARE HERE
                      │  @matchflow/        │
                      │  concourse-graph    │  ← physical world model + routing
                      └─────────────────────┘
```

## Key Exports

| Export | Description |
|---|---|
| `MERCEDES_BENZ_NODES` | Array of all stadium nodes (gates, concessions, restrooms, elevators, seating) |
| `MERCEDES_BENZ_EDGES` | Directed weighted edges between nodes |
| `ACCESSIBLE_ADJ` | Precomputed adjacency list — stairs and escalators removed (§13 performance) |
| `findShortestPath(start, end, opts)` | Dijkstra with live congestion weights; returns `{ path, totalTimeSeconds }` or `{ error }` |

## Usage

```typescript
import { findShortestPath, MERCEDES_BENZ_NODES } from '@matchflow/concourse-graph';

const result = findShortestPath('gate_1', 'concession_burgers', {
  mobilityAccessible: true,   // uses ACCESSIBLE_ADJ subgraph
  zoneCongestion: { Zone_A: 0.85 }  // live density → edge weight inflation
});

if (result.error) {
  // §9: Always an explicit error — never silent fallback
  // 'NO_ACCESSIBLE_PATH' | 'UNREACHABLE'
  console.error(result.error);
} else {
  console.log(result.path, result.totalTimeSeconds);
}
```

## §9 Accessibility Guarantee

`findShortestPath` with `mobilityAccessible: true` **only** traverses edges in `ACCESSIBLE_ADJ`. If no path exists, it returns `{ error: 'NO_ACCESSIBLE_PATH' }` — the caller is responsible for showing an explicit message. A silent fallback to a non-accessible path is a **compile-time-impossible code path** in this package.

## §13 Performance Notes

- `ACCESSIBLE_ADJ` is precomputed at module load time — O(1) lookup per node at runtime
- `findShortestPath` is synchronous and deterministic — no async I/O
- Suitable for use in Cloud Functions with tight timeout budgets (called inside `askConcierge` at 4s budget)
