import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { verifySession, extractToken } from '@/lib/auth';
import { enforceServer, AuthError } from '@/lib/rbac';

// Server-side congestion simulator. Organizer POSTs here to publish a density
// snapshot into the shared store. Writing congestionState is organizer-only
// (see RBAC matrix), so this requires a verified organizer token.
//
// Determinism: this route is the single source of the demo congestion feed.
// It drives a bounded, SEEDED random-walk (seed 42) with scripted §16 demo
// spikes, advanced by a MONOTONIC TICK COUNTER. The same sequence reproduces
// every run — the §16 "same event, two views" reveal fires on cue. The client
// simulator (congestion-simulator.ts) delegates here by sending { tick } (or
// { reset } to restart the sequence); explicit `scores` override when provided
// for manual dispatches.

const ZONES = ['Zone_A', 'Zone_B', 'Zone_C', 'Zone_D'];
const SEED: Record<string, number> = { Zone_A: 0.32, Zone_B: 0.18, Zone_C: 0.45, Zone_D: 0.25 };

// Bounded random-walk parameters (mirrors §6 simulator)
const DRIFT_STRENGTH = 0.04; // max change per tick
const MIN_DENSITY = 0.05;
const MAX_DENSITY = 0.95;
const TICK_INTERVAL_MS = 8_000; // 8s tick — matches §6 fixed interval

// Scripted demo spikes (§16) — keyed on elapsed ms from simulation start.
const DEMO_SPIKES: Array<{ afterMs: number; zone: string; targetDensity: number; durationMs: number }> = [
  { afterMs: 20_000, zone: 'Zone_A', targetDensity: 0.88, durationMs: 45_000 }, // halftime surge
  { afterMs: 90_000, zone: 'Zone_C', targetDensity: 0.82, durationMs: 30_000 }, // food rush
  { afterMs: 150_000, zone: 'Zone_B', targetDensity: 0.76, durationMs: 25_000 }, // exit wave
];

// ---------------------------------------------------------------------------
// Monotonic, reproducible simulation state
// ---------------------------------------------------------------------------
let _state: Record<string, number> = { ...SEED };
let _seed = 42;
let _tick = 0; // monotonic tick counter — drives reproducibility
let _activeSpikeEnd: Record<string, number> = {}; // zone -> elapsedMs end

function resetSim(): void {
  _state = { ...SEED };
  _seed = 42;
  _tick = 0;
  _activeSpikeEnd = {};
}

// Seeded PRNG (LCG) — same seed ⇒ same sequence every run.
function seededRandom(): number {
  _seed = (_seed * 16807) % 2147483647;
  return (_seed - 1) / 2147483646;
}

// Advance one tick. `elapsedMs` is derived deterministically from the tick
// counter (or supplied explicitly) so spikes fire on cue regardless of clock.
function step(elapsedMs: number): void {
  for (const spike of DEMO_SPIKES) {
    if (elapsedMs >= spike.afterMs) {
      const end = spike.afterMs + spike.durationMs;
      if (elapsedMs < end) {
        // Spike active — blend toward target density.
        const blend = 0.25;
        _state[spike.zone] = _state[spike.zone] + blend * (spike.targetDensity - _state[spike.zone]);
        _activeSpikeEnd[spike.zone] = end;
        continue;
      } else if (_activeSpikeEnd[spike.zone] && elapsedMs >= _activeSpikeEnd[spike.zone]) {
        delete _activeSpikeEnd[spike.zone];
      }
    }
  }

  // Seeded bounded random-walk for zones not currently spike-driven.
  for (const z of ZONES) {
    if (_activeSpikeEnd[z]) continue;
    const drift = (seededRandom() - 0.5) * 2 * DRIFT_STRENGTH;
    _state[z] = Math.min(MAX_DENSITY, Math.max(MIN_DENSITY, _state[z] + drift));
  }
}

// ---------------------------------------------------------------------------
// Persisted state helpers
// ---------------------------------------------------------------------------
const KV_READY = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

async function setState(rows: Array<{ zoneId: string; densityScore: number }>) {
  if (!KV_READY) return;
  try { await kv.set('congestionState', rows); } catch { /* in-memory fallback below */ }
}

function toRows(): Array<{ zoneId: string; name: string; level: string; densityScore: number; lastUpdated: number; trend: 'stable' }> {
  return ZONES.map((z) => ({
    zoneId: z,
    name: z.replace('_', ' '),
    level: '100',
    densityScore: parseFloat(_state[z].toFixed(3)),
    lastUpdated: Date.now(),
    trend: 'stable' as const,
  }));
}

export async function POST(req: NextRequest) {
  try {
    const claims = await verifySession(extractToken(req));
    if (!claims) throw new AuthError('Missing or invalid session token.', 401);
    enforceServer(claims.role, 'write', 'congestionState');

    const body = (await req.json().catch(() => ({}))) as {
      scores?: Record<string, number>;
      tick?: number;
      elapsedMs?: number;
      reset?: boolean;
    };

    const incoming = (body.scores || {}) as Record<string, number>;
    const hasExplicitScores = ZONES.some((z) => typeof incoming[z] === 'number');

    // Restart the reproducible sequence on demand.
    if (body.reset) resetSim();

    if (hasExplicitScores) {
      // Manual override (e.g. a dispatched spike) — honor provided scores.
      for (const z of ZONES) {
        if (typeof incoming[z] === 'number') _state[z] = incoming[z];
      }
    } else {
      // Deterministic tick: prefer an explicit tick counter, fall back to
      // elapsedMs, otherwise advance the internal monotonic counter.
      let elapsedMs: number;
      if (typeof body.tick === 'number') {
        _tick = body.tick;
        elapsedMs = _tick * TICK_INTERVAL_MS;
      } else if (typeof body.elapsedMs === 'number') {
        elapsedMs = body.elapsedMs;
      } else {
        elapsedMs = _tick * TICK_INTERVAL_MS;
        _tick += 1;
      }
      step(elapsedMs);
    }

    const rows = toRows();
    await setState(rows);

    return NextResponse.json({ data: rows, tick: _tick });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.message, code: err.status === 403 ? 'permission-denied' : 'unauthenticated' },
        { status: err.status }
      );
    }
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
