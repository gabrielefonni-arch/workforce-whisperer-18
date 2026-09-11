import { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'app-theme-mode';

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  setMode: () => {},
  isDark: false,
});

function readStored(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* storage non disponibile */
  }
  return 'system';
}

function systemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStored);
  const [isDark, setIsDark] = useState(() => (readStored() === 'system' ? systemPrefersDark() : readStored() === 'dark'));

  useEffect(() => {
    const apply = () => {
      const dark = mode === 'system' ? systemPrefersDark() : mode === 'dark';
      setIsDark(dark);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();

    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignora */
    }
  }, []);

  return <ThemeContext.Provider value={{ mode, setMode, isDark }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
