/** User role within the stadium — determines access level and routing behavior. */
export type UserRole = 'fan' | 'volunteer' | 'staff' | 'organizer';

export * from './constants';

/** A navigable location in the stadium concourse graph (gate, restroom, concession, etc.). */
export interface ConcourseNode {
  id: string;
  name: string;
  type:
    | 'gate'
    | 'restroom'
    | 'concession'
    | 'exit'
    | 'seatingBlock'
    | 'elevator'
    | 'escalator'
    | 'junction';
  zone: string;
  level: '100' | '200' | '300';
  accessibilityTags: ('elevatorAdjacent' | 'rampAccess' | 'accessibleSeating')[];
  x?: number;
  y?: number;
}

/** A directed walkable connection between two concourse nodes. */
export interface ConcourseEdge {
  fromNodeId: string;
  toNodeId: string;
  walkTimeSeconds: number;
  /** Whether this edge is usable with mobility-accessible routing. */
  accessible: boolean;
}

/** Real-time crowd-density reading for a stadium zone. */
export interface CongestionZone {
  zoneId: string;
  name: string;
  level: '100' | '200' | '300';
  densityScore: number;
  lastUpdated: number;
  trend: 'up' | 'down' | 'stable';
}

/** A confirmed incident (hazard, closure, or bottleneck) aggregated from fan reports. */
export interface Incident {
  id: string;
  sourceReportIds: string[];
  summary: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  status: 'active' | 'dispatched' | 'resolved' | 'needs_review';
  zoneId: string;
  level: '100' | '200' | '300';
  createdAt: number;
  updatedAt: number;
}

/** An assignment of a staff member or volunteer to respond to an incident. */
export interface Dispatch {
  id: string;
  incidentId: string;
  staffName?: string;
  role: 'volunteer' | 'staff';
  status: 'proposed' | 'dispatched' | 'completed' | 'dismissed';
  suggestedBy: 'ai' | 'human';
  approvedBy?: string;
  timestamp: number;
}

/** An active user session carrying language, role, and accessibility preferences. */
export interface Session {
  sessionId: string;
  userId: string;
  role: UserRole;
  language: string;
  accessibilityMode: {
    mobilityRouting: boolean;
    highContrast: boolean;
    simplifiedLanguage: boolean;
  };
  lastActive: number;
}

/** A crowd-sourced report submitted by a fan, volunteer, or staff member. */
export interface Report {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  category: string;
  description: string;
  zoneId: string;
  level: '100' | '200' | '300';
  timestamp: number;
}

// ----------------------------------------------------
// Cloud Functions Request / Response Contracts
// ----------------------------------------------------

/** Request payload for the concierge wayfinding cloud function. */
export interface AskConciergeRequest {
  query: string;
  sessionId: string;
  userId: string;
  role: UserRole;
  language: string;
  accessibilityMode: {
    mobilityRouting: boolean;
    highContrast: boolean;
    simplifiedLanguage: boolean;
  };
}

/** Response from the concierge cloud function containing a navigable answer and optional route. */
export interface AskConciergeResponse {
  success: boolean;
  data?: {
    answerText: string;
    route?: {
      path: string[];
      totalTimeSeconds: number;
      nodeDetails: { id: string; name: string; type: string; zone: string; level: string }[];
    };
    detectedLanguage: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

/** Request payload for the AI dispatch-ranking cloud function. */
export interface SuggestDispatchRequest {
  incidentId: string;
  roster: { staffId: string; name: string; role: 'volunteer' | 'staff'; zone: string }[];
}

/** Response from the dispatch-ranking function, returning staff sorted by suitability. */
export interface SuggestDispatchResponse {
  success: boolean;
  data?: {
    suggestions: {
      incidentId: string;
      staffId: string;
      staffName: string;
      role: 'volunteer' | 'staff';
      rank: number;
      reason: string;
    }[];
  };
  error?: {
    code: string;
    message: string;
  };
}

/** Request payload for the text-simplification function (accessibility feature). */
export interface SimplifyTextRequest {
  originalText: string;
}

/** Response from the text-simplification function. */
export interface SimplifyTextResponse {
  success: boolean;
  data?: {
    simplifiedText: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ----------------------------------------------------
// Egress Ranking Request / Response Contracts
// ----------------------------------------------------

/** A possible exit option (transit, rideshare, or walk) from the stadium. */
export interface EgressOption {
  id: string;
  name: string;
  gate: string;
  type: 'transit' | 'rideshare' | 'walk';
  estimatedMinutes: number;
  currentQueueScore: number;
  sustainabilityScore: number;
}

/** Request payload for the egress-ranking cloud function. */
export interface RankEgressRequest {
  sessionId: string;
  userId: string;
  role: UserRole;
  zoneScores: Record<string, number>;
  options: EgressOption[];
}

/** Response from the egress-ranking function with options ordered by composite score. */
export interface RankEgressResponse {
  success: boolean;
  data?: {
    rankedOptions: Array<{ id: string; rank: number; rationale: string; recommended: boolean }>;
    summary: string;
  };
  error?: {
    code: string;
    message: string;
  };
}
