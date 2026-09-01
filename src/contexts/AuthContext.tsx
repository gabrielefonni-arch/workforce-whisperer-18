import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { getOfflineUnlock, clearOfflineUnlock, type OfflineUnlock } from '@/lib/offlineAuth';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** true quando l'accesso è avvenuto in modalità offline (solo dati in cache) */
  offlineMode: boolean;
  signOut: () => Promise<void>;
  /** ricontrolla lo sblocco offline salvato (dopo un login offline) */
  refreshOfflineUnlock: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Utente "sintetico" per la sessione offline: mantiene lo stesso id così la cache locale combacia. */
function offlineUserFrom(unlock: OfflineUnlock): User {
  return {
    id: unlock.userId,
    email: unlock.email,
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: { provider: 'offline' },
    user_metadata: { offline: true },
    created_at: new Date(unlock.at).toISOString(),
  } as unknown as User;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [offlineUnlock, setOfflineUnlockState] = useState<OfflineUnlock | null>(null);

  const refreshOfflineUnlock = () => setOfflineUnlockState(getOfflineUnlock());

  useEffect(() => {
    // Detect recovery tokens in URL hash and redirect to /reset-password
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery') && !window.location.pathname.includes('/reset-password')) {
      window.location.href = `/reset-password${hash}`;
      return;
    }

    setOfflineUnlockState(getOfflineUnlock());

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && !window.location.pathname.includes('/reset-password')) {
        const suffix = `${window.location.search}${window.location.hash}`;
        window.location.href = `/reset-password${suffix}`;
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => setLoading(false));

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    clearOfflineUnlock();
    setOfflineUnlockState(null);
    try {
      await supabase.auth.signOut();
    } catch {
      // offline: basta rimuovere lo sblocco locale
    }
    setUser(null);
    setSession(null);
  };

  const offlineMode = !user && !!offlineUnlock;
  const effectiveUser = user ?? (offlineUnlock ? offlineUserFrom(offlineUnlock) : null);

  return (
    <AuthContext.Provider value={{ user: effectiveUser, session, loading, offlineMode, signOut, refreshOfflineUnlock }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
