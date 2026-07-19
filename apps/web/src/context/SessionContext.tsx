'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, Session } from '@matchflow/types';

interface SessionContextType {
  session: Session;
  setRole: (role: UserRole, userId?: string) => Promise<void>;
  ensureFanSession: () => Promise<void>;
  setLanguage: (lang: string) => void;
  setAccessibilityMode: (mode: Partial<Session['accessibilityMode']>) => void;
  simulateOffline: boolean;
  setSimulateOffline: (offline: boolean) => void;
  loading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

// NOTE: The role claim is owned by the server. The client requests a role at
// onboarding and the server mints a signed httpOnly cookie; we mirror the
// returned role locally for UI + client-side guard purposes only. We never
// trust a self-set role as authoritative — the API verifies the cookie.

const DEFAULT_SESSION = (): Session => ({
  sessionId: '',
  userId: '',
  role: 'fan',
  language: 'en',
  accessibilityMode: {
    mobilityRouting: false,
    highContrast: false,
    simplifiedLanguage: false
  },
  lastActive: Date.now()
});

// Persisted PREFERENCES only (language, accessibility) — never the role.
const PREFS_KEY = 'matchflow_prefs';

function loadPrefs(): Partial<Session> {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return JSON.parse(raw) as Partial<Session>;
  } catch { /* ignore */ }
  return {};
}

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session>(() => ({
    ...DEFAULT_SESSION(),
    ...loadPrefs()
  }));

  const [simulateOffline, setSimulateOffline] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateSession = (updater: (prev: Session) => Session) => {
    setSession(prev => {
      const next = updater(prev);
      // Persist only non-authoritative preferences.
      const { language, accessibilityMode } = next;
      localStorage.setItem(PREFS_KEY, JSON.stringify({ language, accessibilityMode }));
      return next;
    });
  };

  // Sync high contrast and language RTL to document root
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (session.accessibilityMode.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }

    if (session.language === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.style.textAlign = 'right';
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.style.textAlign = '';
    }
  }, [session.accessibilityMode.highContrast, session.language]);

  // Request a signed session from the server with the chosen role. The server
  // sets the httpOnly cookie and returns the verified { userId, role }.
  // An optional userId lets seeded personas keep a stable identity for RBAC.
  const setRole = async (role: UserRole, userId?: string) => {
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, userId })
    });
    const json = await res.json();
    if (!json?.success) {
      throw new Error('Failed to issue session');
    }
    updateSession(prev => ({
      ...prev,
      role: json.session.role,
      userId: json.session.userId,
      sessionId: json.session.userId,
      lastActive: Date.now()
    }));
  };

  const setLanguage = (language: string) => updateSession(prev => ({ ...prev, language }));
  const setAccessibilityMode = (mode: Partial<Session['accessibilityMode']>) =>
    updateSession(prev => ({
      ...prev,
      accessibilityMode: { ...prev.accessibilityMode, ...mode }
    }));

  // Fans need a signed session too (the concierge + public reads require the
  // cookie). Only mint one if we haven't already established a user for this
  // browser, so we never clobber an active ops session on navigation.
  const ensureFanSession = async () => {
    if (session.userId) return;
    try {
      await setRole('fan');
    } catch {
      /* non-fatal: concierge calls degrade to the local fallback */
    }
  };

  return (
    <SessionContext.Provider value={{
      session,
      setRole,
      ensureFanSession,
      setLanguage,
      setAccessibilityMode,
      simulateOffline,
      setSimulateOffline,
      loading
    }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
