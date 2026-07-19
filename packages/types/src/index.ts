export type UserRole = 'fan' | 'volunteer' | 'staff' | 'organizer';

export interface ConcourseNode {
  id: string;
  name: string;
  type: 'gate' | 'restroom' | 'concession' | 'exit' | 'seatingBlock' | 'elevator' | 'escalator' | 'junction';
  zone: string;
  level: '100' | '200' | '300';
  accessibilityTags: ('elevatorAdjacent' | 'rampAccess' | 'accessibleSeating')[];
  x?: number;
  y?: number;
}

export interface ConcourseEdge {
  fromNodeId: string;
  toNodeId: string;
  walkTimeSeconds: number;
  accessible: boolean;
}

export interface CongestionZone {
  zoneId: string;
  name: string;
  level: '100' | '200' | '300';
  densityScore: number;
  lastUpdated: number;
  trend: 'up' | 'down' | 'stable';
}

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

export interface SuggestDispatchRequest {
  incidentId: string;
  roster: { staffId: string; name: string; role: 'volunteer' | 'staff'; zone: string }[];
}

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

export interface SimplifyTextRequest {
  originalText: string;
}

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

export interface EgressOption {
  id: string;
  name: string;
  gate: string;
  type: 'transit' | 'rideshare' | 'walk';
  estimatedMinutes: number;
  currentQueueScore: number;
  sustainabilityScore: number;
}

export interface RankEgressRequest {
  sessionId: string;
  userId: string;
  role: UserRole;
  zoneScores: Record<string, number>;
  options: EgressOption[];
}

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
