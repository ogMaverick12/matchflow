'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, Session } from '@matchflow/types';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase';
import { signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth';

interface SessionContextType {
  session: Session;
  setRole: (role: UserRole) => void;
  setLanguage: (lang: string) => void;
  setAccessibilityMode: (mode: Partial<Session['accessibilityMode']>) => void;
  simulateOffline: boolean;
  setSimulateOffline: (offline: boolean) => void;
  loading: boolean;
  authUser: User | null;
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
  const [authUser, setAuthUser] = useState<User | null>(null);

  // Initialize Anonymous Session via Firebase Auth
  useEffect(() => {
    const saved = localStorage.getItem('matchflow_session');
    const applySaved = (uid: string) => {
      if (saved) {
        const parsed = JSON.parse(saved) as Session;
        // Preserve any role set from a custom claim if present
        setSession({ ...parsed, sessionId: uid, userId: uid });
      } else {
        const s = DEFAULT_SESSION(uid);
        localStorage.setItem('matchflow_session', JSON.stringify(s));
        setSession(s);
      }
    };

    if (!isFirebaseConfigured()) {
      // Offline / unconfigured — fall back to a local anonymous id
      const uid = 'fan_' + Math.random().toString(36).substr(2, 9);
      applySaved(uid);
      setLoading(false);
      return;
    }

    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthUser(user);
        // Role may come from a Firebase custom claim (set by organizer)
        const claimRole = (user as any).getIdTokenResult
          ? (await user.getIdTokenResult()).claims?.role as UserRole | undefined
          : undefined;
        const uid = user.uid;
        if (claimRole) {
          const merged = { ...DEFAULT_SESSION(uid), role: claimRole };
          localStorage.setItem('matchflow_session', JSON.stringify(merged));
          setSession(merged);
        } else {
          applySaved(uid);
        }
        setLoading(false);
      } else {
        // Sign in anonymously for fans by default
        try {
          const cred = await signInAnonymously(auth);
          const uid = cred.user.uid;
          applySaved(uid);
          setLoading(false);
        } catch {
          const uid = 'fan_' + Math.random().toString(36).substr(2, 9);
          applySaved(uid);
          setLoading(false);
        }
      }
    });
    return unsub;
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
      loading,
      authUser
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
