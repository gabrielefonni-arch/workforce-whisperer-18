import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import logoImg from '@/assets/logo.png';
import { LogIn, UserPlus, KeyRound, WifiOff } from 'lucide-react';
import { saveOfflineCredential, offlineSignIn, hasOfflineCredential } from '@/lib/offlineAuth';
import { useAuth } from '@/contexts/AuthContext';

type Mode = 'login' | 'register' | 'forgot';

export default function Auth() {
  const { refreshOfflineUnlock } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const offlineAvailable = hasOfflineCredential();

  const tryOfflineLogin = async (silent = false) => {
    const ok = await offlineSignIn(email, password);
    if (ok) {
      refreshOfflineUnlock();
      toast.success('Accesso offline: stai vedendo i dati salvati sul dispositivo.');
      return true;
    }
    if (!silent) toast.error('Credenziali offline non valide per questo dispositivo.');
    return false;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Inserisci la tua email');
      return;
    }

    if (mode === 'forgot') {
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success('Email di recupero inviata! Controlla la tua casella.');
      } catch (err: any) {
        toast.error(err.message || 'Errore nell\'invio');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password.trim()) {
      toast.error('Inserisci la password');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        if (!navigator.onLine && offlineAvailable) {
          await tryOfflineLogin();
          return;
        }
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) await saveOfflineCredential(data.user.id, email, password);
        toast.success('Accesso effettuato!');
      } else {
        if (password.length < 6) {
          toast.error('La password deve avere almeno 6 caratteri');
          setLoading(false);
          return;
        }
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) await saveOfflineCredential(data.user.id, email, password);
        toast.success('Account creato! Accesso effettuato.');
      }
    } catch (err: any) {
      const networkIssue =
        !navigator.onLine ||
        /failed to fetch|network|networkerror|load failed|timeout/i.test(err?.message || '');
      if (mode === 'login' && networkIssue && offlineAvailable) {
        const ok = await tryOfflineLogin(true);
        if (ok) return;
      }
      toast.error(
        networkIssue
          ? 'Server non raggiungibile. Controlla la rete o usa l\'accesso offline.'
          : err.message || 'Errore di autenticazione',
      );
    } finally {
      setLoading(false);
    }
  };


  const title = mode === 'forgot' ? 'Recupera Password' : mode === 'login' ? 'Accedi al tuo account' : 'Crea un nuovo account';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <img src={logoImg} alt="Logo" className="h-16 w-16 object-contain" />
          <h1 className="text-xl font-extrabold text-foreground">Edilristrutturazioni</h1>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@esempio.it"
              className="h-10"
              autoComplete="email"
            />
          </div>
          {mode !== 'forgot' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Password</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-10"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
          )}
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {mode === 'forgot' ? <KeyRound className="h-4 w-4" /> : mode === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {loading ? 'Caricamento...' : mode === 'forgot' ? 'Invia email di recupero' : mode === 'login' ? 'Accedi' : 'Registrati'}
          </Button>
          {mode === 'login' && offlineAvailable && (
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              disabled={loading || !email.trim() || !password.trim()}
              onClick={async () => {
                setLoading(true);
                await tryOfflineLogin();
                setLoading(false);
              }}
            >
              <WifiOff className="h-4 w-4" />
              Accesso offline
            </Button>
          )}
        </form>


        <div className="text-center space-y-1">
          {mode === 'login' && (
            <button onClick={() => setMode('forgot')} className="text-xs text-primary font-semibold hover:underline block mx-auto">
              Password dimenticata?
            </button>
          )}
          <p className="text-xs text-muted-foreground">
            {mode === 'forgot' ? (
              <button onClick={() => setMode('login')} className="text-primary font-semibold hover:underline">Torna al login</button>
            ) : mode === 'login' ? (
              <>Non hai un account?{' '}<button onClick={() => setMode('register')} className="text-primary font-semibold hover:underline">Registrati</button></>
            ) : (
              <>Hai già un account?{' '}<button onClick={() => setMode('login')} className="text-primary font-semibold hover:underline">Accedi</button></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}