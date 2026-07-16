import { UserRole, CongestionZone, Incident, Report, Dispatch, Session } from '@matchflow/types';

// In-Memory Simulated Database State
let mockZones: CongestionZone[] = [
  { zoneId: 'Zone_A', name: 'Zone A (North East)', level: '100', densityScore: 0.25, lastUpdated: Date.now(), trend: 'stable' },
  { zoneId: 'Zone_B', name: 'Zone B (South East)', level: '100', densityScore: 0.35, lastUpdated: Date.now(), trend: 'stable' },
  { zoneId: 'Zone_C', name: 'Zone C (South West)', level: '100', densityScore: 0.15, lastUpdated: Date.now(), trend: 'stable' },
  { zoneId: 'Zone_D', name: 'Zone D (North West)', level: '100', densityScore: 0.20, lastUpdated: Date.now(), trend: 'stable' },
];

let mockReports: Report[] = [
  { id: 'rep_1', authorId: 'vol_1', authorName: 'Diego', authorRole: 'volunteer', category: 'crowd', description: 'Bottleneck forming at Gate 1 escalator', zoneId: 'Zone_A', level: '100', timestamp: Date.now() - 300000 },
  { id: 'rep_2', authorId: 'vol_2', authorName: 'Jean', authorRole: 'volunteer', category: 'facility', description: 'Elevator North temporary out of service', zoneId: 'Zone_A', level: '100', timestamp: Date.now() - 150000 }
];

// Starts empty — incidents are created in real time by db.createReport() when
// fans interact with the concierge or volunteers submit field reports.
// This preserves the "same live moment" narrative: the ops dashboard is blank
// until actual fan activity drives the first incident. (§16 demo scenario)
let mockIncidents: Incident[] = [];


// Starts empty — dispatches are created by ops staff approving AI suggestions.
// Nothing to dispatch until an incident exists. (§16 demo scenario)
let mockDispatches: Dispatch[] = [];


// Pub-Sub Event System for Real-time listeners
type Listener = () => void;
const listeners = new Set<Listener>();

function notifyListeners() {
  listeners.forEach(l => l());
}

// Security Rules Checker
function enforceRules(role: UserRole, action: 'read' | 'write', collection: 'sessions' | 'reports' | 'incidents' | 'dispatches' | 'concourseGraph' | 'congestionState', documentAuthorId?: string) {
  if (role === 'organizer') {
    return; // Organizers have full read/write bypass
  }

  if (collection === 'concourseGraph' || collection === 'congestionState') {
    if (action === 'write') {
      throw new Error(`Permission Denied: role ${role} cannot write to ${collection}`);
    }
    return; // anyone can read
  }

  if (collection === 'sessions') {
    return; // handled per-session logic
  }

  if (collection === 'incidents' || collection === 'dispatches') {
    if (role === 'staff') {
      return; // staff can read and write
    }
    throw new Error(`Permission Denied: role ${role} cannot access ${collection}. Insufficient permissions.`);
  }

  if (collection === 'reports') {
    if (action === 'write') {
      if (role === 'volunteer' || role === 'staff') return;
      throw new Error(`Permission Denied: role ${role} cannot create reports.`);
    }
    if (action === 'read') {
      if (role === 'staff') return;
      if (role === 'volunteer') {
        if (documentAuthorId && documentAuthorId === 'me') return; // allowed to read own reports
        throw new Error(`Permission Denied: volunteer role can only read their own reports.`);
      }
      throw new Error(`Permission Denied: role ${role} cannot read reports.`);
    }
  }
}

// Bounded random-walk simulator execution
export function runSimulatorTick() {
  mockZones = mockZones.map(zone => {
    const change = (Math.random() - 0.5) * 0.1; // small random walk
    let newScore = Math.min(1.0, Math.max(0.0, zone.densityScore + change));
    
    // Non-degenerate boundaries (always clamp between 0.05 and 0.95 to keep interesting mock)
    newScore = Math.min(0.95, Math.max(0.05, newScore));
    
    const trends: ('up' | 'down' | 'stable')[] = ['up', 'down', 'stable'];
    const trend = change > 0.02 ? 'up' : change < -0.02 ? 'down' : 'stable';

    return {
      ...zone,
      densityScore: parseFloat(newScore.toFixed(2)),
      lastUpdated: Date.now(),
      trend
    };
  });
  notifyListeners();
}

