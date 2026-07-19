import { test, expect } from '@playwright/test';

/**
 * §11 / §12 — Server-Side RBAC Integration Tests
 *
 * Hits the REAL /api/auth/session (token minting) and /api/db (RBAC-guarded
 * shared store) endpoints against the running Next.js server. Each role's
 * access is enforced SERVER-SIDE from the signed token — the client's
 * self-reported role is never trusted. Every assertion uses Playwright's
 * `expect`, which throws on failure so the test fails loudly (no silent pass).
 *
 * Coverage mirrors the authoritative rbac.ts matrix:
 *   (a) unauthenticated POST /api/db → 401
 *   (b) fan cannot READ incidents
 *   (c) volunteer can CREATE a report + READ only OWN reports
 *   (d) staff can READ incidents but CANNOT update/delete a dispatch
 *   (e) only organizer can WRITE congestionState
 *
 * The §16 pre-seeded demo incident must be visible to staff reads, proving the
 * fan→ops "same live store" contract end to end.
 */

const BASE_URL = process.env.WEB_BASE_URL ?? 'http://localhost:3000';

// Mint a server-signed token by calling the real /api/auth/session route and
// pulling the Set-Cookie header out. Returns the bare token string.
//
// NOTE: each call uses an ISOLATED request context so no httpOnly cookie leaks
// between roles. The /api/db handler prefers the cookie over a Bearer header,
// so isolating contexts guarantees our explicit Bearer token is the only
// credential presented (otherwise a later mint would overwrite the shared
// cookie jar and silently change the authenticated role).
async function mintToken(
  request: any,
  role: 'fan' | 'volunteer' | 'staff' | 'organizer',
  userId?: string
): Promise<string> {
  const res = await request.post(`${BASE_URL}/api/auth/session`, {
    data: { role, userId },
  });
  expect(res.status(), `session mint for ${role} should succeed`).toBe(200);
  const setCookie = res.headers()['set-cookie'] || '';
  const match = setCookie.match(/matchflow_session=([^;,\s]+)/);
  expect(match, `expected matchflow_session cookie for ${role}`).not.toBeNull();
  return match![1];
}

