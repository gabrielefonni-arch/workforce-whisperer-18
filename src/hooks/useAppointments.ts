import { useState, useEffect, useCallback } from 'react';
import type { AppointmentData, Appointment, AppointmentStatus } from '@/types/appointment';

function loadData(storageKey: string): AppointmentData {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.appointments)) {
        return parsed;
      }
    }
  } catch {
    // Corrupted data — reset
    try { localStorage.removeItem(storageKey); } catch {}
  }
  return { appointments: [] };
}

function saveData(data: AppointmentData, storageKey: string) {
  localStorage.setItem(storageKey, JSON.stringify(data));
}

export function useAppointments(storageKey: string) {
  const [data, setData] = useState<AppointmentData>(() => loadData(storageKey));

  useEffect(() => {
    setData(loadData(storageKey));
  }, [storageKey]);

  useEffect(() => {
    const timer = setTimeout(() => saveData(data, storageKey), 500);
    return () => clearTimeout(timer);
  }, [data, storageKey]);

  const addAppointment = useCallback((appt: Omit<Appointment, 'id'>) => {
    setData(prev => ({
      appointments: [
        { ...appt, id: crypto.randomUUID() },
        ...prev.appointments,
      ],
    }));
  }, []);

  const updateAppointment = useCallback((id: string, updates: Partial<Appointment>) => {
    setData(prev => ({
      appointments: prev.appointments.map(a =>
        a.id === id ? { ...a, ...updates } : a
      ),
    }));
  }, []);

  const removeAppointment = useCallback((id: string) => {
    setData(prev => ({
      appointments: prev.appointments.filter(a => a.id !== id),
    }));
  }, []);

  const updateStatus = useCallback((id: string, status: AppointmentStatus) => {
    setData(prev => ({
      appointments: prev.appointments.map(a =>
        a.id === id ? { ...a, status } : a
      ),
    }));
  }, []);

  return { data, addAppointment, updateAppointment, removeAppointment, updateStatus };
}
