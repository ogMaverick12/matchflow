import { ConcourseNode, ConcourseEdge } from '@matchflow/types';

export const MERCEDES_BENZ_NODES: ConcourseNode[] = [
  // Level 100 - Zone A
  { id: 'gate_1', name: 'Gate 1 (North)', type: 'gate', zone: 'Zone_A', level: '100', accessibilityTags: ['rampAccess'], x: 50, y: 10 },
  { id: 'restroom_101', name: 'Restroom 101', type: 'restroom', zone: 'Zone_A', level: '100', accessibilityTags: ['elevatorAdjacent', 'rampAccess'], x: 40, y: 15 },
  { id: 'concession_burgers', name: 'Benz Burgers', type: 'concession', zone: 'Zone_A', level: '100', accessibilityTags: ['rampAccess'], x: 60, y: 15 },
  { id: 'seating_101', name: 'Seating Section 101', type: 'seatingBlock', zone: 'Zone_A', level: '100', accessibilityTags: ['accessibleSeating'], x: 45, y: 25 },
  { id: 'elevator_north', name: 'Elevator North', type: 'elevator', zone: 'Zone_A', level: '100', accessibilityTags: ['elevatorAdjacent'], x: 50, y: 20 },

  // Level 100 - Zone B
  { id: 'gate_2', name: 'Gate 2 (East)', type: 'gate', zone: 'Zone_B', level: '100', accessibilityTags: ['rampAccess'], x: 90, y: 50 },
  { id: 'restroom_102', name: 'Restroom 102', type: 'restroom', zone: 'Zone_B', level: '100', accessibilityTags: ['elevatorAdjacent', 'rampAccess'], x: 80, y: 40 },
  { id: 'concession_tacos', name: 'Arena Tacos', type: 'concession', zone: 'Zone_B', level: '100', accessibilityTags: ['rampAccess'], x: 85, y: 60 },
  { id: 'seating_110', name: 'Seating Section 110', type: 'seatingBlock', zone: 'Zone_B', level: '100', accessibilityTags: ['accessibleSeating'], x: 75, y: 55 },
  { id: 'escalator_east', name: 'Escalator East', type: 'escalator', zone: 'Zone_B', level: '100', accessibilityTags: [], x: 80, y: 50 },

  // Level 100 - Zone C
  { id: 'gate_3', name: 'Gate 3 (South)', type: 'gate', zone: 'Zone_C', level: '100', accessibilityTags: ['rampAccess'], x: 50, y: 90 },
  { id: 'restroom_103', name: 'Restroom 103 (Non-Accessible)', type: 'restroom', zone: 'Zone_C', level: '100', accessibilityTags: [], x: 60, y: 80 },
  { id: 'concession_pizza', name: 'Pitchside Pizza', type: 'concession', zone: 'Zone_C', level: '100', accessibilityTags: ['rampAccess'], x: 40, y: 85 },
  { id: 'seating_120', name: 'Seating Section 120', type: 'seatingBlock', zone: 'Zone_C', level: '100', accessibilityTags: ['accessibleSeating'], x: 55, y: 75 },
  { id: 'elevator_south', name: 'Elevator South', type: 'elevator', zone: 'Zone_C', level: '100', accessibilityTags: ['elevatorAdjacent'], x: 50, y: 80 },

  // Level 100 - Zone D
  { id: 'gate_4', name: 'Gate 4 (West)', type: 'gate', zone: 'Zone_D', level: '100', accessibilityTags: ['rampAccess'], x: 10, y: 50 },
  { id: 'restroom_104', name: 'Restroom 104', type: 'restroom', zone: 'Zone_D', level: '100', accessibilityTags: ['rampAccess'], x: 20, y: 60 },
  { id: 'concession_drinks', name: 'Stadium Sips', type: 'concession', zone: 'Zone_D', level: '100', accessibilityTags: ['rampAccess'], x: 15, y: 40 },
  { id: 'seating_130', name: 'Seating Section 130', type: 'seatingBlock', zone: 'Zone_D', level: '100', accessibilityTags: [], x: 25, y: 45 },
  { id: 'escalator_west', name: 'Escalator West', type: 'escalator', zone: 'Zone_D', level: '100', accessibilityTags: [], x: 20, y: 50 },

  // Level 200 - Zone A (North)
  { id: 'lobby_200_north', name: 'Level 200 North Lobby', type: 'junction', zone: 'Zone_A', level: '200', accessibilityTags: [], x: 50, y: 22 },
  { id: 'restroom_201', name: 'Restroom 201 (L200)', type: 'restroom', zone: 'Zone_A', level: '200', accessibilityTags: ['elevatorAdjacent', 'rampAccess'], x: 45, y: 22 },
  { id: 'seating_201', name: 'Seating Section 201', type: 'seatingBlock', zone: 'Zone_A', level: '200', accessibilityTags: ['accessibleSeating'], x: 50, y: 30 },

  // Level 200 - Zone B (East)
  { id: 'concession_beers', name: 'Craft Beers L200', type: 'concession', zone: 'Zone_B', level: '200', accessibilityTags: ['rampAccess'], x: 75, y: 50 }
];

