import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary";

// If the user opens a password-recovery link that lands on the wrong route,
// redirect immediately (before React Router renders) while preserving tokens.
const recoveryHash = window.location.hash || "";
const isRecoveryLink =
  recoveryHash.includes("type=recovery") ||
  (recoveryHash.includes("access_token") && recoveryHash.includes("refresh_token"));

// A stale cached build can fail to load a code chunk after a new deploy.
// Reload once (guarded by sessionStorage) so the app never stays stuck.
const RELOAD_FLAG = "chunk-reload-once";
function isChunkError(message: string) {
  return /Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(
    message,
  );
}
function handleFatal(message: string) {
  if (!isChunkError(message)) return;
  if (sessionStorage.getItem(RELOAD_FLAG)) return;
  sessionStorage.setItem(RELOAD_FLAG, "1");
  window.location.reload();
}
window.addEventListener("error", (e) => handleFatal(String(e?.message || "")));
window.addEventListener("unhandledrejection", (e) =>
  handleFatal(String((e as PromiseRejectionEvent)?.reason?.message || "")),
);
window.addEventListener("load", () => sessionStorage.removeItem(RELOAD_FLAG));

const fatalFallback = (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
    <p className="text-base font-semibold">Qualcosa non ha funzionato</p>
    <p className="text-sm text-muted-foreground max-w-sm">
      I dati sono salvi. Ricarica l'app per continuare a lavorare.
    </p>
    <button
      onClick={() => window.location.reload()}
      className="px-5 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold"
    >
      Ricarica
    </button>
  </div>
);

if (isRecoveryLink && !window.location.pathname.startsWith("/reset-password")) {
  window.location.replace(`/reset-password${window.location.search}${window.location.hash}`);
} else {
  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary fallback={fatalFallback}>
      <App />
    </ErrorBoundary>,
  );
}
