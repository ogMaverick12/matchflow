'use client';

import React from 'react';
import { useSession } from '@/context/SessionContext';
import { Check } from 'lucide-react';

export default function LanguageSelectorPage() {
  const { session, setLanguage } = useSession();

  const languages = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'es', name: 'Spanish', native: 'Español' },
    { code: 'fr', name: 'French', native: 'Français' },
    { code: 'pt', name: 'Portuguese', native: 'Português' },
    { code: 'ar', name: 'Arabic', native: 'العربية' },
  ];

  return (
    <div
      style={{
        maxWidth: '480px',
        margin: '0 auto',
      }}
    >
      <h3
        className="display-title"
        style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}
      >
        Multilingual Assistant Settings
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 24px 0' }}>
        Select your preferred language. Matchflow concierge auto-detects conversational shifts.
      </p>

      <div
        className="glass-panel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {languages.map((lang, index) => {
          const isSelected = session.language === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                backgroundColor: isSelected ? 'var(--bg-surface-elevated)' : 'transparent',
                border: 'none',
                borderBottom:
                  index === languages.length - 1 ? 'none' : '1px solid var(--border-color)',
                color: isSelected ? 'var(--primary-accent)' : 'var(--text-primary)',
                textAlign: 'left',
                width: '100%',
                transition: 'background-color 200ms ease',
              }}
            >
              <div>
                <span
                  style={{
                    fontWeight: 'bold',
                    display: 'block',
                    fontSize: '16px',
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  {lang.native}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {lang.name}
                </span>
              </div>
              {isSelected && <Check size={20} color="var(--primary-accent)" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