// API Exported Methods
export const db = {
  // Congestion State
  subscribeToCongestion(role: UserRole, callback: (zones: CongestionZone[]) => void, onError?: (err: Error) => void) {
    try {
      enforceRules(role, 'read', 'congestionState');
      callback([...mockZones]);
      const listener = () => {
        try {
          callback([...mockZones]);
        } catch (e) {
          if (onError) onError(e as Error);
        }
      };
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    } catch (err) {
      if (onError) onError(err as Error);
      return () => {};
    }
  },

  // Reports
  subscribeToReports(role: UserRole, userId: string, callback: (reports: Report[]) => void, onError?: (err: Error) => void) {
    try {
      enforceRules(role, 'read', 'reports');
      const filterReports = () => {
        if (role === 'staff' || role === 'organizer') {
          return [...mockReports];
        } else if (role === 'volunteer') {
          return mockReports.filter(r => r.authorId === userId);
        }
        return [];
      };
      callback(filterReports());
      const listener = () => {
        callback(filterReports());
      };
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    } catch (err) {
      if (onError) onError(err as Error);
      return () => {};
    }
  },

  // Simulating cross-role read (explicit check for volunteer reading all)
  attemptCrossRoleRead(role: UserRole): Promise<Report[]> {
    return new Promise((resolve, reject) => {
      try {
        enforceRules(role, 'read', 'reports', 'other_user'); // passing 'other_user' to trigger volunteer failure
        resolve([...mockReports]);
      } catch (err) {
        reject(err);
      }
    });
  },

  createReport(role: UserRole, reportData: Omit<Report, 'id' | 'timestamp'>): Promise<Report> {
    return new Promise((resolve, reject) => {
      try {
        enforceRules(role, 'write', 'reports');
        const newReport: Report = {
          ...reportData,
          id: `rep_${Date.now()}`,
          timestamp: Date.now()
        };
        mockReports.unshift(newReport);
        
        // Auto trigger incident grouping logic simulation
        const isDuplicate = mockIncidents.some(inc => inc.zoneId === reportData.zoneId && inc.status === 'active');
        if (!isDuplicate) {
          const newIncident: Incident = {
            id: `inc_${Date.now()}`,
            sourceReportIds: [newReport.id],
            summary: `Spike in ${reportData.zoneId}`,
            description: reportData.description,
            severity: 'low',
            confidence: 0.9,
            status: 'active',
            zoneId: reportData.zoneId,
            level: reportData.level,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          mockIncidents.unshift(newIncident);
        } else {
          // append to existing incident
          const index = mockIncidents.findIndex(inc => inc.zoneId === reportData.zoneId && inc.status === 'active');
          if (index !== -1) {
            mockIncidents[index] = {
              ...mockIncidents[index],
              sourceReportIds: [...mockIncidents[index].sourceReportIds, newReport.id],
              summary: `${mockIncidents[index].sourceReportIds.length + 1} reports in ${reportData.zoneId}`,
              updatedAt: Date.now()
            };
          }
        }

        notifyListeners();
        resolve(newReport);
      } catch (err) {
        reject(err);
      }
    });
  },

  // Incidents
  subscribeToIncidents(role: UserRole, callback: (incidents: Incident[]) => void, onError?: (err: Error) => void) {
    try {
      enforceRules(role, 'read', 'incidents');
      callback([...mockIncidents]);
      const listener = () => {
        try {
          callback([...mockIncidents]);
        } catch (e) {
          if (onError) onError(e as Error);
        }
      };
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    } catch (err) {
      if (onError) onError(err as Error);
      return () => {};
    }
  },

  updateIncidentStatus(role: UserRole, incidentId: string, status: Incident['status']): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        enforceRules(role, 'write', 'incidents');
        const index = mockIncidents.findIndex(inc => inc.id === incidentId);
        if (index !== -1) {
          mockIncidents[index] = {
            ...mockIncidents[index],
            status,
            updatedAt: Date.now()
          };
          notifyListeners();
          resolve();
        } else {
          reject(new Error('Incident not found'));
        }
      } catch (err) {
        reject(err);
      }
    });
  },

  // Dispatches
  subscribeToDispatches(role: UserRole, callback: (dispatches: Dispatch[]) => void, onError?: (err: Error) => void) {
    try {
      enforceRules(role, 'read', 'dispatches');
      callback([...mockDispatches]);
      const listener = () => {
        try {
          callback([...mockDispatches]);
        } catch (e) {
          if (onError) onError(e as Error);
        }
      };
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    } catch (err) {
      if (onError) onError(err as Error);
      return () => {};
    }
  },

  createDispatch(role: UserRole, dispatchData: Omit<Dispatch, 'id' | 'timestamp'>): Promise<Dispatch> {
    return new Promise((resolve, reject) => {
      try {
        enforceRules(role, 'write', 'dispatches');
        const newDispatch: Dispatch = {
          ...dispatchData,
          id: `disp_${Date.now()}`,
          timestamp: Date.now()
        };
        mockDispatches.unshift(newDispatch);
        notifyListeners();
        resolve(newDispatch);
      } catch (err) {
        reject(err);
      }
    });
  },

  updateDispatchStatus(role: UserRole, dispatchId: string, status: Dispatch['status']): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        enforceRules(role, 'write', 'dispatches');
        const index = mockDispatches.findIndex(disp => disp.id === dispatchId);
        if (index !== -1) {
          mockDispatches[index] = {
            ...mockDispatches[index],
            status
          };
          notifyListeners();
          resolve();
        } else {
          reject(new Error('Dispatch not found'));
        }
      } catch (err) {
        reject(err);
      }
    });
  },

  /**
   * INTERNAL SIMULATION USE ONLY.
   * Writes congestion data directly to in-memory state, bypassing role enforcement.
   * This function is called exclusively by the congestion-simulator module.
   * It MUST NOT be called from any user-facing code path.
   * In a production Firestore deployment, congestion writes would require
   * isRole('organizer') — enforced at the rules layer, not the client layer.
   */
  writeCongestionBatch(
    updates: Array<Pick<CongestionZone, 'zoneId' | 'densityScore' | 'lastUpdated' | 'trend'>>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        mockZones = mockZones.map(existing => {
          const update = updates.find(u => u.zoneId === existing.zoneId);
          if (!update) return existing;
          return {
            ...existing,
            densityScore: update.densityScore,
            lastUpdated: update.lastUpdated,
            trend: update.trend,
          };
        });
        notifyListeners();
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }
};
