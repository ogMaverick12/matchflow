'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from '@/context/SessionContext';
import { db, runSimulatorTick } from '@/lib/db';
import { Incident, CongestionZone } from '@matchflow/types';
import { SeverityBadge, AlertTriangle, AlertCircle, CheckCircle, Info } from '@matchflow/ui';
import { Play, RefreshCw, Layers } from 'lucide-react';

export default function DashboardPage() {
  const { session, simulateOffline } = useSession();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [zones, setZones] = useState<CongestionZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Security Verification states
  const [verificationResult, setVerificationResult] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Subscriptions to incidents and congestion state
  useEffect(() => {
    if (simulateOffline) {
      setError('Connection Offline. Ops Dashboard disconnected.');
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);

    const unsubIncidents = db.subscribeToIncidents(
      session.role,
      (liveIncidents) => {
        setIncidents(liveIncidents);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    const unsubCongestion = db.subscribeToCongestion(
      session.role,
      (liveZones) => {
        setZones(liveZones);
      },
      (err) => {
        setError(err.message);
      }
    );

    return () => {
      unsubIncidents();
      unsubCongestion();
    };
  }, [session.role, simulateOffline]);

  // Run a manual simulator tick
  const triggerSimulatorTick = () => {
    runSimulatorTick();
  };

  // Real proof: mint a fan token, then hit the protected /api/db?coll=incidents
  // endpoint with that token. The server verifies the role from the signed
  // token and must reject the read — no client-side simulation.
  const verifyCrossRoleRead = async () => {
    setVerifying(true);
    setVerificationResult(null);
    try {
      const { status, ok } = await db.proveFanCannotReadIncidents();
      if (ok) {
        setVerificationResult(`✅ PASS: server rejected fan read of incidents (HTTP ${status}). Access is enforced server-side in the API layer (Upstash-backed, role-verified tokens).`);
      } else {
        setVerificationResult(`❌ FAIL: server allowed a fan to read incidents (HTTP ${status}).`);
      }
    } catch (err: any) {
      setVerificationResult(`❌ ERROR: verification request failed — "${err?.message ?? err}".`);
    } finally {
      setVerifying(false);
    }
  };

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <div className="glass-panel" style={{
          borderColor: 'var(--alert-accent)',
          padding: '24px',
          textAlign: 'center',
        }}>
          <AlertTriangle size={40} color="var(--alert-accent)" style={{ marginBottom: '12px', display: 'inline-block' }} />
          <h3 className="display-title" style={{ margin: '0 0 8px 0', color: 'var(--alert-accent)', fontSize: '20px' }}>
            OPS DASHBOARD OFFLINE
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  const activeIncidents = incidents.filter(i => i.status !== 'resolved');
  const highCongestionCount = zones.filter(z => z.densityScore >= 0.7).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 className="display-title" style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 4px 0' }}>
            Venue Operations Dashboard
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
            Incident Triage and Dispatch Command Feed
          </p>
        </div>
        
        {/* Simulator controls */}
        <button
          onClick={triggerSimulatorTick}
          style={{
            padding: '10px 18px',
            backgroundColor: 'var(--bg-surface-elevated)',
            color: 'var(--primary-accent)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background-color 200ms ease'
          }}
        >
          <Play size={14} />
          <span>Force Simulator Tick</span>
        </button>
      </div>

      {/* Live Health Summary Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
            Active Incidents
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeIncidents.length > 0 ? (
              <AlertTriangle size={18} color="var(--alert-accent)" />
            ) : (
              <CheckCircle size={18} color="var(--secondary-accent)" />
            )}
            <span className="numeric-glow" style={{ fontSize: '28px', fontWeight: 'bold', color: activeIncidents.length > 0 ? 'var(--alert-accent)' : 'var(--text-primary)' }}>
              {activeIncidents.length}
            </span>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
            Congested Zones
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {highCongestionCount > 0 ? (
              <AlertCircle size={18} color="var(--primary-accent)" />
            ) : (
              <CheckCircle size={18} color="var(--secondary-accent)" />
            )}
            <span className="numeric-glow" style={{ fontSize: '28px', fontWeight: 'bold', color: highCongestionCount > 0 ? 'var(--primary-accent)' : 'var(--text-primary)' }}>
              {highCongestionCount}
            </span>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
            System Status
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} color="var(--secondary-accent)" />
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--secondary-accent)', fontFamily: "'Space Grotesk', sans-serif" }}>
              NORMAL
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Incident Feed Column */}
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 16px 0', fontFamily: "'Space Grotesk', sans-serif" }}>
            Incident Intelligence Feed
          </h3>
          
          {loading ? (
            <p style={{ color: 'var(--text-secondary)' }}>Loading feed...</p>
          ) : incidents.length === 0 ? (
            <div className="glass-panel" style={{
              padding: '48px 16px',
              borderStyle: 'dashed',
              textAlign: 'center',
              color: 'var(--text-secondary)'
            }}>
              All zones normal. No incidents reported.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {incidents.map(inc => (
                <div key={inc.id} className="glass-panel" style={{
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <SeverityBadge severity={inc.severity} />
                      <span style={{ fontWeight: 'bold', fontSize: '16px', fontFamily: "'Space Grotesk', sans-serif" }}>
                        {inc.summary}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {inc.description}
                    </p>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Location: {inc.zoneId} · Status: <span style={{ fontWeight: 'bold', color: 'var(--primary-accent)' }}>{inc.status.toUpperCase()}</span>
                    </div>
                  </div>
                  <Link href={`/incidents/${inc.id}`} style={{
                    padding: '8px 16px',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    color: 'var(--primary-accent)',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    border: '1px solid var(--border-color)',
                    transition: 'background-color 200ms ease'
                  }}>
                    Review
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Concourse Heatmap Summary */}
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 16px 0', fontFamily: "'Space Grotesk', sans-serif" }}>
            Concourse Heatmap Overview
          </h3>
          <div className="glass-panel" style={{
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {zones.map(zone => (
              <div key={zone.zoneId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                <span style={{ fontWeight: 'bold' }}>{zone.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '60px',
                    height: '8px',
                    backgroundColor: 'var(--border-color)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${zone.densityScore * 100}%`,
                      height: '100%',
                      backgroundColor: zone.densityScore >= 0.7 
                        ? 'var(--alert-accent)' 
                        : zone.densityScore >= 0.4 
                          ? 'var(--primary-accent)' 
                          : 'var(--secondary-accent)'
                    }} />
                  </div>
                  <span className="numeric-glow" style={{ fontWeight: 'bold', width: '36px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {(zone.densityScore * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rules Validation / Prove Gating Section */}
      <div className="glass-panel" style={{
        padding: '24px',
        borderColor: 'var(--primary-accent)',
        marginTop: '32px'
      }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', color: 'var(--text-primary)', fontWeight: 'bold', fontFamily: "'Space Grotesk', sans-serif" }}>
          Security Check: Prove Server-Side Gating
        </h4>
        <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          This mints a throwaway <code>fan</code> session token and calls the protected <code>/api/db?coll=incidents</code> endpoint with it. Access control is enforced server-side in the API layer (Upstash-backed, role-verified tokens) — a fan must be rejected. (The legacy <code>firestore.rules</code> file remains only as documented reference for the Firebase deployment path.)
        </p>

        <button
          onClick={verifyCrossRoleRead}
          disabled={verifying}
          style={{
            padding: '10px 20px',
            backgroundColor: 'var(--primary-accent)',
            color: '#000000',
            fontWeight: 'bold',
            borderRadius: '6px',
            border: 'none',
            fontSize: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px 0 rgba(251, 191, 36, 0.3)',
            transition: 'transform 150ms ease'
          }}
        >
          <RefreshCw size={14} className={verifying ? 'animate-spin' : ''} />
          <span>{verifying ? 'Testing Rules...' : 'Trigger Cross-Role Read Proof'}</span>
        </button>

        {verificationResult && (
          <div className="glass-panel" style={{
            marginTop: '16px',
            padding: '12px 16px',
            fontSize: '13px',
            fontFamily: 'monospace',
            color: 'var(--secondary-accent)',
            wordBreak: 'break-all'
          }}>
            {verificationResult}
          </div>
        )}
      </div>
    </div>
  );
}
