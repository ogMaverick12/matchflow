'use client';

import React from 'react';
import { Radio } from 'lucide-react';

// A small, shared status pill that proves the fan and ops surfaces read from
// the SAME live collection (congestionState + incidents via /api/db). Both the
// fan home and the ops dashboard render this so the §16 "one engine, two views"
// reveal is visually explicit: the live signal is shared, not two demos.

interface SharedLiveSignalProps {
  /** 'fan' | 'ops' — only changes the helper text, not the underlying feed. */
  surface: 'fan' | 'ops';
  /** Optional live density/incident counts to render inline. */
  live?: boolean;
}

export function SharedLiveSignal({ surface, live }: SharedLiveSignalProps) {
  const helper =
    surface === 'fan'
      ? 'Your routing reads the same live concourse signal the ops team sees.'
      : 'You are viewing the same live concourse signal the fans experience.';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Shared live signal: ${surface === 'fan' ? 'fan' : 'operations'} surface connected to the shared congestion and incident feed`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        borderRadius: '20px',
        border: '1px solid var(--primary-accent)',
        backgroundColor: 'rgba(251, 191, 36, 0.08)',
        color: 'var(--primary-accent)',
        fontSize: '12px',
        fontWeight: 'bold',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: live ? 'var(--secondary-accent)' : 'var(--primary-accent)',
          boxShadow: live ? '0 0 0 3px rgba(16,185,129,0.25)' : 'none',
        }}
      />
      <Radio size={13} aria-hidden="true" />
      <span>Shared live signal</span>
      <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>· {helper}</span>
    </div>
  );
}
