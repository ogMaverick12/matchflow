'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/context/SessionContext';
import { db, rankEgressOptions } from '@/lib/db';
import { CongestionZone } from '@matchflow/types';
import { Navigation, Train, Car, Zap, Loader } from 'lucide-react';
import { AlertTriangle, CheckCircle } from '@matchflow/ui';
import { logEvent } from '@/lib/analytics';

// ---------------------------------------------------------------------------
// Egress options data — static definitions, live ranking from Gemini
// ---------------------------------------------------------------------------
const EGRESS_OPTIONS = [
  {
    id: 'marta_rail',
    name: 'MARTA Rail Link',
    gate: 'Gate 1 (North)',
    type: 'transit' as const,
    estimatedMinutes: 15,
    currentQueueScore: 0.2, // updated live from congestion feed
    sustainabilityScore: 0.92, // very green — electric rail
    icon: 'train' as const,
    detail: 'Direct access via Gate 1. Trains every 4 min. Free route guide at concourse.',
  },
  {
    id: 'rideshare_c',
    name: 'Rideshare Zone C',
    gate: 'Gate 3 (South)',
    type: 'rideshare' as const,
    estimatedMinutes: 45,
    currentQueueScore: 0.78,
    sustainabilityScore: 0.25,
    icon: 'car' as const,
    detail: 'Rideshare queues delayed — perimeter road traffic. Surge pricing likely.',
  },
  {
    id: 'walk_d',
    name: 'Walk to Parking D',
    gate: 'Gate 4 (West)',
    type: 'walk' as const,
    estimatedMinutes: 12,
    currentQueueScore: 0.35,
    sustainabilityScore: 0.6,
    icon: 'walk' as const,
    detail: 'Short walk to surface lot. Lower congestion than south perimeter.',
  },
];

interface RankedOption {
  id: string;
  rank: number;
  rationale: string;
  recommended: boolean;
}

