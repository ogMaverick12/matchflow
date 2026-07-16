'use client';

import React from 'react';
import Link from 'next/link';
import { useSession } from '@/context/SessionContext';
import { MessageSquare, Map, Navigation, Wifi, WifiOff, Activity, ShieldAlert } from 'lucide-react';

export default function FanHomePage() {
  const { session, simulateOffline, setSimulateOffline } = useSession();

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto' }}>
      {/* §9: h1 is the page-level heading — visible to screen readers */}
      <h1 className="sr-only">Matchflow Fan Home</h1>

      {/* Hero Welcome banner */}
      <div
        className="glass-panel"
        style={{
          padding: '32px 16px',
          textAlign: 'center',
          background: 'linear-gradient(to bottom, rgba(30, 41, 59, 0.4), var(--bg-base))',
          marginBottom: '24px',
        }}>
        {/* §9: h2 — stadium name is a section heading under the page h1 */}
        <h2 className="display-title" style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
          Mercedes-Benz Stadium
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 16px 0' }}>
          Atlanta, GA · FIFA World Cup Semifinal Host
        </p>
        {/* §9: Status badge — no information conveyed by colour alone (text present) */}
        <div
          role="status"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            color: '#10b981',
            border: '1px solid #10b981',
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 'bold'
          }}>
          <Activity size={14} aria-hidden="true" />
          <span>Semifinal Matchday: USA vs Germany</span>
        </div>
      </div>

      {/* §9: Quick action nav — h2 labels the group */}
      <h2 className="sr-only">Quick Actions</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        <Link
          href="/chat"
          className="glass-panel"
          aria-label="Ask Wayfinding AI — Find nearest gate, concessions, accessible route"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '16px',
            textDecoration: 'none',
            color: 'var(--text-primary)'
          }}>
          <div aria-hidden="true" style={{ padding: '12px', backgroundColor: 'rgba(251, 191, 36, 0.1)', border: '1px solid var(--border-color)', borderRadius: '50%' }}>
            <MessageSquare color="var(--primary-accent)" />
          </div>
          <div>
            <p style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: 'bold', fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-primary)' }}>
              Ask Wayfinding AI
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Find nearest gate, concessions, accessible route
            </p>
          </div>
        </Link>

        <Link
          href="/map"
          className="glass-panel"
          aria-label="Live Congestion Map — Check crowd density scores per concourse zone"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '16px',
            textDecoration: 'none',
            color: 'var(--text-primary)'
          }}>
          <div aria-hidden="true" style={{ padding: '12px', backgroundColor: 'rgba(251, 191, 36, 0.1)', border: '1px solid var(--border-color)', borderRadius: '50%' }}>
            <Map color="var(--primary-accent)" />
          </div>
          <div>
            <p style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: 'bold', fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-primary)' }}>
              Live Congestion Map
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Check crowd density scores per concourse zone
            </p>
          </div>
        </Link>

        <Link
          href="/exit"
          className="glass-panel"
          aria-label="Post-Match Transit Planner — Get the fastest, greenest egress route"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '16px',
            textDecoration: 'none',
            color: 'var(--text-primary)'
          }}>
          <div aria-hidden="true" style={{ padding: '12px', backgroundColor: 'rgba(251, 191, 36, 0.1)', border: '1px solid var(--border-color)', borderRadius: '50%' }}>
            <Navigation color="var(--primary-accent)" />
          </div>
          <div>
            <p style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: 'bold', fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-primary)' }}>
              Post-Match Transit Planner
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Get the fastest, greenest egress route
            </p>
          </div>
        </Link>
      </div>

      {/* §4B: "Find My Gate/Seat/Nearest X" Quick Actions
          One-tap common queries that skip the chat interface entirely.
          Each button navigates to /chat?q=<prefilled query> which the chat page
          reads via useSearchParams() and auto-submits immediately. */}
      <section aria-labelledby="quick-queries-heading" className="glass-panel" style={{ padding: '16px', marginBottom: '24px' }}>
        <h2 id="quick-queries-heading" style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 'bold', fontFamily: "'Space Grotesk', sans-serif" }}>
          Quick Queries
        </h2>
        <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
          One tap — skip typing
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {[
            { label: '🚻 Nearest Restroom',    q: 'Where is the nearest restroom?' },
            { label: '🍔 Food & Drinks',        q: 'Where can I get food and drinks?' },
            { label: '🏟️ My Gate (Section 101)', q: 'How do I get to Gate 1 from the main entrance?' },
            { label: '♿ Accessible Route',     q: 'What is the accessible route to my seat?' },
          ].map(({ label, q }) => (
            <Link
              key={q}
              href={`/chat?q=${encodeURIComponent(q)}`}
              aria-label={`Quick query: ${label}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 'bold',
                textDecoration: 'none',
                textAlign: 'center',
                lineHeight: 1.3,
                transition: 'border-color 150ms ease',
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </section>


      {/* §9: Offline simulation control — h2 section, button with aria-pressed */}
      <section aria-labelledby="offline-sim-heading" className="glass-panel" style={{ padding: '16px', marginBottom: '24px' }}>
        <h2 id="offline-sim-heading" style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 'bold', fontFamily: "'Space Grotesk', sans-serif" }}>
          Offline Simulation Test
        </h2>
        <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Toggle to disconnect simulated API and database networks to test error state fallbacks.
        </p>
        <button
          onClick={() => setSimulateOffline(!simulateOffline)}
          aria-pressed={simulateOffline}
          aria-label={simulateOffline ? 'Go online — currently in offline simulation mode' : 'Simulate offline mode'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '6px',
            border: simulateOffline ? '1px solid #ef4444' : '1px solid var(--border-color)',
            backgroundColor: simulateOffline ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-surface-elevated)',
            color: simulateOffline ? '#ef4444' : 'var(--text-primary)',
            fontWeight: 'bold',
            fontSize: '14px',
            transition: 'background-color 200ms ease'
          }}>
          {simulateOffline ? <WifiOff size={16} aria-hidden="true" /> : <Wifi size={16} aria-hidden="true" />}
          <span>{simulateOffline ? 'Go Online' : 'Simulate Offline'}</span>
        </button>
      </section>

      {/* Ops console link */}
      <div style={{ textAlign: 'center', marginTop: '32px' }}>
        <Link
          href="/login"
          aria-label="Go to Operations Console Login"
          style={{
            fontSize: '13px',
            color: 'var(--primary-accent)',
            border: '1px solid var(--border-color)',
            padding: '8px 16px',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-surface)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}>
          <ShieldAlert size={14} aria-hidden="true" />
          <span>Go to Operations Console Login</span>
        </Link>
      </div>
    </div>
  );
}
