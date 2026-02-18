import { useState, useCallback } from 'react';

const STORAGE_KEY = 'location-history';
const MAX_ENTRIES = 30;

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {}
}

export function useLocationHistory() {
  const [history, setHistory] = useState<string[]>(loadHistory);

  const addLocation = useCallback((location: string) => {
    const trimmed = location.trim();
    if (!trimmed) return;
    setHistory(prev => {
      // Move to front if already exists, otherwise add
      const filtered = prev.filter(l => l.toLowerCase() !== trimmed.toLowerCase());
      const next = [trimmed, ...filtered].slice(0, MAX_ENTRIES);
      saveHistory(next);
      return next;
    });
  }, []);

  return { history, addLocation };
}
