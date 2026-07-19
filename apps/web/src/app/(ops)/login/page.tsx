'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import { Shield } from 'lucide-react';

type Role = 'fan' | 'volunteer' | 'staff' | 'organizer';

// Seeded operational personas. The userId is sent to the server so the minted
// signed token carries a stable, recognizable identity for RBAC (e.g. a
// volunteer can only read their own reports). The role claim itself is always
// issued by the server — the client never asserts it.
const PERSONAS: Record<Exclude<Role, 'fan'>, { userId: string; name: string }> = {
  volunteer: { userId: 'user_diego', name: 'Diego' },
  staff: { userId: 'user_priya', name: 'Priya' },
  organizer: { userId: 'user_marcus', name: 'Marcus' },
};

export default function LoginPage() {
  const router = useRouter();
  const { setRole } = useSession();
  const [selected, setSelected] = React.useState<Role | null>(null);

  const routeFor = (role: Role) => {
    if (role === 'volunteer') router.push('/volunteer');
    else if (role === 'staff') router.push('/dashboard');
    else if (role === 'organizer') router.push('/admin');
    else router.push('/home');
  };

  // Request a signed session from the server. The server mints an httpOnly
  // cookie carrying the role claim and returns the verified role; the client
  // only ever holds the token (cookie) + the server-confirmed claim — never a
  // raw, self-editable role string.
  const handleRoleSelect = async (role: Role) => {
    setSelected(role);
    try {
      const userId = role === 'fan' ? undefined : PERSONAS[role].userId;
      await setRole(role, userId);
    } catch {
      alert('Failed to start session. Please try again.');
      return;
    }
    routeFor(role);
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-base)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          padding: '32px',
          maxWidth: '440px',
          width: '100%',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Shield
            size={48}
            color="var(--primary-accent)"
            style={{ marginBottom: '12px', display: 'inline-block' }}
          />
          <h2
            className="display-title"
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              margin: '0 0 6px 0',
              color: 'var(--text-primary)',
            }}
          >
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
              backgroundColor:
                selected === 'volunteer' ? 'rgba(251, 191, 36, 0.1)' : 'var(--bg-surface-elevated)',
              color: selected === 'volunteer' ? 'var(--primary-accent)' : 'var(--text-primary)',
              fontWeight: 'bold',
              fontSize: '14px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'background-color 200ms ease',
            }}
          >
            <span>Volunteer (Diego)</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Submit one-tap reports
            </span>
          </button>

          <button
            onClick={() => handleRoleSelect('staff')}
            style={{
              padding: '14px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor:
                selected === 'staff' ? 'rgba(251, 191, 36, 0.1)' : 'var(--bg-surface-elevated)',
              color: selected === 'staff' ? 'var(--primary-accent)' : 'var(--text-primary)',
              fontWeight: 'bold',
              fontSize: '14px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'background-color 200ms ease',
            }}
          >
            <span>Staff Console (Priya)</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Incident feed &amp; dispatches
            </span>
          </button>

          <button
            onClick={() => handleRoleSelect('organizer')}
            style={{
              padding: '14px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor:
                selected === 'organizer' ? 'rgba(251, 191, 36, 0.1)' : 'var(--bg-surface-elevated)',
              color: selected === 'organizer' ? 'var(--primary-accent)' : 'var(--text-primary)',
              fontWeight: 'bold',
              fontSize: '14px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'background-color 200ms ease',
            }}
          >
            <span>Organizer Portal (Marcus)</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Roster allocation &amp; admin
            </span>
          </button>

          <div
            style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '12px 0' }}
          ></div>

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
              transition: 'background-color 200ms ease',
            }}
          >
            Return to Public Fan Surface
          </button>
        </div>
      </div>
    </main>
  );
}