export default function ExitPlannerPage() {
  const { session, simulateOffline } = { ...useSession() };
  const [zones, setZones] = useState<CongestionZone[]>([]);
  const [rankedOptions, setRankedOptions] = useState<RankedOption[] | null>(null);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isRanking, setIsRanking] = useState(false);
  const [rankingError, setRankingError] = useState(false);

  // Subscribe to live congestion feed
  useEffect(() => {
    if (simulateOffline) return;
    const unsubscribe = db.subscribeToCongestion(session.role, (liveZones) => {
      setZones(liveZones);
    });
    return () => unsubscribe();
  }, [session.role, simulateOffline]);

  // ---------------------------------------------------------------------------
  // §4B §7: Gemini-powered egress ranking
  // Replaces the bare if/else comparison with a real AI-ranked recommendation.
  // Falls back to deterministic sort if Gemini times out or is unavailable.
  // ---------------------------------------------------------------------------
  const rankOptions = useCallback(async () => {
    setIsRanking(true);
    setRankingError(false);

    const zoneScores: Record<string, number> = {};
    zones.forEach((z) => {
      zoneScores[z.zoneId] = z.densityScore;
    });

    // Update queue scores from live congestion data
    const liveOptions = EGRESS_OPTIONS.map((opt) => ({
      ...opt,
      currentQueueScore:
        opt.id === 'marta_rail'
          ? (zoneScores['Zone_A'] ?? 0.2)
          : opt.id === 'rideshare_c'
            ? (zoneScores['Zone_C'] ?? 0.78)
            : (zoneScores['Zone_D'] ?? 0.35),
    }));

    const callStart = performance.now();

    try {
      const result = await rankEgressOptions({
        sessionId: session.sessionId,
        userId: session.userId,
        role: session.role,
        zoneScores,
        options: liveOptions,
      });

      if (result.success && result.data) {
        setRankedOptions(result.data.rankedOptions);
        setAiSummary(result.data.summary);
        // §5 Analytics: log egress ranking latency
        logEvent({
          type: 'concierge_query',
          sessionId: session.sessionId,
          language: session.language,
          category: 'exit_planning',
          fallbackTriggered: false,
          latencyMs: Math.round(performance.now() - callStart),
        });
      } else {
        throw new Error(result.error?.message ?? 'rankEgressOptions failed');
      }
    } catch (err) {
      console.warn('[ExitPlanner] AI ranking failed, using deterministic sort:', err);
      setRankingError(true);
      // §13: Deterministic fallback — sort by combined score
      const sorted = [...EGRESS_OPTIONS].sort((a, b) => {
        const scoreA =
          (1 - a.currentQueueScore) * 0.5 +
          a.sustainabilityScore * 0.3 +
          (1 - a.estimatedMinutes / 60) * 0.2;
        const scoreB =
          (1 - b.currentQueueScore) * 0.5 +
          b.sustainabilityScore * 0.3 +
          (1 - b.estimatedMinutes / 60) * 0.2;
        return scoreB - scoreA;
      });
      setRankedOptions(
        sorted.map((o, i) => ({
          id: o.id,
          rank: i + 1,
          rationale: 'Ranked by speed + sustainability.',
          recommended: i === 0,
        })),
      );
      setAiSummary(
        `${sorted[0].name} via ${sorted[0].gate} is the fastest option (est. ${sorted[0].estimatedMinutes} min).`,
      );
      logEvent({
        type: 'fallback_triggered',
        sessionId: session.sessionId,
        surface: 'concierge',
        reason: String(err),
      });
    } finally {
      setIsRanking(false);
    }
  }, [zones, session]);

  // Auto-rank when congestion data is loaded
  useEffect(() => {
    if (zones.length > 0 && !rankedOptions && !isRanking) {
      rankOptions();
    }
  }, [zones, rankedOptions, isRanking, rankOptions]);

  // ---------------------------------------------------------------------------
  // Helper: get the display option for a ranked entry
  // ---------------------------------------------------------------------------
  const getOption = (id: string) => EGRESS_OPTIONS.find((o) => o.id === id)!;
  const ranked = rankedOptions
    ? [...rankedOptions]
        .sort((a, b) => a.rank - b.rank)
        .map((r) => ({ ...r, option: getOption(r.id) }))
        .filter((r) => r.option)
    : EGRESS_OPTIONS.map((o, i) => ({
        id: o.id,
        rank: i + 1,
        rationale: '',
        recommended: i === 0,
        option: o,
      }));

  const bestOption = ranked[0]?.option;
  const zoneACongestion = zones.find((z) => z.zoneId === 'Zone_A')?.densityScore ?? 0.2;
  const zoneCCongestion = zones.find((z) => z.zoneId === 'Zone_C')?.densityScore ?? 0.2;
  const bestExitTime =
    zoneACongestion > 0.7 || zoneCCongestion > 0.7
      ? 'Wait 20 mins for crowd clearance'
      : 'Exit now — clear path';

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto' }}>
      <h1
        className="display-title"
        style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}
      >
        Post-Match Exit Planner
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 24px 0' }}>
        AI-ranked transit options · Live congestion · Carbon-nudging
      </p>

      {/* AI Ranking status */}
      {isRanking && (
        <div
          role="status"
          aria-live="polite"
          aria-label="Matchflow AI is ranking your egress options, please wait"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-surface)',
            marginBottom: '16px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
          }}
        >
          <Loader size={14} className="spin" aria-hidden="true" />
          <span>Matchflow AI is ranking your options based on live congestion…</span>
        </div>
      )}

      {/* AI summary badge */}
      {aiSummary && !isRanking && (
        <div
          role="note"
          aria-label={`AI recommendation: ${aiSummary}`}
          style={{
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '20px',
            border: '1px solid var(--primary-accent)',
            backgroundColor: 'rgba(251,191,36,0.08)',
            fontSize: '14px',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
          }}
        >
          <Zap
            size={16}
            color="var(--primary-accent)"
            aria-hidden="true"
            style={{ flexShrink: 0, marginTop: 1 }}
          />
          <span>
            <strong style={{ color: 'var(--primary-accent)' }}>
              {rankingError ? 'Deterministic ranking' : 'AI recommendation'}:
            </strong>{' '}
            {aiSummary}
          </span>
        </div>
      )}

      {/* Primary recommendation card */}
      {bestOption && (
        <div
          className="glass-panel"
          style={{ borderColor: 'var(--primary-accent)', padding: '20px', marginBottom: '24px' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
              color: 'var(--primary-accent)',
            }}
          >
            <Navigation size={20} aria-hidden="true" />
            <h2
              style={{
                margin: 0,
                fontWeight: 'bold',
                fontSize: '16px',
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              RECOMMENDED EGRESS ROUTE
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  display: 'block',
                  fontWeight: 'bold',
                  marginBottom: '4px',
                }}
              >
                BEST GATE
              </span>
              <span
                style={{
                  fontWeight: 'bold',
                  fontSize: '20px',
                  color: 'var(--text-primary)',
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                {bestOption.gate}
              </span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginTop: '8px',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    display: 'block',
                    fontWeight: 'bold',
                    marginBottom: '4px',
                  }}
                >
                  EST. TRAVEL TIME
                </span>
                <span
                  style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '16px' }}
                >
                  {bestOption.estimatedMinutes} mins
                </span>
              </div>
              <div>
                <span
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    display: 'block',
                    fontWeight: 'bold',
                    marginBottom: '4px',
                  }}
                >
                  DEPARTURE STATUS
                </span>
                <span
                  style={{ fontWeight: 'bold', color: 'var(--secondary-accent)', fontSize: '16px' }}
                >
                  {bestExitTime}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ranked transit options */}
      <h2
        style={{
          fontSize: '16px',
          fontWeight: 'bold',
          margin: '0 0 16px 0',
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        All Egress Options{' '}
        {rankedOptions && (
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
            — AI ranked
          </span>
        )}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {ranked.map(({ rank, rationale, recommended, option }) => {
          const queuePct = Math.round(option.currentQueueScore * 100);
          const greenPct = Math.round(option.sustainabilityScore * 100);
          const isGreen = option.sustainabilityScore >= 0.6;
          const isCongested = option.currentQueueScore >= 0.6;

          return (
            <div
              key={option.id}
              className="glass-panel"
              style={{
                padding: '16px',
                borderColor: recommended ? 'var(--primary-accent)' : undefined,
                opacity: isRanking ? 0.6 : 1,
                transition: 'opacity 200ms ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 'bold',
                    fontSize: '15px',
                  }}
                >
                  {option.icon === 'train' ? (
                    <Train
                      size={18}
                      color={isGreen ? 'var(--secondary-accent)' : 'var(--text-secondary)'}
                      aria-hidden="true"
                    />
                  ) : option.icon === 'car' ? (
                    <Car size={18} color="var(--alert-accent)" aria-hidden="true" />
                  ) : (
                    <Navigation size={18} color="var(--text-secondary)" aria-hidden="true" />
                  )}
                  <span>{option.name}</span>
                  {recommended && (
                    <span
                      style={{
                        fontSize: '10px',
                        backgroundColor: 'rgba(251,191,36,0.15)',
                        color: 'var(--primary-accent)',
                        border: '1px solid var(--primary-accent)',
                        borderRadius: '4px',
                        padding: '1px 6px',
                        fontWeight: 'bold',
                      }}
                    >
                      #{rank} BEST
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '3px 10px',
                    backgroundColor: isCongested ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                    color: isCongested ? 'var(--alert-accent)' : 'var(--secondary-accent)',
                    border: `1px solid ${isCongested ? 'var(--alert-accent)' : 'var(--secondary-accent)'}`,
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {isCongested ? (
                    <AlertTriangle size={11} aria-hidden="true" />
                  ) : (
                    <CheckCircle size={11} aria-hidden="true" />
                  )}
                  <span>{isCongested ? 'CONGESTED' : 'CLEAR'}</span>
                </span>
              </div>

              <p
                style={{
                  margin: '0 0 10px 0',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                {option.detail}
              </p>

              {/* Rationale from AI */}
              {rationale && (
                <p
                  style={{
                    margin: '0 0 10px 0',
                    fontSize: '12px',
                    color: 'var(--primary-accent)',
                    fontStyle: 'italic',
                  }}
                >
                  {rationale}
                </p>
              )}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '8px',
                  fontSize: '12px',
                }}
              >
                <div>
                  <span
                    style={{
                      color: 'var(--text-secondary)',
                      display: 'block',
                      fontSize: '10px',
                      fontWeight: 'bold',
                    }}
                  >
                    ETA
                  </span>
                  <span style={{ fontWeight: 'bold' }}>{option.estimatedMinutes} min</span>
                </div>
                <div>
                  <span
                    style={{
                      color: 'var(--text-secondary)',
                      display: 'block',
                      fontSize: '10px',
                      fontWeight: 'bold',
                    }}
                  >
                    QUEUE
                  </span>
                  <span
                    style={{
                      fontWeight: 'bold',
                      color: isCongested ? 'var(--alert-accent)' : 'var(--secondary-accent)',
                    }}
                  >
                    {queuePct}%
                  </span>
                </div>
                <div>
                  <span
                    style={{
                      color: 'var(--text-secondary)',
                      display: 'block',
                      fontSize: '10px',
                      fontWeight: 'bold',
                    }}
                  >
                    GREEN
                  </span>
                  <span
                    style={{
                      fontWeight: 'bold',
                      color: isGreen ? 'var(--secondary-accent)' : 'var(--text-secondary)',
                    }}
                  >
                    {greenPct}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Refresh ranking button */}
      <button
        onClick={rankOptions}
        disabled={isRanking || simulateOffline}
        aria-label="Refresh AI-ranked egress options with latest congestion data"
        style={{
          marginTop: '20px',
          width: '100%',
          padding: '12px',
          borderRadius: '6px',
          border: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: isRanking || simulateOffline ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          opacity: isRanking || simulateOffline ? 0.5 : 1,
        }}
      >
        <Zap size={14} aria-hidden="true" />
        Re-rank with latest congestion
      </button>
    </div>
  );
}
