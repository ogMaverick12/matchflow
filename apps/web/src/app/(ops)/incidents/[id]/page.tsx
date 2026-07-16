'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import { db } from '@/lib/db';
import { Incident, Dispatch, Report } from '@matchflow/types';
import { SeverityBadge, AlertTriangle, AlertCircle, CheckCircle } from '@matchflow/ui';
import { ArrowLeft, UserPlus } from 'lucide-react';

export default function IncidentDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { session, simulateOffline } = useSession();
  
  const [incident, setIncident] = useState<Incident | null>(null);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (simulateOffline) {
      setError('Connection Offline. Cannot load incident intelligence.');
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);

    const unsubIncidents = db.subscribeToIncidents(session.role, (liveIncidents) => {
      const match = liveIncidents.find(i => i.id === id);
      setIncident(match || null);
    }, (err) => setError(err.message));

    const unsubDispatches = db.subscribeToDispatches(session.role, (liveDispatches) => {
      setDispatches(liveDispatches.filter(d => d.incidentId === id));
      setLoading(false);
    }, (err) => setError(err.message));

    const unsubReports = db.subscribeToReports(session.role, session.userId, (liveReports) => {
      setReports(liveReports);
    });

    return () => {
      unsubIncidents();
      unsubDispatches();
      unsubReports();
    };
  }, [id, session.role, session.userId, simulateOffline]);

  const handleApproveDispatch = async (dispatchId: string) => {
    setActionSuccess(null);
    try {
      await db.updateDispatchStatus(session.role, dispatchId, 'dispatched');
      await db.updateIncidentStatus(session.role, id, 'dispatched');
      setActionSuccess('Dispatch deployment approved! Field notifications sent.');
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateManualDispatch = async () => {
    setActionSuccess(null);
    try {
      await db.createDispatch(session.role, {
        incidentId: id,
        staffName: 'Staff Member Priya',
        role: 'staff',
        status: 'proposed',
        suggestedBy: 'human'
      });
      setActionSuccess('Manual dispatch team proposed.');
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
        <span className="numeric-glow" style={{ fontSize: '15px' }}>Loading incident profile...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <div className="glass-panel" style={{ borderColor: 'var(--alert-accent)', padding: '24px', color: 'var(--alert-accent)' }}>
          <AlertTriangle size={32} style={{ marginBottom: '12px' }} />
          <h4 className="display-title" style={{ color: 'var(--alert-accent)', margin: '0 0 8px 0' }}>Error Loading Incident</h4>
          <p style={{ margin: 0, color: 'var(--text-primary)' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div style={{ padding: '40px 16px', textAlign: 'center' }}>
        <h3 className="display-title" style={{ fontSize: '22px', marginBottom: '16px' }}>Incident profile not found</h3>
        <Link href="/dashboard" style={{ color: 'var(--primary-accent)', fontWeight: 'bold' }}>Return to Dashboard</Link>
      </div>
    );
  }

  const isIncidentActive = incident.status === 'active' || incident.status === 'dispatched';

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Link href="/dashboard" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        color: 'var(--text-secondary)',
        fontSize: '14px',
        marginBottom: '24px',
        textDecoration: 'none',
        transition: 'color 200ms ease'
      }}>
        <ArrowLeft size={16} />
        <span>Back to Ops Dashboard</span>
      </Link>

      {actionSuccess && (
        <div className="glass-panel" style={{
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          color: 'var(--secondary-accent)',
          border: '1px solid var(--secondary-accent)',
          padding: '12px 16px',
          borderRadius: '6px',
          marginBottom: '24px',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Header Profile */}
      <div className="glass-panel" style={{
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <SeverityBadge severity={incident.severity} />
              <span className="numeric-glow" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>ID: {incident.id}</span>
            </div>
            <h2 className="display-title" style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
              {incident.summary}
            </h2>
          </div>
          <span style={{
            fontSize: '12px',
            padding: '4px 12px',
            borderRadius: '4px',
            border: isIncidentActive ? '1px solid var(--alert-accent)' : '1px solid var(--secondary-accent)',
            backgroundColor: isIncidentActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            color: isIncidentActive ? 'var(--alert-accent)' : 'var(--secondary-accent)',
            fontWeight: 'bold',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {isIncidentActive ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
            <span>{incident.status.toUpperCase()}</span>
          </span>
        </div>

        <p style={{ margin: '0 0 20px 0', fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
          {incident.description}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '20px', lineHeight: 1.5 }}>
          <div>
            <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>VENUE LOCATION</span>
            <span style={{ fontWeight: 'bold' }}>{incident.zoneId.replace('_', ' ')} (Level {incident.level})</span>
          </div>
          <div>
            <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>AI CLUSTERING</span>
            <span className="numeric-glow green-glow" style={{ fontWeight: 'bold', color: 'var(--secondary-accent)' }}>
              {(incident.confidence * 100).toFixed(0)}% Match
            </span>
          </div>
          <div>
            <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>REPORT TIME</span>
            <span style={{ fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
              {new Date(incident.createdAt).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
        {/* Dispatch Options panel */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0', fontFamily: "'Space Grotesk', sans-serif" }}>
            AI Dispatch Advisor suggestions
          </h3>
          
          {dispatches.length === 0 ? (
            <div className="glass-panel" style={{
              padding: '24px',
              borderStyle: 'dashed'
            }}>
              <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                No active deployment suggestion from Dispatch Advisor. Create a manual request.
              </p>
              <button
                onClick={handleCreateManualDispatch}
                style={{
                  padding: '10px 18px',
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
                <UserPlus size={14} />
                <span>Initialize Staff Dispatch</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {dispatches.map(disp => {
                const isProposed = disp.status === 'proposed';
                return (
                  <div key={disp.id} className="glass-panel" style={{
                    padding: '16px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--primary-accent)', fontFamily: "'Space Grotesk', sans-serif" }}>
                        {disp.suggestedBy === 'ai' ? '🤖 AI Suggested Deployment' : '👤 Manual Proposal'}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: isProposed ? '1px solid var(--primary-accent)' : '1px solid var(--secondary-accent)',
                        backgroundColor: isProposed ? 'rgba(251, 191, 36, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: isProposed ? 'var(--primary-accent)' : 'var(--secondary-accent)',
                        fontWeight: 'bold',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {isProposed ? <AlertCircle size={10} /> : <CheckCircle size={10} />}
                        <span>{disp.status.toUpperCase()}</span>
                      </span>
                    </div>
                    <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {disp.suggestedBy === 'ai'
                        ? `Reallocate resource [${disp.staffName}] to ${incident.zoneId.replace('_', ' ')} concourse entrance to control passenger queues.`
                        : 'Send manual backup safety team to verify concourse obstacle.'
                      }
                    </p>
                    
                    {isProposed && (
                      <button
                        onClick={() => handleApproveDispatch(disp.id)}
                        style={{
                          padding: '10px 18px',
                          backgroundColor: 'var(--secondary-accent)',
                          color: '#ffffff',
                          fontWeight: 'bold',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.3)',
                          transition: 'transform 150ms ease'
                        }}
                      >
                        <CheckCircle size={14} />
                        <span>Approve & Deploy Staff</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Linked source reports */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0', fontFamily: "'Space Grotesk', sans-serif" }}>
            Aggregated Field Reports
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {reports.filter(r => incident.sourceReportIds.includes(r.id)).map(rep => (
              <div key={rep.id} className="glass-panel" style={{
                padding: '12px 16px',
                fontSize: '14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--primary-accent)' }}>{rep.authorName}</span>
                  <span style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                    {new Date(rep.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  "{rep.description}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
