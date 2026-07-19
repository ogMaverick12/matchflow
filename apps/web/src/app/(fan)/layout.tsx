'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import { Map, MessageSquare, Home, Eye, Navigation, Clock } from 'lucide-react';
import { startCongestionSimulation, stopCongestionSimulation } from '@/lib/congestion-simulator';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function FanLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, simulateOffline, ensureFanSession } = useSession();

  // Mint a signed fan session (httpOnly cookie) on first fan load so the
  // concierge + public reads are authorized server-side.
  useEffect(() => {
    ensureFanSession();
  }, [ensureFanSession]);

  // §6 §16: Start the seeded congestion simulation engine on first fan page load.
  // The simulator drives CongestionZone.densityScore on an 8-second tick,
  // producing the live data that makes the "same event, two views" reveal work.
  useEffect(() => {
    if (!simulateOffline) {
      startCongestionSimulation(session.role);
    }
    return () => stopCongestionSimulation();
  }, [simulateOffline, session.role]);

  const isActive = (path: string) => pathname === path;
  const wrapperClass = session.accessibilityMode.highContrast ? 'high-contrast' : '';

  return (
    <div
      className={`fan-layout-container ${wrapperClass}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-base)',
        color: 'var(--text-primary)',
        paddingBottom: '70px',
      }}
    >
      {/* §9: Top status bar — role=banner, aria-live so offline state is announced */}
      <div
        role="banner"
        aria-live="polite"
        aria-label={simulateOffline ? 'Offline degraded mode active' : 'Live concourse active'}
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-color)',
          padding: '8px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* §9: Status dot is decorative — aria-hidden */}
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: simulateOffline ? 'var(--alert-accent)' : 'var(--secondary-accent)',
            }}
          />
          <span>{simulateOffline ? 'OFFLINE DEGRADED MODE' : 'LIVE CONCOURSE ACTIVE'}</span>
        </div>
        <div>
          <span>FIFA WC 2026: ATLANTA · GATES OPEN · KICKOFF 19:00</span>
        </div>
      </div>

      {/* §7 Persistent match-day context strip — deterministic, not AI-generated.
          Kickoff time, current period, and gates status persist across all fan pages.
          Per §3 product principle: "Design for the concourse, not the boardroom" */}
      <div
        role="complementary"
        aria-label="Match-day status"
        style={{
          backgroundColor: 'rgba(15,23,42,0.85)',
          borderBottom: '1px solid var(--border-color)',
          padding: '6px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--primary-accent)',
          }}
        >
          <Clock size={12} aria-hidden="true" />
          <span style={{ fontWeight: 'bold', fontFamily: "'Space Grotesk', sans-serif" }}>
            FIFA WC 2026
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>·</span>
          <span style={{ color: 'var(--text-primary)' }}>USA vs Germany</span>
        </div>
        <div
          style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-secondary)' }}
        >
          <span>
            KO <strong style={{ color: 'var(--text-primary)' }}>19:00</strong>
          </span>
          <span>
            Gates <strong style={{ color: 'var(--secondary-accent)' }}>OPEN</strong>
          </span>
          <span>
            Period <strong style={{ color: 'var(--text-primary)' }}>PRE-MATCH</strong>
          </span>
        </div>
      </div>

      {/* §9: role=main on the content region */}
      <main id="main-content" style={{ flex: 1, padding: '16px' }}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      {/* §9: Bottom nav — aria-label required on <nav> for landmark uniqueness */}
      <nav
        aria-label="Primary navigation"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '60px',
          backgroundColor: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          zIndex: 1000,
        }}
      >
        {/* §9: Each nav link has aria-label and aria-current for active state.
            Icons are aria-hidden because the text label is present. */}
        <Link
          href="/home"
          aria-label="Home"
          aria-current={isActive('/home') ? 'page' : undefined}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: isActive('/home') ? 'var(--primary-accent)' : 'var(--text-secondary)',
            fontSize: '10px',
          }}
        >
          <Home size={20} aria-hidden="true" />
          <span>Home</span>
        </Link>

        <Link
          href="/chat"
          aria-label="Ask AI concierge"
          aria-current={isActive('/chat') ? 'page' : undefined}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: isActive('/chat') ? 'var(--primary-accent)' : 'var(--text-secondary)',
            fontSize: '10px',
          }}
        >
          <MessageSquare size={20} aria-hidden="true" />
          <span>Ask AI</span>
        </Link>

        <Link
          href="/map"
          aria-label="Concourse map"
          aria-current={isActive('/map') ? 'page' : undefined}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: isActive('/map') ? 'var(--primary-accent)' : 'var(--text-secondary)',
            fontSize: '10px',
          }}
        >
          <Map size={20} aria-hidden="true" />
          <span>Map</span>
        </Link>

        <Link
          href="/exit"
          aria-label="Exit and transit planning"
          aria-current={isActive('/exit') ? 'page' : undefined}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: isActive('/exit') ? 'var(--primary-accent)' : 'var(--text-secondary)',
            fontSize: '10px',
          }}
        >
          <Navigation size={20} aria-hidden="true" />
          <span>Exit / Transit</span>
        </Link>

        <Link
          href="/accessibility"
          aria-label="Accessibility settings"
          aria-current={isActive('/accessibility') ? 'page' : undefined}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: isActive('/accessibility') ? 'var(--primary-accent)' : 'var(--text-secondary)',
            fontSize: '10px',
          }}
        >
          <Eye size={20} aria-hidden="true" />
          <span>Accessibility</span>
        </Link>
      </nav>
    </div>
  );
}
