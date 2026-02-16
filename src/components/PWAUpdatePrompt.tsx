import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { useEffect } from 'react';

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      // Check for updates every 60 seconds
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 1000);
      }
    },
  });

  useEffect(() => {
    if (needRefresh) {
      toast('Nuova versione disponibile!', {
        description: 'Aggiorna per ottenere le ultime modifiche.',
        duration: Infinity,
        action: {
          label: 'Aggiorna',
          onClick: () => updateServiceWorker(true),
        },
      });
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
}
