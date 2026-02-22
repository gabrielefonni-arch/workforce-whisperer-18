import { useState, useEffect, useCallback, useRef } from 'react';
// v2 – batch query + optimistic updates
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { EmployeeData, DayEntry, Employee } from '@/types/employee';
import { employeeSchema, dayEntrySchema } from '@/lib/validation';

export function useEmployeeData(sectionId: string) {
  const { user } = useAuth();
  const [data, setData] = useState<EmployeeData>({ employees: [] });
  const [loading, setLoading] = useState(true);
  // Prevent duplicate concurrent loads
  const loadingRef = useRef(false);

  const loadData = useCallback(async () => {
    if (!user || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      // 1. Fetch employees for this section
      const { data: emps, error: empsError } = await supabase
        .from('employees')
        .select('id, name')
        .eq('section_id', sectionId)
        .eq('user_id', user.id)
        .order('created_at');

      if (empsError) throw empsError;
      if (!emps || emps.length === 0) {
        setData({ employees: [] });
        return;
      }

      const empIds = emps.map(e => e.id);

      // 2. Single batch query for ALL day entries (no N+1)
      const { data: entries, error: entriesError } = await supabase
        .from('day_entries')
        .select('employee_id, date_key, status, hours, location')
        .in('employee_id', empIds);

      if (entriesError) throw entriesError;

      // 3. Group entries by employee_id in memory (O(n))
      const entriesByEmp: Record<string, Record<string, DayEntry>> = {};
      for (const empId of empIds) entriesByEmp[empId] = {};
      for (const e of entries || []) {
        entriesByEmp[e.employee_id][e.date_key] = {
          status: (e.status || '') as DayEntry['status'],
          hours: Number(e.hours) || 0,
          location: e.location || '',
        };
      }

      const employees: Employee[] = emps.map(emp => ({
        id: emp.id,
        name: emp.name,
        days: entriesByEmp[emp.id] || {},
      }));

      setData({ employees });
    } catch (err) {
      console.error('Error loading employees:', err);
      toast.error('Errore nel caricamento dati. Riprova.');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [user, sectionId]);

  useEffect(() => {
    setData({ employees: [] });
    loadData();
  }, [loadData]);

  const addEmployee = useCallback(async (name: string) => {
    if (!user) return;
    const result = employeeSchema.safeParse({ name });
    if (!result.success) {
      toast.error(result.error.errors.map(e => e.message).join(', '));
      return;
    }
    const { data: emp, error } = await supabase
      .from('employees')
      .insert({ name: result.data.name, section_id: sectionId, user_id: user.id })
      .select('id, name')
      .single();

    if (error) {
      console.error(error);
      toast.error('Errore durante l\'aggiunta del dipendente');
      return;
    }
    setData(prev => ({
      employees: [...prev.employees, { id: emp.id, name: emp.name, days: {} }],
    }));
  }, [user, sectionId]);

  const removeEmployee = useCallback(async (id: string) => {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) {
      console.error(error);
      toast.error('Errore durante la rimozione del dipendente');
      return;
    }
    setData(prev => ({ employees: prev.employees.filter(e => e.id !== id) }));
  }, []);

  const updateDayEntry = useCallback(async (employeeId: string, dateKey: string, entry: DayEntry) => {
    if (!user) return;

    const result = dayEntrySchema.safeParse({ ...entry, date_key: dateKey });
    if (!result.success) {
      toast.error(result.error.errors.map(e => e.message).join(', '));
      return;
    }

    // Optimistic update – instant UI response
    setData(prev => ({
      employees: prev.employees.map(e =>
        e.id === employeeId
          ? { ...e, days: { ...e.days, [dateKey]: entry } }
          : e
      ),
    }));

    const { error } = await supabase
      .from('day_entries')
      .upsert({
        employee_id: employeeId,
        user_id: user.id,
        date_key: result.data.date_key,
        status: result.data.status,
        hours: result.data.hours,
        location: result.data.location || '',
      }, { onConflict: 'employee_id,date_key' });

    if (error) {
      console.error(error);
      toast.error('Errore nel salvataggio. Riprova.');
      // Revert optimistic update on failure
      loadData();
    }
  }, [user, loadData]);

  return { data, loading, addEmployee, removeEmployee, updateDayEntry };
}

// Keep for backward compat
export function forceSave() {}
