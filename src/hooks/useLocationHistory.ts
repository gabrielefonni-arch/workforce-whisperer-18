import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const MAX_ENTRIES = 50;

function getStorageKey(sectionId: string) {
  return `location-history-${sectionId}`;
}

function loadLocal(sectionId: string): string[] {
  try {
    const raw = localStorage.getItem(getStorageKey(sectionId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocal(sectionId: string, history: string[]) {
  try {
    localStorage.setItem(getStorageKey(sectionId), JSON.stringify(history));
  } catch {}
}

export function useLocationHistory(sectionId: string) {
  const { user } = useAuth();
  // Start from local cache for instant availability, then sync with DB
  const [history, setHistory] = useState<string[]>(() => loadLocal(sectionId));
  const sectionRef = useRef(sectionId);
  sectionRef.current = sectionId;

  // Load persisted history (separated per user + company/section) from the database
  useEffect(() => {
    setHistory(loadLocal(sectionId));
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('location_history')
        .select('location')
        .eq('user_id', user.id)
        .eq('section_id', sectionId)
        .order('last_used_at', { ascending: false })
        .limit(MAX_ENTRIES);
      if (cancelled || error || !data) return;
      const list = data.map(r => r.location);
      setHistory(list);
      saveLocal(sectionId, list);
    })();
    return () => { cancelled = true; };
  }, [user, sectionId]);

  const addLocation = useCallback((location: string) => {
    const trimmed = location.trim();
    if (!trimmed) return;
    setHistory(prev => {
      const filtered = prev.filter(l => l.toLowerCase() !== trimmed.toLowerCase());
      const next = [trimmed, ...filtered].slice(0, MAX_ENTRIES);
      saveLocal(sectionRef.current, next);
      return next;
    });
    if (user) {
      supabase
        .from('location_history')
        .upsert(
          { user_id: user.id, section_id: sectionRef.current, location: trimmed, last_used_at: new Date().toISOString() },
          { onConflict: 'user_id,section_id,location' }
        )
        .then(({ error }) => { if (error) console.error('Errore salvataggio via:', error); });
    }
  }, [user]);

  return { history, addLocation };
}
