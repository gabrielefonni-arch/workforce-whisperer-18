import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Settings, RefreshCw, Sun, Moon, SunMoon } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { useTheme, type ThemeMode } from '@/contexts/ThemeContext';

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Chiaro', icon: Sun },
  { value: 'dark', label: 'Scuro', icon: Moon },
  { value: 'system', label: 'Auto', icon: SunMoon },
];

export function SettingsSheet({ fullWidth = false }: { fullWidth?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const { mode, setMode } = useTheme();

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      if (r) {
        r.update();
      }
    },
  });

  const handleUpdate = async () => {
    try {
      await updateServiceWorker(true);
      toast.success('App aggiornata con successo');
    } catch {
      toast.info('Nessun aggiornamento disponibile');
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {fullWidth ? (
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 text-sm">
            <Settings className="h-4 w-4" />
            Impostazioni
          </Button>
        ) : (
          <Button variant="secondary" size="sm" className="gap-1 text-[11px] px-1.5 sm:px-2 h-7 sm:h-8">
            <Settings className="h-3 w-3" />
            <span className="hidden sm:inline">Impostazioni</span>
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[360px]">
        <SheetHeader>
          <SheetTitle>Impostazioni</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="p-3 rounded-lg border bg-card space-y-2">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Aspetto</p>
              <p className="text-xs text-muted-foreground">Scegli il tema dell'app</p>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {THEME_OPTIONS.map(opt => {
                const Icon = opt.icon;
                return (
                  <Button
                    key={opt.value}
                    onClick={() => setMode(opt.value)}
                    variant={mode === opt.value ? 'default' : 'outline'}
                    size="sm"
                    className="flex-col h-auto py-2 gap-1 text-[11px]"
                  >
                    <Icon className="h-4 w-4" />
                    {opt.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Aggiorna App</p>
              <p className="text-xs text-muted-foreground">
                {needRefresh ? 'Aggiornamento disponibile!' : 'Verifica aggiornamenti'}
              </p>
            </div>
            <Button
              onClick={handleUpdate}
              size="sm"
              variant={needRefresh ? 'default' : 'outline'}
              className="gap-1"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {needRefresh ? 'Aggiorna' : 'Verifica'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
