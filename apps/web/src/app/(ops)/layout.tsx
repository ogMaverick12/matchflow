'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import { Shield, AlertTriangle, Users, LogIn, ChevronRight, Menu, LogOut } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, setRole } = useSession();

  const isLoginPage = pathname === '/login';
  const role = session.role;

  // Role Gate logic
  let hasAccess = true;
  let reason = '';

  if (!isLoginPage) {
    if (role === 'fan') {
      hasAccess = false;
      reason = 'Fan role has no access to operational consoles. Please log in.';
    } else if (pathname === '/volunteer' && !['volunteer', 'staff', 'organizer'].includes(role)) {
      hasAccess = false;
      reason = 'You do not have access to the Volunteer Command Center.';
    } else if (pathname === '/dashboard' && !['staff', 'organizer'].includes(role)) {
      hasAccess = false;
      reason = 'Venue Ops Dashboard is restricted to Staff and Organizers.';
    } else if (pathname.startsWith('/incidents') && !['staff', 'organizer'].includes(role)) {
      hasAccess = false;
      reason = 'Incident details are restricted to Staff and Organizers.';
    } else if (pathname === '/admin' && role !== 'organizer') {
      hasAccess = false;
      reason = 'Organizer Control Surface is strictly restricted to tournament Organizers.';
    }
  }

  // Handle Logout action
  const handleLogout = () => {
    setRole('fan');
    router.push('/login');
  };

  if (!hasAccess) {
    return (
      <main
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--bg-base)',
          color: 'var(--text-primary)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div
          className="glass-panel"
          style={{
            padding: '40px 32px',
            maxWidth: '480px',
            borderColor: 'var(--alert-accent)',
          }}
        >
          <Shield
            size={64}
            color="var(--alert-accent)"
            aria-hidden="true"
            style={{ marginBottom: '16px', display: 'inline-block' }}
          />
          {/* §9: Access denied is effectively a page — needs an h1 */}
          <h1
            className="display-title"
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              margin: '0 0 12px 0',
              color: 'var(--text-primary)',
            }}
          >
            ACCESS DENIED
          </h1>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '15px',
              lineHeight: '1.5',
              margin: '0 0 24px 0',
            }}
          >
            {reason}
          </p>
          <Link
            href="/login"
            style={{
              display: 'inline-block',
              backgroundColor: 'var(--primary-accent)',
              color: '#000000',
              fontWeight: 'bold',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '14px',
              textDecoration: 'none',
              boxShadow: '0 4px 14px 0 rgba(251, 191, 36, 0.3)',
            }}
          >
            Switch Role / Log In
          </Link>
        </div>
      </main>
    );
  }

  if (isLoginPage) {
    return (
      <div className="ops-login-wrapper">
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    );
  }

  const navLinks = [
    { href: '/volunteer', label: 'Volunteer Portal', roles: ['volunteer', 'staff', 'organizer'] },
    { href: '/dashboard', label: 'Ops Dashboard', roles: ['staff', 'organizer'] },
    { href: '/admin', label: 'Admin Console', roles: ['organizer'] },
  ].filter((link) => link.roles.includes(role));

  const wrapperClass = session.accessibilityMode.highContrast ? 'high-contrast' : '';

  return (
    <div
      className={`ops-layout-container ${wrapperClass}`}
      style={{
        display: 'flex',
        flexDirection: 'row',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-base)',
        color: 'var(--text-primary)',
      }}
    >
      {/* 3. Ops Desktop Left Rail / Navigation */}
      <aside
        className="ops-sidebar"
        style={{
          width: '260px',
          backgroundColor: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
          <Shield color="var(--primary-accent)" size={24} aria-hidden="true" />
          <span style={{ fontWeight: 'bold', fontSize: '18px', letterSpacing: '1px' }}>
            MATCHFLOW OPS
          </span>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '13px',
            marginBottom: '24px',
            border: '1px solid var(--border-color)',
          }}
        >
          <span
            style={{
              display: 'block',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              textTransform: 'uppercase',
            }}
          >
            Current Role
          </span>
          <span style={{ fontWeight: 'bold', color: 'var(--primary-accent)' }}>
            {role.toUpperCase()}
          </span>
        </div>

        {/* §9: aria-label required on nav landmark for uniqueness */}
        <nav
          aria-label="Operations navigation"
          style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}
        >
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                aria-label={link.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  borderRadius: '6px',
                  backgroundColor: active ? 'var(--bg-surface-elevated)' : 'transparent',
                  color: active ? 'var(--primary-accent)' : 'var(--text-primary)',
                  fontWeight: active ? 'bold' : 'normal',
                  border: active ? '1px solid var(--border-color)' : '1px solid transparent',
                }}
              >
                <span>{link.label}</span>
                <ChevronRight size={16} aria-hidden="true" />
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          aria-label="Exit Operations Console and return to fan view"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            justifyContent: 'center',
            padding: '12px',
            backgroundColor: '#3f1a1a',
            color: '#ffc1c1',
            border: '1px solid #7f1d1d',
            borderRadius: '6px',
            fontWeight: 'bold',
            marginTop: 'auto',
          }}
        >
          <LogOut size={16} aria-hidden="true" />
          <span>Exit Ops console</span>
        </button>
      </aside>

      {/* §9: role=main on primary content area */}
      <main
        id="ops-main-content"
        style={{
          flex: 1,
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      {/* Mobile support indicator styling */}
      <style jsx global>{`
        @media (max-width: 768px) {
          .ops-layout-container {
            flex-direction: column !important;
          }
          .ops-sidebar {
            width: 100% !important;
            height: auto !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 12px 16px !important;
          }
          .ops-sidebar nav,
          .ops-sidebar button,
          .ops-sidebar div:nth-child(2) {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
