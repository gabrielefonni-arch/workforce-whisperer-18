import { supabase } from '@/integrations/supabase/client';

const PAGE = 1000;

async function fetchAll(table: 'employees' | 'day_entries' | 'day_entries_history' | 'appointments', userId: string) {
  let all: unknown[] = [];
  let page = 0;
  // paginate to bypass the default 1000-row API limit
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    page++;
  }
  return all;
}

export interface FullExport {
  exportedAt: string;
  version: 1;
  userId: string;
  counts: Record<string, number>;
  data: Record<string, unknown[]>;
}

/** Downloads a complete, portable snapshot of every record owned by the user. */
export async function downloadFullExport(userId: string): Promise<FullExport> {
  const [employees, dayEntries, history, appointments] = await Promise.all([
    fetchAll('employees', userId),
    fetchAll('day_entries', userId),
    fetchAll('day_entries_history', userId),
    fetchAll('appointments', userId),
  ]);

  const payload: FullExport = {
    exportedAt: new Date().toISOString(),
    version: 1,
    userId,
    counts: {
      employees: employees.length,
      day_entries: dayEntries.length,
      day_entries_history: history.length,
      appointments: appointments.length,
    },
    data: { employees, day_entries: dayEntries, day_entries_history: history, appointments },
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `export-completo-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);

  return payload;
}
