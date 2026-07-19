'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import { Activity, Eye, MessageSquare, Shield } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const { session, setLanguage, setAccessibilityMode } = useSession();

  const handleComplete = () => {
    router.push('/home');
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'pt', name: 'Português' },
    { code: 'ar', name: 'العربية (RTL)' },
  ];

  return (
    <div
      style={{
        maxWidth: '480px',
        margin: '0 auto',
        padding: '32px 0 48px 0',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1
          className="display-title"
          style={{ fontSize: '36px', fontWeight: 'bold', margin: '0 0 8px 0' }}
        >
          MATCHFLOW
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', margin: 0 }}>
          FIFA World Cup 2026 Stadium Crowd Intelligence
        </p>
      </div>

      {/* Language Selector glass panel */}
      <div
        className="glass-panel"
        style={{
          padding: '24px',
          marginBottom: '24px',
        }}
      >
        {/* §9: h2 section heading — no skip from h1 */}
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 'bold',
            margin: '0 0 16px 0',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '8px',
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          Select Language
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              aria-pressed={session.language === lang.code}
              aria-label={`Select ${lang.name}${session.language === lang.code ? ' (currently selected)' : ''}`}
              style={{
                padding: '12px',
                borderRadius: '6px',
                backgroundColor:
                  session.language === lang.code
                    ? 'var(--primary-accent)'
                    : 'var(--bg-surface-elevated)',
                color: session.language === lang.code ? '#000000' : 'var(--text-primary)',
                border:
                  session.language === lang.code
                    ? '2px solid var(--primary-accent)'
                    : '1px solid var(--border-color)',
                fontWeight: 'bold',
                textAlign: 'center',
                transition: 'background-color 200ms ease, color 200ms ease',
              }}
            >
              {lang.name}
            </button>
          ))}
        </div>
      </div>

      {/* Accessibility Config glass panel */}
      <div
        className="glass-panel"
        style={{
          padding: '24px',
          marginBottom: '32px',
        }}
      >
        {/* §9: h2 section heading */}
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 'bold',
            margin: '0 0 16px 0',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '8px',
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          Accessibility Modes
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label
            style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}
          >
            <input
              type="checkbox"
              checked={session.accessibilityMode.mobilityRouting}
              onChange={(e) => setAccessibilityMode({ mobilityRouting: e.target.checked })}
              style={{
                width: '20px',
                height: '20px',
                accentColor: 'var(--primary-accent)',
                marginTop: '2px',
              }}
            />
            <div>
              <span
                style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Activity size={16} color="var(--primary-accent)" aria-hidden="true" />
                <span>Mobility-Accessible Routing</span>
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Filters routes to elevators and ramps only
              </span>
            </div>
          </label>

          <label
            style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}
          >
            <input
              type="checkbox"
              checked={session.accessibilityMode.highContrast}
              onChange={(e) => setAccessibilityMode({ highContrast: e.target.checked })}
              style={{
                width: '20px',
                height: '20px',
                accentColor: 'var(--primary-accent)',
                marginTop: '2px',
              }}
            />
            <div>
              <span
                style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Eye size={16} color="var(--primary-accent)" aria-hidden="true" />
                <span>High-Contrast Theme</span>
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Increases legibility in bright sunlight or dark tunnels
              </span>
            </div>
          </label>

          <label
            style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}
          >
            <input
              type="checkbox"
              checked={session.accessibilityMode.simplifiedLanguage}
              onChange={(e) => setAccessibilityMode({ simplifiedLanguage: e.target.checked })}
              style={{
                width: '20px',
                height: '20px',
                accentColor: 'var(--primary-accent)',
                marginTop: '2px',
              }}
            />
            <div>
              <span
                style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <MessageSquare size={16} color="var(--primary-accent)" aria-hidden="true" />
                <span>Simplified Language</span>
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Short sentences, plain-language Q&A rewriting
              </span>
            </div>
          </label>
        </div>
      </div>

      <button
        onClick={handleComplete}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: 'var(--primary-accent)',
          color: '#000000',
          fontSize: '16px',
          fontWeight: 'bold',
          border: 'none',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 14px 0 rgba(251, 191, 36, 0.3)',
          transition: 'transform 150ms ease',
        }}
      >
        <Shield size={18} aria-hidden="true" />
        <span>Enter Matchflow Stadium Guide</span>
      </button>
    </div>
  );
}
