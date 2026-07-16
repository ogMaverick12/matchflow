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

  // Initialize Anonymous Session
  useEffect(() => {
    const savedSession = localStorage.getItem('matchflow_session');
    if (savedSession) {
      setSession(JSON.parse(savedSession));
    } else {
      const anonymousUid = 'fan_' + Math.random().toString(36).substr(2, 9);
      const newSession: Session = {
        sessionId: anonymousUid,
        userId: anonymousUid,
        role: 'fan',
        language: 'en',
        accessibilityMode: {
          mobilityRouting: false,
          highContrast: false,
          simplifiedLanguage: false
        },
        lastActive: Date.now()
      };
      setSession(newSession);
      localStorage.setItem('matchflow_session', JSON.stringify(newSession));
    }
    setLoading(false);
  }, []);

  const updateSession = (updater: (prev: Session) => Session) => {
    setSession(prev => {
      const next = updater(prev);
      localStorage.setItem('matchflow_session', JSON.stringify(next));
      return next;
    });
  };

  // Sync high contrast and language RTL to document root
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Toggle high contrast class
    if (session.accessibilityMode.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
    
    // Toggle RTL for Arabic
    if (session.language === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.style.textAlign = 'right';
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.style.textAlign = '';
    }
  }, [session.accessibilityMode.highContrast, session.language]);

  const setRole = (role: UserRole) => {
    updateSession(prev => ({ ...prev, role }));
  };

  const setLanguage = (language: string) => {
    updateSession(prev => ({ ...prev, language }));
  };

  const setAccessibilityMode = (mode: Partial<Session['accessibilityMode']>) => {
    updateSession(prev => ({
      ...prev,
      accessibilityMode: {
        ...prev.accessibilityMode,
        ...mode
      }
    }));
  };

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
