import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import logoImg from '@/assets/logo.png';
import { KeyRound } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });

    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

      // Nuovo formato PKCE: ?code=...
      const code = params.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && !cancelled) { setReady(true); return; }
      }

      // Formato token_hash: ?token_hash=...&type=recovery
      const tokenHash = params.get('token_hash') || params.get('token');
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
        if (!error && !cancelled) { setReady(true); return; }
      }

      // Formato classico con token nell'hash
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (!error && !cancelled) { setReady(true); return; }
      }

      // Sessione già attiva
      const { data } = await supabase.auth.getSession();
      if (data.session && !cancelled) setReady(true);
    };

    init();

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);


  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('La password deve avere almeno 6 caratteri');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password aggiornata con successo!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Errore nell\'aggiornamento');
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <img src={logoImg} alt="Logo" className="h-12 w-12 mx-auto object-contain" />
          <p className="text-sm text-muted-foreground">Link non valido o scaduto.</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>Torna al login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <img src={logoImg} alt="Logo" className="h-16 w-16 object-contain" />
          <h1 className="text-xl font-extrabold text-foreground">Nuova Password</h1>
        </div>
        <form onSubmit={handleReset} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nuova Password</label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-10"
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            <KeyRound className="h-4 w-4" />
            {loading ? 'Aggiornamento...' : 'Aggiorna Password'}
          </Button>
        </form>
      </div>
    </div>
  );
}
