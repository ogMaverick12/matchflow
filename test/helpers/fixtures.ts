import crypto from 'crypto';

const AUTH_SECRET = process.env.AUTH_SECRET || 'test-secret-key';

export function signTestSession(userId: string, role: string, ttlMs = 3600_000) {
  const payload = { userId, role, iat: Date.now(), exp: Date.now() + ttlMs };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export const FIXTURE_SESSIONS = {
  fan: () => signTestSession('user-fan-1', 'fan'),
  volunteer: () => signTestSession('user-vol-1', 'volunteer'),
  staff: () => signTestSession('user-staff-1', 'staff'),
  organizer: () => signTestSession('user-org-1', 'organizer'),
};

export const FIXTURE_GRAPH = {
  nodes: [
    { id: 'Zone_A', label: 'Zone A', x: 0, y: 0, accessible: true },
    { id: 'Zone_B', label: 'Zone B', x: 100, y: 0, accessible: true },
    { id: 'Gate_1', label: 'Gate 1', x: 50, y: 50, accessible: true, isGate: true },
  ],
  edges: [
    { from: 'Zone_A', to: 'Gate_1', walkTimeSec: 120 },
    { from: 'Gate_1', to: 'Zone_B', walkTimeSec: 180 },
  ],
};

export const FIXTURE_ROSTER = [
  { staffId: 's1', name: 'Alice', zone: 'Zone_A', role: 'staff' as const },
  { staffId: 's2', name: 'Bob', zone: 'Zone_B', role: 'volunteer' as const },
  { staffId: 's3', name: 'Carol', zone: 'Zone_A', role: 'organizer' as const },
];
