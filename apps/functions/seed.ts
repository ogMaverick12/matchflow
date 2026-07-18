/**
 * seed.ts — Firebase seed script for MatchFlow (deployment prep).
 *
 * Seeds the Firestore collections the Cloud Functions depend on:
 *   - congestionState  (REQUIRED — askConcierge reads this at call time)
 *   - concourseGraph   (static map nodes/edges; rules allow public read)
 *   - reports / incidents / dispatches (optional demo content for the ops console)
 *
 * Uses firebase-admin, which bypasses security rules (same access model as the
 * deployed functions). Never commit a service-account key — pass its path via
 * the GOOGLE_APPLICATION_CREDENTIALS env var.
 *
 * USAGE:
 *   1. Firebase Console → Project Settings → Service accounts → Generate new key
 *      → save as apps/functions/service-account.json (gitignored).
 *   2. $env:GOOGLE_APPLICATION_CREDENTIALS = "apps/functions/service-account.json"
 *   3. $env:GCLOUD_PROJECT = "your-firebase-project-id"
 *   4. npx tsx apps/functions/seed.ts
 */

import * as admin from 'firebase-admin';
import { MERCEDES_BENZ_NODES } from '@matchflow/concourse-graph';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'matchflow-demo';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = admin.firestore();

// ── 1. congestionState (REQUIRED by askConcierge) ───────────────────────
const ZONES = [
  { zoneId: 'Zone_A', name: 'Zone A (North East)', level: '100', densityScore: 0.25, trend: 'stable' as const },
  { zoneId: 'Zone_B', name: 'Zone B (South East)', level: '100', densityScore: 0.35, trend: 'stable' as const },
  { zoneId: 'Zone_C', name: 'Zone C (South West)', level: '100', densityScore: 0.15, trend: 'stable' as const },
  { zoneId: 'Zone_D', name: 'Zone D (North West)', level: '100', densityScore: 0.20, trend: 'stable' as const },
];

async function seedCongestionState() {
  const batch = db.batch();
  for (const z of ZONES) {
    batch.set(db.collection('congestionState').doc(z.zoneId), {
      ...z,
      lastUpdated: Date.now(),
    });
  }
  await batch.commit();
  console.log(`✓ congestionState: ${ZONES.length} zones seeded`);
}

// ── 2. concourseGraph (static map, public-read) ───────────────────────────
async function seedConcourseGraph() {
  const batch = db.batch();
  for (const node of MERCEDES_BENZ_NODES) {
    batch.set(db.collection('concourseGraph').doc(node.id), node);
  }
  await batch.commit();
  console.log(`✓ concourseGraph: ${MERCEDES_BENZ_NODES.length} nodes seeded`);
}

// ── 3. Demo incidents + source reports (optional, for ops console) ─────────
async function seedDemoIncidents() {
  const now = Date.now();
  const reportRef = db.collection('reports').doc('rep_seed_1');
  await reportRef.set({
    id: 'rep_seed_1',
    authorId: 'vol_1',
    authorName: 'Diego',
    authorRole: 'volunteer',
    category: 'crowd',
    description: 'Bottleneck forming at Gate 1 escalator',
    zoneId: 'Zone_A',
    level: '100',
    timestamp: now - 300000,
  });

  const incRef = db.collection('incidents').doc('inc_seed_1');
  await incRef.set({
    id: 'inc_seed_1',
    sourceReportIds: ['rep_seed_1'],
    summary: 'Spike in Zone_A',
    description: 'Bottleneck forming at Gate 1 escalator',
    severity: 'medium',
    confidence: 0.9,
    status: 'active',
    zoneId: 'Zone_A',
    level: '100',
    createdAt: now - 300000,
    updatedAt: now,
  });
  console.log('✓ demo incident + source report seeded (Zone_A)');
}

async function main() {
  console.log(`Seeding MatchFlow → project "${PROJECT_ID}"`);
  await seedCongestionState();
  await seedConcourseGraph();
  await seedDemoIncidents();
  console.log('Done. Deploy functions with: firebase deploy --only functions');
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
