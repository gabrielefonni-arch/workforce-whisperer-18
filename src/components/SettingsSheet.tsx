import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Settings, RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

export function SettingsSheet() {
  const [open, setOpen] = useState(false);

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
        <Button variant="secondary" size="sm" className="gap-1 text-xs px-2.5">
          <Settings className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Impostazioni</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[360px]">
        <SheetHeader>
          <SheetTitle>Impostazioni</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
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
