import { useRegisterSW } from 'virtual:pwa-register/react';

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      if (r) {
        // Check for updates immediately and every 60 seconds
        r.update();
        setInterval(() => r.update(), 60 * 1000);
      }
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-2xl shadow-2xl p-6 mx-4 max-w-sm w-full text-center space-y-4">
        <div className="text-4xl">🔄</div>
        <h2 className="text-xl font-bold text-foreground">Aggiornamento disponibile</h2>
        <p className="text-muted-foreground text-sm">
          È disponibile una nuova versione dell'app con miglioramenti e correzioni.
        </p>
        <button
          onClick={() => updateServiceWorker(true)}
          className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl text-base hover:opacity-90 transition-opacity"
        >
          Aggiorna ora
        </button>
      </div>
    </div>
  );
}