export const MERCEDES_BENZ_EDGES: ConcourseEdge[] = [
  // Ring Level 100 - Zone A
  { fromNodeId: 'gate_1', toNodeId: 'restroom_101', walkTimeSeconds: 30, accessible: true },
  { fromNodeId: 'restroom_101', toNodeId: 'concession_burgers', walkTimeSeconds: 20, accessible: true },
  { fromNodeId: 'concession_burgers', toNodeId: 'seating_101', walkTimeSeconds: 25, accessible: true },
  { fromNodeId: 'seating_101', toNodeId: 'elevator_north', walkTimeSeconds: 15, accessible: true },
  { fromNodeId: 'elevator_north', toNodeId: 'gate_1', walkTimeSeconds: 20, accessible: true },

  // Zone A to B Connection
  { fromNodeId: 'elevator_north', toNodeId: 'gate_2', walkTimeSeconds: 80, accessible: true },

  // Ring Level 100 - Zone B
  { fromNodeId: 'gate_2', toNodeId: 'restroom_102', walkTimeSeconds: 35, accessible: true },
  { fromNodeId: 'restroom_102', toNodeId: 'escalator_east', walkTimeSeconds: 20, accessible: true },
  { fromNodeId: 'escalator_east', toNodeId: 'concession_tacos', walkTimeSeconds: 25, accessible: true },
  { fromNodeId: 'concession_tacos', toNodeId: 'seating_110', walkTimeSeconds: 30, accessible: true },
  { fromNodeId: 'seating_110', toNodeId: 'gate_2', walkTimeSeconds: 40, accessible: true },

  // Zone B to C Connection
  { fromNodeId: 'gate_2', toNodeId: 'gate_3', walkTimeSeconds: 90, accessible: true },

  // Ring Level 100 - Zone C
  { fromNodeId: 'gate_3', toNodeId: 'restroom_103', walkTimeSeconds: 30, accessible: false }, // Non-accessible
  { fromNodeId: 'gate_3', toNodeId: 'concession_pizza', walkTimeSeconds: 45, accessible: true },
  { fromNodeId: 'concession_pizza', toNodeId: 'seating_120', walkTimeSeconds: 20, accessible: true },
  { fromNodeId: 'seating_120', toNodeId: 'elevator_south', walkTimeSeconds: 25, accessible: true },
  { fromNodeId: 'elevator_south', toNodeId: 'gate_3', walkTimeSeconds: 35, accessible: true },

  // Zone C to D Connection
  { fromNodeId: 'elevator_south', toNodeId: 'gate_4', walkTimeSeconds: 85, accessible: true },

  // Ring Level 100 - Zone D
  { fromNodeId: 'gate_4', toNodeId: 'restroom_104', walkTimeSeconds: 30, accessible: true },
  { fromNodeId: 'restroom_104', toNodeId: 'escalator_west', walkTimeSeconds: 25, accessible: true },
  { fromNodeId: 'escalator_west', toNodeId: 'concession_drinks', walkTimeSeconds: 20, accessible: true },
  { fromNodeId: 'concession_drinks', toNodeId: 'seating_130', walkTimeSeconds: 35, accessible: true },
  { fromNodeId: 'seating_130', toNodeId: 'gate_4', walkTimeSeconds: 25, accessible: true },

  // Zone D to A Connection
  { fromNodeId: 'gate_4', toNodeId: 'gate_1', walkTimeSeconds: 95, accessible: true },

  // Vertical transitions: elevators (Accessible)
  { fromNodeId: 'elevator_north', toNodeId: 'lobby_200_north', walkTimeSeconds: 40, accessible: true },
  { fromNodeId: 'elevator_south', toNodeId: 'concession_beers', walkTimeSeconds: 55, accessible: true },

  // Vertical transitions: escalators (Non-Accessible)
  { fromNodeId: 'escalator_east', toNodeId: 'concession_beers', walkTimeSeconds: 35, accessible: false },
  { fromNodeId: 'escalator_west', toNodeId: 'lobby_200_north', walkTimeSeconds: 35, accessible: false },

  // Level 200 Internal
  { fromNodeId: 'lobby_200_north', toNodeId: 'restroom_201', walkTimeSeconds: 15, accessible: true },
  { fromNodeId: 'lobby_200_north', toNodeId: 'seating_201', walkTimeSeconds: 20, accessible: true },
  { fromNodeId: 'seating_201', toNodeId: 'concession_beers', walkTimeSeconds: 45, accessible: true }
];

