'use client';

/**
 * congestion-simulator.ts — §6 Seeded Congestion Simulation Engine
 *
 * Drives CongestionZone.densityScore per zone on a fixed 8-second tick using a
 * bounded random-walk. Scripted "spike" events are wired to the §16 demo
 * scenario so the live demo is reproducible and the "same event, two views"
 * reveal works on demand.
 *
 * Architecture note: this module is a *swappable simulation layer* — in
 * production, replace `tick()` with a real sensor/turnstile feed adapter
 * without touching any Flow Engine consuming logic. See §6 TRD.
 */

import { db } from '@/lib/db';
import type { UserRole } from '@matchflow/types';

// ---------------------------------------------------------------------------
// Zone definitions — mirrors §6 schema: CongestionZone { zoneId, densityScore }
// ---------------------------------------------------------------------------
const ZONES = ['Zone_A', 'Zone_B', 'Zone_C', 'Zone_D'];

// Starting density scores (seeded — makes demo reproducible)
const SEED_SCORES: Record<string, number> = {
  Zone_A: 0.32,
  Zone_B: 0.18,
  Zone_C: 0.45,
  Zone_D: 0.25,
};

// Bounded random-walk parameters
const DRIFT_STRENGTH = 0.04;   // max change per tick
const MIN_DENSITY   = 0.05;
const MAX_DENSITY   = 0.95;

// Current in-memory state
const _state: Record<string, number> = { ...SEED_SCORES };

// ---------------------------------------------------------------------------
// Scripted demo spikes (§16)
// ---------------------------------------------------------------------------
// These trigger automatically at elapsed ms from simulation start, producing
// the "same event, two views" reveal: fan route avoids Zone_A, ops console
// shows Zone_A incident in the same window.
const DEMO_SPIKES: Array<{ afterMs: number; zone: string; targetDensity: number; durationMs: number }> = [
  { afterMs: 20_000, zone: 'Zone_A', targetDensity: 0.88, durationMs: 45_000 }, // halftime surge
  { afterMs: 90_000, zone: 'Zone_C', targetDensity: 0.82, durationMs: 30_000 }, // food rush
  { afterMs: 150_000, zone: 'Zone_B', targetDensity: 0.76, durationMs: 25_000 }, // exit wave
];

let _startTime = 0;
let _activeSpikeEndTimes: Record<string, number> = {};

// ---------------------------------------------------------------------------
// Seeded PRNG — same seed ⟹ same sequence (reproducible demo)
// ---------------------------------------------------------------------------
let _seed = 42;
function seededRandom(): number {
  _seed = (_seed * 16807 + 0) % 2147483647;
  return (_seed - 1) / 2147483646;
}

/** Applies the scripted demo spikes based on elapsed time. */
function applyDemoSpikes(elapsedMs: number): void {
  const now = Date.now();
  for (const spike of DEMO_SPIKES) {
    if (elapsedMs >= spike.afterMs) {
      const spikeEnd = _startTime + spike.afterMs + spike.durationMs;
      if (now < spikeEnd) {
        // Spike is active — blend toward target density
        const blend = 0.25; // how aggressively we pull toward target
        _state[spike.zone] = _state[spike.zone] + blend * (spike.targetDensity - _state[spike.zone]);
        _activeSpikeEndTimes[spike.zone] = spikeEnd;
      } else if (_activeSpikeEndTimes[spike.zone] && now >= _activeSpikeEndTimes[spike.zone]) {
        // Spike expired — let random walk resume naturally
        delete _activeSpikeEndTimes[spike.zone];
      }
    }
  }
}

/** One simulation tick — update all zones and write to Firestore. */
async function tick(role: UserRole): Promise<void> {
  const elapsedMs = Date.now() - _startTime;

  // Apply scripted demo spikes first
  applyDemoSpikes(elapsedMs);

  // Random walk for all zones (respects active spike overrides)
  for (const zone of ZONES) {
    if (_activeSpikeEndTimes[zone]) continue; // spike is driving this zone
    const drift = (seededRandom() - 0.5) * 2 * DRIFT_STRENGTH;
    _state[zone] = Math.min(MAX_DENSITY, Math.max(MIN_DENSITY, _state[zone] + drift));
  }

  // Write updated scores to Firestore congestionState collection
  const db_ = db;
  const batch = ZONES.map(zone => ({
    zoneId: zone,
    densityScore: parseFloat(_state[zone].toFixed(3)),
    lastUpdated: Date.now(),
    trend: 'stable' as const,
  }));

  // Fire-and-forget writes — don't block the tick interval
  try {
    await db_.writeCongestionBatch(batch);
  } catch {
    // Silently swallow write errors — simulation continues
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
let _tickIntervalId: ReturnType<typeof setInterval> | null = null;
const TICK_INTERVAL_MS = 8_000; // 8-second tick — matches §6 "fixed tick interval"

/**
 * Start the simulation engine. Idempotent — calling multiple times is safe.
 * @param role — must be 'organizer' to publish congestion; enforced server-side
 *               in /api/simulate (RBAC: organizer-only write to congestionState).
 */
export function startCongestionSimulation(role: UserRole): void {
  // In production, congestion writes are organizer-only (enforced server-side in
  // /api/simulate via apps/web/src/lib/rbac.ts). Only an organizer-driven session
  // may run the simulation that publishes density scores; other roles simply
  // consume the live feed.
  if (role !== 'organizer') {
    console.info('[CongestionSimulator] Skipped — only organizers publish congestion (role: ' + role + ')');
    return;
  }
  if (_tickIntervalId) return; // already running
  _startTime = Date.now();
  _seed = 42; // reset seed for reproducibility

  console.info('[CongestionSimulator] Starting — seeded random-walk with demo spikes wired');
  // Run first tick immediately so the UI has data on load
  tick(role).catch(() => {});
  _tickIntervalId = setInterval(() => tick(role).catch(() => {}), TICK_INTERVAL_MS);
}

/** Stop the simulation. */
export function stopCongestionSimulation(): void {
  if (_tickIntervalId) {
    clearInterval(_tickIntervalId);
    _tickIntervalId = null;
    console.info('[CongestionSimulator] Stopped');
  }
}

/** Returns current in-memory state (for testing). */
export function getSimulatorState(): Readonly<Record<string, number>> {
  return { ..._state };
}

/** Trigger a named demo spike immediately (for demo presentation control). */
export function triggerDemoSpike(zone: string, targetDensity: number, durationMs: number): void {
  console.info(`[CongestionSimulator] Manual demo spike: ${zone} → ${targetDensity}`);
  _state[zone] = targetDensity;
  _activeSpikeEndTimes[zone] = Date.now() + durationMs;
}
