import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getAppMode, type AppMode } from '@/config/env';
import { loadDemoSession, signInDemo, signOutDemo } from '@/services/demo/demoAuth';
import { fetchUserProfile, signInWithFirebase, signOutFirebase, subscribeFirebaseUser } from '@/services/firebase/auth';
import type { UserProfile } from '@/types/user';
import { AppError, toUserMessage } from '@/utils/errors';

type SessionStatus = 'loading' | 'unconfigured' | 'signed-out' | 'signed-in';

interface SessionValue {
  status: SessionStatus;
  mode: AppMode;
  profile: UserProfile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const mode = getAppMode();
  const [status, setStatus] = useState<SessionStatus>(mode === 'unconfigured' ? 'unconfigured' : 'loading');
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (mode === 'unconfigured') return;
    let unsubscribe = () => {};
    let cancelled = false;

    if (mode === 'demo') {
      loadDemoSession()
        .then((session) => {
          if (cancelled) return;
          setProfile(session);
          setStatus(session ? 'signed-in' : 'signed-out');
        })
        .catch(() => {
          if (cancelled) return;
          setStatus('signed-out');
        });
      return () => {
        cancelled = true;
      };
    }

    unsubscribe = subscribeFirebaseUser((user) => {
      if (!user) {
        setProfile(null);
        setStatus('signed-out');
        return;
      }
      fetchUserProfile(user.uid, user.email ?? '')
        .then((next) => {
          if (!next) {
            setProfile(null);
            setStatus('signed-out');
            void signOutFirebase();
            return;
          }
          setProfile(next);
          setStatus('signed-in');
        })
        .catch(() => {
          setProfile(null);
          setStatus('signed-out');
        });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [mode]);

  const value = useMemo<SessionValue>(
    () => ({
      status,
      mode,
      profile,
      async signIn(email: string, password: string) {
        try {
          const next = mode === 'demo' ? await signInDemo(email, password) : await signInWithFirebase(email, password);
          setProfile(next);
          setStatus('signed-in');
        } catch (error) {
          throw new AppError(toUserMessage(error, 'Sign-in failed. Try again.'), 'auth');
        }
      },
      async signOut() {
        if (mode === 'demo') await signOutDemo();
        else await signOutFirebase();
        setProfile(null);
        setStatus('signed-out');
      },
    }),
    [mode, profile, status],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
