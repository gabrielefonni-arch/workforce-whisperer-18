import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { AppointmentData, Appointment, AppointmentStatus } from '@/types/appointment';
import { appointmentSchema, appointmentUpdateSchema } from '@/lib/validation';

function mapRow(a: {
  id: string; name: string; address: string; date: string;
  time: string; status: string; notes: string | null;
}): Appointment {
  return {
    id: a.id,
    name: a.name,
    address: a.address,
    date: a.date,
    time: a.time,
    status: a.status as AppointmentStatus,
    notes: a.notes || '',
  };
}

export function useAppointments() {
  const { user } = useAuth();
  const [data, setData] = useState<AppointmentData>({ appointments: [] });

  const loadData = useCallback(async () => {
    if (!user) return;
    const { data: appts, error } = await supabase
      .from('appointments')
      .select('id, name, address, date, time, status, notes')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      toast.error('Errore nel caricamento appuntamenti');
      return;
    }
    setData({ appointments: (appts || []).map(mapRow) });
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const addAppointment = useCallback(async (appt: Omit<Appointment, 'id'>) => {
    if (!user) return;
    const result = appointmentSchema.safeParse(appt);
    if (!result.success) {
      toast.error(result.error.errors.map(e => e.message).join(', '));
      return;
    }
    const validated = result.data;
    const { data: row, error } = await supabase
      .from('appointments')
      .insert({ name: validated.name, address: validated.address, date: validated.date, time: validated.time, status: validated.status, notes: validated.notes, user_id: user.id })
      .select('id, name, address, date, time, status, notes')
      .single();

    if (error) {
      console.error(error);
      toast.error('Errore durante l\'aggiunta dell\'appuntamento');
      return;
    }
    setData(prev => ({ appointments: [mapRow(row), ...prev.appointments] }));
  }, [user]);

  const updateAppointment = useCallback(async (id: string, updates: Partial<Appointment>) => {
    const result = appointmentUpdateSchema.safeParse(updates);
    if (!result.success) {
      toast.error(result.error.errors.map(e => e.message).join(', '));
      return;
    }
    // Optimistic update
    setData(prev => ({
      appointments: prev.appointments.map(a => a.id === id ? { ...a, ...result.data } : a),
    }));
    const { error } = await supabase.from('appointments').update(result.data).eq('id', id);
    if (error) {
      console.error(error);
      toast.error('Errore nel salvataggio');
      loadData(); // revert
    }
  }, [loadData]);

  const removeAppointment = useCallback(async (id: string) => {
    // Optimistic update
    setData(prev => ({ appointments: prev.appointments.filter(a => a.id !== id) }));
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) {
      console.error(error);
      toast.error('Errore durante la rimozione');
      loadData(); // revert
    }
  }, [loadData]);

  const updateStatus = useCallback(async (id: string, status: AppointmentStatus) => {
    const validStatuses = ['pending', 'done', 'cancelled', 'forgotten'] as const;
    if (!validStatuses.includes(status as any)) {
      toast.error('Stato non valido');
      return;
    }
    // Optimistic update
    setData(prev => ({
      appointments: prev.appointments.map(a => a.id === id ? { ...a, status } : a),
    }));
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
    if (error) {
      console.error(error);
      toast.error('Errore nel salvataggio stato');
      loadData(); // revert
    }
  }, [loadData]);

  return { data, addAppointment, updateAppointment, removeAppointment, updateStatus };
}
