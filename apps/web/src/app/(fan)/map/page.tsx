'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@/context/SessionContext';
import { db } from '@/lib/db';
import { CongestionZone } from '@matchflow/types';
import { AlertTriangle, CheckCircle, Info, AlertCircle } from '@matchflow/ui';
import { Activity, RotateCcw } from 'lucide-react';

export default function MapPage() {
  const { session, simulateOffline } = useSession();
  const [zones, setZones] = useState<CongestionZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to live congestion data
  useEffect(() => {
    if (simulateOffline) {
      setError('Unable to load real-time map data. Offline Mode Active.');
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(true);

    const unsubscribe = db.subscribeToCongestion(
      session.role,
      (liveZones) => {
        setZones(liveZones);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [session.role, simulateOffline]);

  // Color mapping based on density score conforming to Night Match palette
  const getDensityColors = (score: number) => {
    if (score >= 0.8) {
      return { text: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', icon: <AlertTriangle size={14} />, label: 'CRITICAL CONGESTION' };
    }
    if (score >= 0.5) {
      return { text: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)', border: '#fbbf24', icon: <AlertCircle size={14} />, label: 'MODERATE DENSITY' };
    }
    return { text: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: '#10b981', icon: <CheckCircle size={14} />, label: 'ALL CLEAR / NORMAL' };
  };

  const getMapSectorColors = (score: number) => {
    if (score >= 0.8) return 'rgba(239, 68, 68, 0.35)';
    if (score >= 0.5) return 'rgba(251, 191, 36, 0.35)';
    return 'rgba(16, 185, 129, 0.35)';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <Activity className="animate-spin" color="var(--primary-accent)" size={48} style={{ marginBottom: '16px', display: 'inline-block' }} />
        <h3 style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Loading Concourse Live Map...</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Establishing connection to Flow Engine</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel" style={{
        borderColor: 'var(--alert-accent)',
        padding: '24px',
        textAlign: 'center',
        maxWidth: '400px',
        margin: '32px auto'
      }}>
        <AlertTriangle size={40} color="var(--alert-accent)" style={{ marginBottom: '12px', display: 'inline-block' }} />
        <h4 className="display-title" style={{ margin: '0 0 8px 0', color: 'var(--alert-accent)', fontSize: '18px' }}>
          MAP CONNECTION LOST
        </h4>
        <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: 'var(--alert-accent)',
            color: '#ffffff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <RotateCcw size={14} />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '480px',
      margin: '0 auto',
    }}>
      <h3 className="display-title" style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
        Live Concourse Heatmap
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 24px 0' }}>
        Real-time visitor counts mapped to stadium radial zones.
      </p>

      {/* Concourse Schematic Map Render */}
      <div className="glass-panel" style={{
        padding: '16px',
        position: 'relative',
        height: '320px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: '24px',
        overflow: 'hidden'
      }}>
        {/* Simple schematic layout representing Zones A, B, C, D */}
        <div style={{
          position: 'relative',
          width: '240px',
          height: '240px',
          borderRadius: '50%',
          border: '2px dashed rgba(16, 185, 129, 0.4)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          overflow: 'hidden',
          backgroundImage: 'radial-gradient(circle, transparent 35%, rgba(16, 185, 129, 0.05) 36%)'
        }}>
          {zones.map(zone => {
            const sectorColor = getMapSectorColors(zone.densityScore);
            return (
              <div key={zone.zoneId} style={{
                backgroundColor: sectorColor,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: 'var(--text-primary)',
                fontWeight: 'bold',
                fontSize: '14px',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                transition: 'background-color 0.5s ease',
                fontFamily: "'Space Grotesk', sans-serif"
              }}>
                <span>{zone.zoneId.replace('_', ' ')}</span>
                <span className="numeric-glow" style={{ fontSize: '15px', color: 'var(--primary-accent)', marginTop: '4px' }}>
                  {(zone.densityScore * 100).toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Schematic core inner field marking */}
        <div style={{
          position: 'absolute',
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          backgroundColor: 'var(--bg-base)',
          border: '2px solid rgba(16, 185, 129, 0.6)',
          boxShadow: '0 0 16px rgba(16, 185, 129, 0.2)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '11px',
          fontWeight: 'bold',
          color: 'var(--secondary-accent)',
          fontFamily: "'Space Grotesk', sans-serif",
          letterSpacing: '1px'
        }}>
          PITCH
        </div>
      </div>

      {/* Detailed Zone List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h4 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 4px 0', fontFamily: "'Space Grotesk', sans-serif" }}>
          Concourse Status breakdown:
        </h4>
        
        {zones.map(zone => {
          const ui = getDensityColors(zone.densityScore);
          return (
            <div key={zone.zoneId} className="glass-panel" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px',
            }}>
              <div>
                <span style={{ fontWeight: 'bold', display: 'block', fontSize: '16px', fontFamily: "'Space Grotesk', sans-serif" }}>
                  {zone.name}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Trend: {zone.trend.toUpperCase()}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  backgroundColor: ui.bg,
                  color: ui.text,
                  border: `1px solid ${ui.border}`
                }}>
                  {ui.icon}
                  <span>{ui.label}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
