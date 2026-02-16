import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AppointmentData, Appointment, AppointmentStatus } from '@/types/appointment';

export function useAppointments() {
  const { user } = useAuth();
  const [data, setData] = useState<AppointmentData>({ appointments: [] });

  const loadData = useCallback(async () => {
    if (!user) return;
    const { data: appts, error } = await supabase
      .from('appointments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) { console.error(error); return; }
    setData({
      appointments: (appts || []).map(a => ({
        id: a.id,
        name: a.name,
        address: a.address,
        date: a.date,
        time: a.time,
        status: a.status as AppointmentStatus,
        notes: a.notes || '',
      })),
    });
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const addAppointment = useCallback(async (appt: Omit<Appointment, 'id'>) => {
    if (!user) return;
    const { data: row, error } = await supabase
      .from('appointments')
      .insert({ ...appt, user_id: user.id })
      .select()
      .single();

    if (error) { console.error(error); return; }
    setData(prev => ({
      appointments: [
        { id: row.id, name: row.name, address: row.address, date: row.date, time: row.time, status: row.status as AppointmentStatus, notes: row.notes || '' },
        ...prev.appointments,
      ],
    }));
  }, [user]);

  const updateAppointment = useCallback(async (id: string, updates: Partial<Appointment>) => {
    const { error } = await supabase.from('appointments').update(updates).eq('id', id);
    if (error) { console.error(error); return; }
    setData(prev => ({
      appointments: prev.appointments.map(a => a.id === id ? { ...a, ...updates } : a),
    }));
  }, []);

  const removeAppointment = useCallback(async (id: string) => {
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) { console.error(error); return; }
    setData(prev => ({ appointments: prev.appointments.filter(a => a.id !== id) }));
  }, []);

  const updateStatus = useCallback(async (id: string, status: AppointmentStatus) => {
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
    if (error) { console.error(error); return; }
    setData(prev => ({
      appointments: prev.appointments.map(a => a.id === id ? { ...a, status } : a),
    }));
  }, []);

  return { data, addAppointment, updateAppointment, removeAppointment, updateStatus };
}
