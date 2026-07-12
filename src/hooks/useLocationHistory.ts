import { useState, useCallback } from 'react';

const MAX_ENTRIES = 30;

function getStorageKey(sectionId: string) {
  return `location-history-${sectionId}`;
}

function loadHistory(sectionId: string): string[] {
  try {
    const raw = localStorage.getItem(getStorageKey(sectionId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(sectionId: string, history: string[]) {
  try {
    localStorage.setItem(getStorageKey(sectionId), JSON.stringify(history));
  } catch {}
}

export function useLocationHistory(sectionId: string) {
  const [history, setHistory] = useState<string[]>(() => loadHistory(sectionId));

  const addLocation = useCallback((location: string) => {
    const trimmed = location.trim();
    if (!trimmed) return;
    setHistory(prev => {
      const filtered = prev.filter(l => l.toLowerCase() !== trimmed.toLowerCase());
      const next = [trimmed, ...filtered].slice(0, MAX_ENTRIES);
      saveHistory(sectionId, next);
      return next;
    });
  }, [sectionId]);

  return { history, addLocation };
}
