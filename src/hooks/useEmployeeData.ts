import { useState, useEffect, useCallback } from 'react';
import type { EmployeeData, DayEntry } from '@/types/employee';

function loadData(storageKey: string): EmployeeData {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.employees)) {
        return parsed;
      }
    }
  } catch {
    try { localStorage.removeItem(storageKey); } catch {}
  }
  return { employees: [] };
}

export function forceSave(data: EmployeeData, storageKey: string) {
  localStorage.setItem(storageKey, JSON.stringify(data));
}

export function useEmployeeData(storageKey: string) {
  const [data, setData] = useState<EmployeeData>(() => loadData(storageKey));

  // Reload data when storageKey changes (company switch)
  useEffect(() => {
    setData(loadData(storageKey));
  }, [storageKey]);

  useEffect(() => {
    const timer = setTimeout(() => forceSave(data, storageKey), 500);
    return () => clearTimeout(timer);
  }, [data, storageKey]);

  const addEmployee = useCallback((name: string) => {
    setData(prev => ({
      employees: [
        ...prev.employees,
        { id: crypto.randomUUID(), name, days: {} },
      ],
    }));
  }, []);

  const removeEmployee = useCallback((id: string) => {
    setData(prev => ({
      employees: prev.employees.filter(e => e.id !== id),
    }));
  }, []);

  const updateDayEntry = useCallback((employeeId: string, dateKey: string, entry: DayEntry) => {
    setData(prev => ({
      employees: prev.employees.map(e =>
        e.id === employeeId
          ? { ...e, days: { ...e.days, [dateKey]: entry } }
          : e
      ),
    }));
  }, []);

  return { data, addEmployee, removeEmployee, updateDayEntry };
}
