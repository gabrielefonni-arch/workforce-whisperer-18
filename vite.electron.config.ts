import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Config dedicata alla build dell'app desktop (Electron).
// Nessun service worker/PWA e percorsi relativi per il caricamento da file://
const SUPABASE_URL = "https://vdfglzacnhtbzvczzpni.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_DH8l6Hu5AaOPYvv0TImEpw_-EXAK2Qy";

export default defineConfig({
  base: "./",
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(SUPABASE_URL),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(SUPABASE_PUBLISHABLE_KEY),
    "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify("vdfglzacnhtbzvczzpni"),
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist-electron",
    emptyOutDir: true,
  },
});
