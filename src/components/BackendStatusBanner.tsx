import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const HEALTH_URL = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/health`;

export function BackendStatusBanner() {
  const [offline, setOffline] = useState(false);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch(HEALTH_URL, {
        method: 'GET',
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        cache: 'no-store',
      });
      setOffline(!res.ok);
    } catch {
      setOffline(true);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [check]);

  if (!offline) return null;

  return (
    <div className="sticky top-0 z-50 bg-destructive text-destructive-foreground px-4 py-2.5 flex items-center gap-3 text-xs sm:text-sm">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <p className="flex-1 leading-snug">
        <span className="font-semibold">Server non raggiungibile.</span>{' '}
        I tuoi dati sono salvi, ma in questo momento non è possibile caricarli o salvarne di nuovi. Riprova tra poco.
      </p>
      <button
        onClick={check}
        disabled={checking}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-destructive-foreground/15 px-2.5 py-1 font-semibold hover:bg-destructive-foreground/25 disabled:opacity-60"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
        Riprova
      </button>
    </div>
  );
}
