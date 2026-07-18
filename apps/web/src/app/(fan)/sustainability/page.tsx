'use client';

import React from 'react';
import { Leaf, Award } from 'lucide-react';

export default function SustainabilityPage() {
  return (
    <div style={{
      maxWidth: '480px',
      margin: '0 auto',
    }}>
      <h3 className="display-title" style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Leaf color="var(--secondary-accent)" size={24} />
        <span>Sustainability & Queue Optimization</span>
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 24px 0' }}>
        Nudging fans towards carbon-efficient transportation methods during peak egress periods.
      </p>

      {/* Stats container */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <div className="glass-panel" style={{
          padding: '16px',
          textAlign: 'center'
        }}>
          <span className="numeric-glow green-glow" style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--secondary-accent)', display: 'block' }}>
            1.2 kg
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>CO2 SAVED / TRIP</span>
        </div>
        <div className="glass-panel" style={{
          padding: '16px',
          textAlign: 'center'
        }}>
          <span className="numeric-glow" style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--primary-accent)', display: 'block' }}>
            82%
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>GREEN ROUTE SHIFT</span>
        </div>
      </div>

      {/* Sustainable Nudge Banner */}
      <div className="glass-panel" style={{
        borderColor: 'var(--secondary-accent)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Award color="var(--secondary-accent)" size={20} />
          <h4 style={{ margin: 0, fontWeight: 'bold', color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif", fontSize: '16px' }}>
            Green Nudge: MARTA Rail Discount
          </h4>
        </div>
        <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
          By choosing the MARTA Rail Link over individual rideshares, you bypass the inner perimeter traffic bottlenecks and reduce tournament emissions. Scan your match ticket at the gate for a free MARTA transit voucher!
        </p>
        <button style={{
          backgroundColor: 'var(--secondary-accent)',
          color: '#000000',
          fontWeight: 'bold',

          padding: '10px 20px',
          borderRadius: '6px',
          border: 'none',
          fontSize: '14px',
          boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.3)'
        }}>
          Claim MARTA Transit Pass
        </button>
      </div>

      <div className="glass-panel" style={{
        padding: '16px',
      }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 'bold', fontFamily: "'Space Grotesk', sans-serif" }}>
          Why does this matter?
        </h4>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          With 70,000+ fans leaving the stadium simultaneously, gridlocked rideshares represent a significant contributor to event-day emissions. Matchflow dynamically adjusts transit capacity guides to smooth out exit surges, protecting both fans and the environment.
        </p>
      </div>
    </div>
  );
}
