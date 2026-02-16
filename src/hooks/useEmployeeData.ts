import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { EmployeeData, DayEntry, Employee } from '@/types/employee';

export function useEmployeeData(sectionId: string) {
  const { user } = useAuth();
  const [data, setData] = useState<EmployeeData>({ employees: [] });
  const [loading, setLoading] = useState(true);

  // Load employees + their day entries from DB
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: emps, error } = await supabase
        .from('employees')
        .select('id, name')
        .eq('section_id', sectionId)
        .order('created_at');

      if (error) throw error;

      const employees: Employee[] = [];
      for (const emp of emps || []) {
        const { data: entries } = await supabase
          .from('day_entries')
          .select('date_key, status, hours, location')
          .eq('employee_id', emp.id);

        const days: Record<string, DayEntry> = {};
        for (const e of entries || []) {
          days[e.date_key] = {
            status: (e.status || '') as DayEntry['status'],
            hours: Number(e.hours) || 0,
            location: e.location || '',
          };
        }
        employees.push({ id: emp.id, name: emp.name, days });
      }
      setData({ employees });
    } catch (err) {
      console.error('Error loading employees:', err);
    } finally {
      setLoading(false);
    }
  }, [user, sectionId]);

  useEffect(() => { loadData(); }, [loadData]);

  const addEmployee = useCallback(async (name: string) => {
    if (!user) return;
    const { data: emp, error } = await supabase
      .from('employees')
      .insert({ name, section_id: sectionId, user_id: user.id })
      .select('id, name')
      .single();

    if (error) { console.error(error); return; }
    setData(prev => ({
      employees: [...prev.employees, { id: emp.id, name: emp.name, days: {} }],
    }));
  }, [user, sectionId]);

  const removeEmployee = useCallback(async (id: string) => {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) { console.error(error); return; }
    setData(prev => ({ employees: prev.employees.filter(e => e.id !== id) }));
  }, []);

  const updateDayEntry = useCallback(async (employeeId: string, dateKey: string, entry: DayEntry) => {
    if (!user) return;
    const { error } = await supabase
      .from('day_entries')
      .upsert({
        employee_id: employeeId,
        user_id: user.id,
        date_key: dateKey,
        status: entry.status,
        hours: entry.hours,
        location: entry.location || '',
      }, { onConflict: 'employee_id,date_key' });

    if (error) { console.error(error); return; }
    setData(prev => ({
      employees: prev.employees.map(e =>
        e.id === employeeId
          ? { ...e, days: { ...e.days, [dateKey]: entry } }
          : e
      ),
    }));
  }, [user]);

  return { data, loading, addEmployee, removeEmployee, updateDayEntry };
}

// Keep for backward compat with PDF export save button
export function forceSave() {
  // No-op: data is now in the database
}
