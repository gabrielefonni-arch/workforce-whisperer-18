import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

interface ExpiredAppt {
  id: string;
  name: string;
  address: string;
  date: string;
  time: string;
}

export function ExpiredAppointmentsAlert({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [expired, setExpired] = useState<ExpiredAppt[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const nowTime = now.toTimeString().slice(0, 5);

    supabase
      .from('appointments')
      .select('id, name, address, date, time')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .lte('date', todayStr)
      .then(({ data }) => {
        const overdue = (data ?? []).filter(a => {
          if (a.date < todayStr) return true;
          if (a.date === todayStr && a.time && a.time <= nowTime) return true;
          return false;
        });
        setExpired(overdue);
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Controllo appuntamenti...
      </div>
    );
  }

  if (expired.length > 0 && !acknowledged) {
    return (
      <div className="min-h-screen bg-background">
        <AlertDialog open={true}>
          <AlertDialogContent onEscapeKeyDown={e => e.preventDefault()}>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">
                ⚠️ Appuntamenti Scaduti ({expired.length})
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  <p className="text-sm text-muted-foreground mb-2">
                    Hai appuntamenti in attesa con orario già passato:
                  </p>
                  {expired.map(a => (
                    <div key={a.id} className="bg-destructive/10 rounded-md p-2 text-sm text-left">
                      <p className="font-semibold">{a.name}</p>
                      <p className="text-muted-foreground">{a.address}</p>
                      <p className="text-xs">{a.date} alle {a.time}</p>
                    </div>
                  ))}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setAcknowledged(true)}>
                Ho preso visione
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return <>{children}</>;
}