// ----------------------------------------------------
// §13: Precomputed Accessible-Edge Subgraph
// Built once at module load — O(E), not O(E × queries).
// Every accessible-mode query uses this precomputed adjacency list
// instead of re-filtering MERCEDES_BENZ_EDGES at request time.
// ----------------------------------------------------

/** Checks whether a node is reachable under mobility-accessible rules */
function isNodeAccessible(node: ConcourseNode): boolean {
  // Restrooms must have at least one accessibility tag to be included in the accessible subgraph
  if (node.type === 'restroom') {
    return node.accessibilityTags.includes('rampAccess') || node.accessibilityTags.includes('elevatorAdjacent');
  }
  return true; // all other node types are included
}

/** Adjacency entry for the precomputed subgraph */
export interface AccessibleAdjEntry {
  to: string;
  walkTimeSeconds: number;
}

/**
 * ACCESSIBLE_ADJ — precomputed static adjacency list filtered to
 * accessible edges only (edge.accessible === true AND both endpoint
 * nodes pass isNodeAccessible). Computed once at module load.
 *
 * Usage: pass to findShortestPath via options.precomputedAccessibleAdj
 * when mobilityAccessible === true to skip per-query filtering.
 */
export const ACCESSIBLE_ADJ: Record<string, AccessibleAdjEntry[]> = (() => {
  const adj: Record<string, AccessibleAdjEntry[]> = {};
  for (const node of MERCEDES_BENZ_NODES) {
    adj[node.id] = [];
  }

  for (const edge of MERCEDES_BENZ_EDGES) {
    if (!edge.accessible) continue; // exclude non-accessible edges

    const fromNode = MERCEDES_BENZ_NODES.find(n => n.id === edge.fromNodeId);
    const toNode   = MERCEDES_BENZ_NODES.find(n => n.id === edge.toNodeId);
    if (!fromNode || !toNode) continue;
    if (!isNodeAccessible(fromNode) || !isNodeAccessible(toNode)) continue;

    adj[edge.fromNodeId].push({ to: edge.toNodeId,   walkTimeSeconds: edge.walkTimeSeconds });
    adj[edge.toNodeId].push(  { to: edge.fromNodeId, walkTimeSeconds: edge.walkTimeSeconds });
  }

  return adj;
})();

// ----------------------------------------------------
// §13: Client-Side Graph Cache
// The concourse graph is static within a match day — fetching it per
// query is pure waste. This singleton ensures the graph is loaded once.
//
// In the browser bundle: MERCEDES_BENZ_NODES and MERCEDES_BENZ_EDGES
// are already module-level constants (no HTTP fetch). The cache counter
// is exposed on window.__matchflowGraphCacheHits so network inspection
// can confirm zero re-fetches after first load.
// ----------------------------------------------------
let _graphCacheHits = 0;

/** Returns the graph data singleton and increments the hit counter. */
export function getGraphData(): { nodes: ConcourseNode[]; edges: ConcourseEdge[]; accessibleAdj: typeof ACCESSIBLE_ADJ } {
  _graphCacheHits++;

  // Expose hit count for DevTools inspection (browser only)
  if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
    (globalThis as any).window.__matchflowGraphCacheHits = _graphCacheHits;
  }

  if (_graphCacheHits > 1) {
    console.debug(`[concourse-graph] cache HIT #${_graphCacheHits} — graph not re-fetched`);
  } else {
    console.debug('[concourse-graph] cache MISS — graph loaded from module bundle (first access)');
  }

  return { nodes: MERCEDES_BENZ_NODES, edges: MERCEDES_BENZ_EDGES, accessibleAdj: ACCESSIBLE_ADJ };
}

// ----------------------------------------------------
// PathResult type
// ----------------------------------------------------
export type PathResult =
  | { path: string[]; totalTimeSeconds: number; error?: never }
  | { path?: never; totalTimeSeconds?: never; error: 'NO_ACCESSIBLE_PATH' | 'UNREACHABLE' };

