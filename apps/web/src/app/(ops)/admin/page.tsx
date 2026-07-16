'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@/context/SessionContext';
import { db } from '@/lib/db';
import { Incident, Dispatch } from '@matchflow/types';
import { AlertTriangle, CheckCircle, Info } from '@matchflow/ui';
import { Users, ClipboardList } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  action: string;
  user: string;
  timestamp: number;
}

export default function AdminPage() {
  const { session, simulateOffline } = useSession();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    { id: 'log_1', action: 'System Init: Mercedes-Benz Stadium Concourse Graph Loaded', user: 'System', timestamp: Date.now() - 3600000 },
    { id: 'log_2', action: 'Assigned Role "volunteer" to Diego', user: 'Marcus (Organizer)', timestamp: Date.now() - 3200000 },
    { id: 'log_3', action: 'Assigned Role "staff" to Priya', user: 'Marcus (Organizer)', timestamp: Date.now() - 3100000 },
    { id: 'log_4', action: 'Incident clustered (inc_1) from volunteer report', user: 'Flow Engine (AI)', timestamp: Date.now() - 300000 }
  ]);

  // Load and listen to live data
  useEffect(() => {
    if (simulateOffline) {
      setError('Offline. Cannot sync admin logs.');
      return;
    }
    setError(null);

    const unsubIncidents = db.subscribeToIncidents(session.role, (liveIncidents) => {
      setIncidents(liveIncidents);
    }, (err) => setError(err.message));

    const unsubDispatches = db.subscribeToDispatches(session.role, (liveDispatches) => {
      setDispatches(liveDispatches);
    }, (err) => setError(err.message));

    return () => {
      unsubIncidents();
      unsubDispatches();
    };
  }, [session.role, simulateOffline]);

  // Dynamically append new dispatch approvals to the simulated audit log
  useEffect(() => {
    const approvedDispatches = dispatches.filter(d => d.status === 'dispatched');
    if (approvedDispatches.length > 0) {
      const newLogs: AuditLogEntry[] = approvedDispatches.map((d) => ({
        id: `log_disp_${d.id}`,
        action: `Approved dispatch suggestion for Incident ID: ${d.incidentId} to ${d.staffName || 'Staff Member'}`,
        user: d.approvedBy || 'Priya (Staff)',
        timestamp: d.timestamp
      }));
      
      setAuditLogs(prev => {
        const existingIds = new Set(prev.map(l => l.id));
        const filteredNewLogs = newLogs.filter(l => !existingIds.has(l.id));
        return [...prev, ...filteredNewLogs];
      });
    }
  }, [dispatches]);

  const staffRoster = [
    { id: 'st_1', name: 'Priya Patel', role: 'Staff Leader', status: 'Active (Ops Console)', zone: 'Zone A' },
    { id: 'st_2', name: 'Diego Alvarez', role: 'Volunteer', status: 'On Duty', zone: 'Zone A' },
    { id: 'st_3', name: 'Jean Dupont', role: 'Volunteer', status: 'On Duty', zone: 'Zone A' },
    { id: 'st_4', name: 'Amina Mansour', role: 'Staff Member', status: 'Standby', zone: 'Zone B' },
    { id: 'st_5', name: 'Yuki Tanaka', role: 'Volunteer', status: 'Off Duty', zone: 'Zone C' }
  ];

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <div className="glass-panel" style={{ borderColor: 'var(--alert-accent)', padding: '24px', color: 'var(--alert-accent)', textAlign: 'center' }}>
          <AlertTriangle size={32} style={{ marginBottom: '12px', display: 'inline-block' }} />
          <h4 className="display-title" style={{ color: 'var(--alert-accent)', margin: '0 0 8px 0' }}>Admin Portal Offline</h4>
          <p style={{ margin: 0, color: 'var(--text-primary)' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="display-title" style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
        Organizer Admin Console
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 24px 0' }}>
        High-level stadium statistics, staff rosters, and audit trails.
      </p>

      {/* Grid container */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '24px' }}>
        
        {/* Left Column: Staff Roster & Stats */}
        <div>
          {/* Staff List */}
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Space Grotesk', sans-serif" }}>
            <Users size={20} color="var(--primary-accent)" />
            <span>Staff / Volunteer Roster ({staffRoster.length})</span>
          </h3>

          <div className="glass-panel" style={{
            overflow: 'hidden',
            marginBottom: '24px'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '12px' }}>Name</th>
                  <th style={{ padding: '12px' }}>Role</th>
                  <th style={{ padding: '12px' }}>Zone</th>
                  <th style={{ padding: '12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {staffRoster.map(staff => {
                  const isOffDuty = staff.status === 'Off Duty';
                  const isStandby = staff.status === 'Standby';
                  
                  let badgeBg = 'rgba(16, 185, 129, 0.1)';
                  let badgeBorder = '1px solid var(--secondary-accent)';
                  let badgeColor = 'var(--secondary-accent)';
                  
                  if (isOffDuty) {
                    badgeBg = 'rgba(148, 163, 184, 0.1)';
                    badgeBorder = '1px solid var(--text-secondary)';
                    badgeColor = 'var(--text-secondary)';
                  } else if (isStandby) {
                    badgeBg = 'rgba(251, 191, 36, 0.1)';
                    badgeBorder = '1px solid var(--primary-accent)';
                    badgeColor = 'var(--primary-accent)';
                  }

                  return (
                    <tr key={staff.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 200ms ease' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{staff.name}</td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{staff.role}</td>
                      <td style={{ padding: '12px' }}>{staff.zone}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: badgeBg,
                          border: badgeBorder,
                          color: badgeColor,
                          fontWeight: 'bold',
                          fontSize: '11px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {isOffDuty ? (
                            <Info size={10} />
                          ) : (
                            <CheckCircle size={10} />
                          )}
                          <span>{staff.status.toUpperCase()}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Audit Logs */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Space Grotesk', sans-serif" }}>
            <ClipboardList size={20} color="var(--primary-accent)" />
            <span>Immutable Session Audit Log</span>
          </h3>

          <div className="glass-panel" style={{
            padding: '16px',
            maxHeight: '380px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {auditLogs.slice().reverse().map(log => (
              <div key={log.id} style={{
                padding: '12px',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                fontSize: '12px',
                lineHeight: 1.4
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  <span style={{ fontWeight: 'bold' }}>Actor: {log.user}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{log.action}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
