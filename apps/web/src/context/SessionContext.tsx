'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, Session } from '@matchflow/types';

interface SessionContextType {
  session: Session;
  setRole: (role: UserRole) => void;
  setLanguage: (lang: string) => void;
  setAccessibilityMode: (mode: Partial<Session['accessibilityMode']>) => void;
  simulateOffline: boolean;
  setSimulateOffline: (offline: boolean) => void;
  loading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const DEFAULT_SESSION = (uid: string): Session => ({
  sessionId: uid,
  userId: uid,
  role: 'fan',
  language: 'en',
  accessibilityMode: {
    mobilityRouting: false,
    highContrast: false,
    simplifiedLanguage: false
  },
  lastActive: Date.now()
});

const STORAGE_KEY = 'matchflow_session';

function localUid(): string {
  return 'fan_' + Math.random().toString(36).substring(2, 10);
}

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session>({
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

  const [simulateOffline, setSimulateOffline] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initialize an anonymous local session (no Firebase). The persisted
  // session in localStorage carries the chosen role across reloads.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const uid = localUid();
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Session;
        setSession({ ...parsed, sessionId: uid, userId: uid, lastActive: Date.now() });
      } catch {
        const s = DEFAULT_SESSION(uid);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
        setSession(s);
      }
    } else {
      const s = DEFAULT_SESSION(uid);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      setSession(s);
    }
    setLoading(false);
  }, []);

  const updateSession = (updater: (prev: Session) => Session) => {
    setSession(prev => {
      const next = updater(prev);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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

  const setRole = (role: UserRole) => updateSession(prev => ({ ...prev, role }));
  const setLanguage = (language: string) => updateSession(prev => ({ ...prev, language }));
  const setAccessibilityMode = (mode: Partial<Session['accessibilityMode']>) =>
    updateSession(prev => ({
      ...prev,
      accessibilityMode: { ...prev.accessibilityMode, ...mode }
    }));

  return (
    <SessionContext.Provider value={{
      session,
      setRole,
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