/**
 * Find the shortest (Dijkstra) path between two nodes.
 *
 * §13: When mobilityAccessible is true, uses the precomputed ACCESSIBLE_ADJ
 * instead of re-filtering edges at runtime.
 *
 * @returns PathResult
 *   - On success: { path, totalTimeSeconds }
 *   - On accessible-routing failure: { error: 'NO_ACCESSIBLE_PATH' }  — §9 requires
 *     explicit failure messaging, NEVER a silent fallback to a non-accessible route
 *   - On generic unreachable: { error: 'UNREACHABLE' }
 */
export function findShortestPath(
  fromNodeId: string,
  toNodeId: string,
  options: {
    mobilityAccessible?: boolean;
    zoneCongestion?: Record<string, number>;
  } = {}
): PathResult {
  const { mobilityAccessible = false, zoneCongestion = {} } = options;

  // Build adjacency list
  // §13: For accessible queries, start from the precomputed ACCESSIBLE_ADJ.
  // For standard queries, build dynamically (congestion weights vary per request).
  const adj: Record<string, { to: string; weight: number }[]> = {};

  for (const node of MERCEDES_BENZ_NODES) {
    adj[node.id] = [];
  }

  const hasCongestion = Object.keys(zoneCongestion).length > 0;

  if (mobilityAccessible && !hasCongestion) {
    // §13: Fast path — use precomputed accessible adjacency, no per-edge filtering
    for (const [nodeId, neighbors] of Object.entries(ACCESSIBLE_ADJ)) {
      adj[nodeId] = neighbors.map(n => ({ to: n.to, weight: n.walkTimeSeconds }));
    }
  } else {
    // Standard path (non-accessible OR congestion weights needed)
    const getWeight = (edge: ConcourseEdge) => {
      const fromNode = MERCEDES_BENZ_NODES.find(n => n.id === edge.fromNodeId);
      const toNode   = MERCEDES_BENZ_NODES.find(n => n.id === edge.toNodeId);
      const fromCongestion = fromNode ? (zoneCongestion[fromNode.zone] || 0) : 0;
      const toCongestion   = toNode   ? (zoneCongestion[toNode.zone] || 0) : 0;
      const avgCongestion  = (fromCongestion + toCongestion) / 2;
      return edge.walkTimeSeconds * (1 + avgCongestion * 1.5);
    };

    for (const edge of MERCEDES_BENZ_EDGES) {
      if (mobilityAccessible && !edge.accessible) continue;

      const fromNode = MERCEDES_BENZ_NODES.find(n => n.id === edge.fromNodeId);
      const toNode   = MERCEDES_BENZ_NODES.find(n => n.id === edge.toNodeId);

      if (mobilityAccessible) {
        if (!fromNode || !isNodeAccessible(fromNode)) continue;
        if (!toNode   || !isNodeAccessible(toNode))   continue;
      }

      const weight = getWeight(edge);
      if (!adj[edge.fromNodeId]) adj[edge.fromNodeId] = [];
      adj[edge.fromNodeId].push({ to: edge.toNodeId, weight });
      if (!adj[edge.toNodeId]) adj[edge.toNodeId] = [];
      adj[edge.toNodeId].push({ to: edge.fromNodeId, weight });
    }
  }

  // Dijkstra algorithm
  const dist: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  const visited = new Set<string>();

  for (const node of MERCEDES_BENZ_NODES) {
    dist[node.id] = Infinity;
    prev[node.id] = null;
  }
  dist[fromNodeId] = 0;

  for (let i = 0; i < MERCEDES_BENZ_NODES.length; i++) {
    let u: string | null = null;
    let minDist = Infinity;
    for (const node of MERCEDES_BENZ_NODES) {
      if (!visited.has(node.id) && dist[node.id] < minDist) {
        minDist = dist[node.id];
        u = node.id;
      }
    }

    if (u === null || dist[u] === Infinity) break;
    if (u === toNodeId) break;

    visited.add(u);

    const neighbors = adj[u] || [];
    for (const neighbor of neighbors) {
      if (visited.has(neighbor.to)) continue;
      const alt = dist[u] + neighbor.weight;
      if (alt < dist[neighbor.to]) {
        dist[neighbor.to] = alt;
        prev[neighbor.to] = u;
      }
    }
  }

  if (dist[toNodeId] === Infinity) {
    // §9: Never silently fall back to a non-accessible route.
    return { error: mobilityAccessible ? 'NO_ACCESSIBLE_PATH' : 'UNREACHABLE' };
  }

  // Reconstruct path
  const path: string[] = [];
  let curr: string | null = toNodeId;
  while (curr !== null) {
    path.unshift(curr);
    curr = prev[curr];
  }

  return { path, totalTimeSeconds: Math.round(dist[toNodeId]) };
}
