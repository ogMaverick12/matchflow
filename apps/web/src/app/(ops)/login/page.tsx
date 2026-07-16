'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import { Shield } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { session, setRole } = useSession();

  const handleRoleSelect = (role: 'fan' | 'volunteer' | 'staff' | 'organizer') => {
    setRole(role);
    if (role === 'fan') {
      router.push('/home');
    } else if (role === 'volunteer') {
      router.push('/volunteer');
    } else if (role === 'staff') {
      router.push('/dashboard');
    } else if (role === 'organizer') {
      router.push('/admin');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-base)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '24px',
    }}>
      <div className="glass-panel" style={{
        padding: '32px',
        maxWidth: '440px',
        width: '100%',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Shield size={48} color="var(--primary-accent)" style={{ marginBottom: '12px', display: 'inline-block' }} />
          <h2 className="display-title" style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
            Operations Login
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
            Select your assigned World Cup credential role to access operational panels.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => handleRoleSelect('volunteer')}
            style={{
              padding: '14px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: session.role === 'volunteer' ? 'rgba(251, 191, 36, 0.1)' : 'var(--bg-surface-elevated)',
              color: session.role === 'volunteer' ? 'var(--primary-accent)' : 'var(--text-primary)',
              fontWeight: 'bold',
              fontSize: '14px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'background-color 200ms ease'
            }}
          >
            <span>Volunteer (Diego)</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Submit one-tap reports</span>
          </button>

          <button
            onClick={() => handleRoleSelect('staff')}
            style={{
              padding: '14px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: session.role === 'staff' ? 'rgba(251, 191, 36, 0.1)' : 'var(--bg-surface-elevated)',
              color: session.role === 'staff' ? 'var(--primary-accent)' : 'var(--text-primary)',
              fontWeight: 'bold',
              fontSize: '14px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'background-color 200ms ease'
            }}
          >
            <span>Staff Console (Priya)</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Incident feed & dispatches</span>
          </button>

          <button
            onClick={() => handleRoleSelect('organizer')}
            style={{
              padding: '14px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: session.role === 'organizer' ? 'rgba(251, 191, 36, 0.1)' : 'var(--bg-surface-elevated)',
              color: session.role === 'organizer' ? 'var(--primary-accent)' : 'var(--text-primary)',
              fontWeight: 'bold',
              fontSize: '14px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'background-color 200ms ease'
            }}
          >
            <span>Organizer Portal (Marcus)</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Roster allocation & admin</span>
          </button>

          <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '12px 0' }}></div>

          <button
            onClick={() => handleRoleSelect('fan')}
            style={{
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid var(--alert-accent)',
              backgroundColor: 'transparent',
              color: 'var(--alert-accent)',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'background-color 200ms ease'
            }}
          >
            Return to Public Fan Surface
          </button>
        </div>
      </div>
    </div>
  );
}
