'use client';

/**
 * congestion-simulator.ts — §6 Seeded Congestion Simulation (client driver)
 *
 * This module is a thin *driver* for the simulation. The actual deterministic
 * engine — a seeded bounded random-walk (seed 42) plus the scripted §16 demo
 * spikes — lives server-side in apps/web/app/api/simulate/route.ts so the
 * published density sequence is reproducible and identical for every viewer
 * (the "same event, two views" reveal fires on cue).
 *
 * The client advances a MONOTONIC TICK COUNTER and asks the route to generate
 * the next snapshot. It never computes its own random walk.
 *
 * Architecture note: this is a *swappable simulation layer* — in production,
 * replace the tick driver with a real sensor/turnstile feed adapter that calls
 * the same /api/simulate endpoint, without touching any Flow Engine consuming
 * logic. See §6 TRD.
 */

import { db } from '@/lib/db';
import type { UserRole } from '@matchflow/types';

const ZONES = ['Zone_A', 'Zone_B', 'Zone_C', 'Zone_D'];

// Monotonic tick counter — the single knob that drives reproducibility.
// The route maps tick → elapsedMs (tick * TICK_INTERVAL_MS) deterministically.
let _tick = 0;
let _tickIntervalId: ReturnType<typeof setInterval> | null = null;
const TICK_INTERVAL_MS = 8_000; // 8-second tick — matches §6 "fixed tick interval"

/** One simulation tick — delegate to the deterministic server simulator. */
async function tick(role: UserRole): Promise<void> {
  try {
    // First tick (counter 0) also issues reset so every run starts from SEED.
    await db.writeCongestionBatch(undefined, { tick: _tick, reset: _tick === 0 });
  } catch (err) {
    // Write errors are non-fatal — simulation continues on the next tick
    console.warn('[CongestionSimulator] Tick failed:', err);
  }
  _tick += 1;
}

/**
 * Start the simulation engine. Idempotent — calling multiple times is safe.
 * @param role — must be 'organizer' to publish congestion; enforced server-side
 *               in /api/simulate (RBAC: organizer-only write to congestionState).
 */
export function startCongestionSimulation(role: UserRole): void {
  if (role !== 'organizer') {
    return;
  }
  if (_tickIntervalId) return; // already running
  _tick = 0;

  // Run first tick immediately so the UI has data on load.
  tick(role).catch((err) => console.warn('[CongestionSimulator] Initial tick failed:', err));
  _tickIntervalId = setInterval(
    () =>
      tick(role).catch((err) => console.warn('[CongestionSimulator] Interval tick failed:', err)),
    TICK_INTERVAL_MS,
  );
}

/** Stop the simulation. */
export function stopCongestionSimulation(): void {
  if (_tickIntervalId) {
    clearInterval(_tickIntervalId);
    _tickIntervalId = null;
  }
}

/**
 * Trigger a named demo spike immediately (for demo presentation control).
 * Delegates to the route as an explicit score override for the zone.
 */
export function triggerDemoSpike(zone: string, targetDensity: number, durationMs: number): void {
  if (!ZONES.includes(zone)) {
    return;
  }
  void db.writeCongestionBatch([{ zoneId: zone, densityScore: targetDensity }]);
  void durationMs; // server spike duration is governed by the scripted timeline
}
