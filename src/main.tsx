import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// If the user opens a password-recovery link that lands on the wrong route,
// redirect immediately (before React Router renders) while preserving tokens.
const recoveryHash = window.location.hash || "";
const isRecoveryLink =
  recoveryHash.includes("type=recovery") ||
  (recoveryHash.includes("access_token") && recoveryHash.includes("refresh_token"));

if (isRecoveryLink && !window.location.pathname.startsWith("/reset-password")) {
  window.location.replace(`/reset-password${window.location.search}${window.location.hash}`);
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}