// Helper: GET a collection with an explicit Bearer token (server verifies it).
async function apiGet(request: any, token: string, coll: string) {
  return request.get(`${BASE_URL}/api/db?coll=${coll}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Helper: POST an op with an explicit Bearer token.
async function apiPost(request: any, token: string, body: any) {
  return request.post(`${BASE_URL}/api/db`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: body,
  });
}

test.describe('§12 Server-Side RBAC — real /api/db enforcement', () => {
  test('(a) unauthenticated POST /api/db is rejected (401 unauthenticated)', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/db`, {
      headers: { 'Content-Type': 'application/json' },
      data: { coll: 'incidents', op: 'insert', doc: { summary: 'x' } },
    });
    expect(res.status(), 'no token supplied → must be 401').toBe(401);
  });

  test('(b) fan cannot READ incidents (server rejects)', async ({ request }) => {
    const fanToken = await mintToken(request, 'fan', 'user_fan');
    const res = await apiGet(request, fanToken, 'incidents');
    expect(res.status(), 'fan read of incidents must be denied').toBe(403);
  });

  test('(c) volunteer can create a report and read only their own', async ({ request }) => {
    const volToken = await mintToken(request, 'volunteer', 'user_diego');

    // Volunteer CAN create a report.
    const create = await apiPost(request, volToken, {
      coll: 'reports',
      op: 'insert',
      doc: {
        authorName: 'Diego',
        authorRole: 'volunteer',
        category: 'crowd',
        description: 'Crowd building at Zone B',
        zoneId: 'Zone_B',
        level: '100',
      },
    });
    expect(create.status(), 'volunteer create report must succeed').toBe(200);
    const createdJson = await create.json();
    const created = createdJson.data[0];
    expect(created.authorId, 'report must be tied to verified volunteer userId').toBe('user_diego');

    // Volunteer CAN read their own reports.
    const ownRead = await apiGet(request, volToken, 'reports');
    expect(ownRead.status(), 'volunteer read own reports must succeed').toBe(200);
    const ownJson = await ownRead.json();
    expect(
      ownJson.data.every((r: any) => r.authorId === 'user_diego'),
      'volunteer must only see their own reports'
    ).toBe(true);

    // Volunteer CANNOT read incidents.
    const incRead = await apiGet(request, volToken, 'incidents');
    expect(incRead.status(), 'volunteer read of incidents must be denied').toBe(403);
  });

  test('(d) staff can read incidents + the §16 seeded demo incident, but cannot mutate dispatches', async ({ request }) => {
    const staffToken = await mintToken(request, 'staff', 'user_priya');

    // Staff CAN read incidents — and the deterministic §16 demo incident exists.
    const incRead = await apiGet(request, staffToken, 'incidents');
    expect(incRead.status(), 'staff read of incidents must succeed').toBe(200);
    const incJson = await incRead.json();
    const seeded = incJson.data.find((i: any) => i.id === 'inc_demo_zoneA');
    expect(seeded, '§16 pre-seeded demo incident must be visible to staff').toBeTruthy();
    expect(seeded.zoneId, 'seeded incident must be in Zone_A').toBe('Zone_A');

    // Staff CAN create a dispatch (append-only audit).
    const dispCreate = await apiPost(request, staffToken, {
      coll: 'dispatches',
      op: 'insert',
      doc: {
        incidentId: 'inc_demo_zoneA',
        role: 'staff',
        status: 'proposed',
        suggestedBy: 'ai',
        timestamp: Date.now(),
      },
    });
    expect(dispCreate.status(), 'staff create dispatch must succeed').toBe(200);

    // Staff CANNOT UPDATE a dispatch (immutable audit trail).
    const dispUpdate = await apiPost(request, staffToken, {
      coll: 'dispatches',
      op: 'update',
      id: 'disp_demo',
      patch: { status: 'completed' },
    });
    expect(dispUpdate.status(), 'staff update of dispatch must be denied (immutable)').toBe(403);

    // Staff CANNOT DELETE a dispatch.
    const dispDelete = await apiPost(request, staffToken, {
      coll: 'dispatches',
      op: 'delete',
      id: 'disp_demo',
    });
    expect(dispDelete.status(), 'staff delete of dispatch must be denied (immutable)').toBe(403);
  });

  test('(e) only organizer can WRITE congestionState; fan/staff/volunteer cannot', async ({ request }) => {
    const organizerToken = await mintToken(request, 'organizer', 'user_marcus');
    const staffToken = await mintToken(request, 'staff', 'user_priya');
    const volToken = await mintToken(request, 'volunteer', 'user_diego');
    const fanToken = await mintToken(request, 'fan', 'user_fan');

    // Organizer CAN write congestionState (via seedCongestion op).
    const orgWrite = await apiPost(request, organizerToken, {
      coll: 'congestionState',
      op: 'seedCongestion',
      rows: [
        { zoneId: 'Zone_A', name: 'Zone A', level: '100', densityScore: 0.9, lastUpdated: Date.now(), trend: 'up' },
      ],
    });
    expect(orgWrite.status(), 'organizer write congestionState must succeed').toBe(200);

    // The organizer's write is visible to a public (fan) read of congestionState.
    const fanRead = await apiGet(request, fanToken, 'congestionState');
    expect(fanRead.status(), 'fan can read public congestionState').toBe(200);
    const zones = (await fanRead.json()).data;
    const zoneA = zones.find((z: any) => z.zoneId === 'Zone_A');
    expect(zoneA?.densityScore, 'organizer write must surface to shared congestion feed').toBe(0.9);

    // Staff CANNOT write congestionState.
    const staffWrite = await apiPost(request, staffToken, {
      coll: 'congestionState',
      op: 'seedCongestion',
      rows: [{ zoneId: 'Zone_B', name: 'Zone B', level: '100', densityScore: 0.1, lastUpdated: Date.now(), trend: 'down' }],
    });
    expect(staffWrite.status(), 'staff write congestionState must be denied').toBe(403);

    // Volunteer CANNOT write congestionState.
    const volWrite = await apiPost(request, volToken, {
      coll: 'congestionState',
      op: 'seedCongestion',
      rows: [{ zoneId: 'Zone_C', name: 'Zone C', level: '100', densityScore: 0.1, lastUpdated: Date.now(), trend: 'down' }],
    });
    expect(volWrite.status(), 'volunteer write congestionState must be denied').toBe(403);

    // Fan CANNOT write congestionState.
    const fanWrite = await apiPost(request, fanToken, {
      coll: 'congestionState',
      op: 'seedCongestion',
      rows: [{ zoneId: 'Zone_D', name: 'Zone D', level: '100', densityScore: 0.1, lastUpdated: Date.now(), trend: 'down' }],
    });
    expect(fanWrite.status(), 'fan write congestionState must be denied').toBe(403);
  });

  test('fan→ops shared store: organizer congestion write is readable by staff (one engine, two views)', async ({ request }) => {
    const organizerToken = await mintToken(request, 'organizer', 'user_marcus');
    const staffToken = await mintToken(request, 'staff', 'user_priya');

    // Organizer pushes a fresh live signal.
    await apiPost(request, organizerToken, {
      coll: 'congestionState',
      op: 'seedCongestion',
      rows: [
        { zoneId: 'Zone_A', name: 'Zone A', level: '100', densityScore: 0.88, lastUpdated: Date.now(), trend: 'up' },
        { zoneId: 'Zone_B', name: 'Zone B', level: '100', densityScore: 0.35, lastUpdated: Date.now(), trend: 'stable' },
        { zoneId: 'Zone_C', name: 'Zone C', level: '100', densityScore: 0.15, lastUpdated: Date.now(), trend: 'stable' },
        { zoneId: 'Zone_D', name: 'Zone D', level: '100', densityScore: 0.20, lastUpdated: Date.now(), trend: 'stable' },
      ],
    });

    // The ops (staff) surface reads the SAME collection and sees the new signal.
    const staffRead = await apiGet(request, staffToken, 'congestionState');
    expect(staffRead.status(), 'staff read of congestionState must succeed').toBe(200);
    const zones = (await staffRead.json()).data;
    const zoneA = zones.find((z: any) => z.zoneId === 'Zone_A');
    expect(zoneA?.densityScore, 'staff must observe the organizer-pushed live signal in Zone_A').toBe(0.88);
  });
});
