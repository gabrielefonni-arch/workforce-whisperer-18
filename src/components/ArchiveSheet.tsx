import { useState, useCallback, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Archive, Download, RefreshCw, Loader2, ChevronRight, ChevronDown, Search, FileText, Users, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MONTHS_IT } from '@/lib/dateUtils';

interface HistoryRow {
  id: string;
  employee_id: string;
  date_key: string;
  status: string | null;
  hours: number | null;
  location: string | null;
  operation: string;
  changed_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  '': '—',
  P: 'Presente',
  A: 'Assente',
  M: 'Malattia',
  F: 'Ferie',
  PR: 'Permesso',
  FES: 'Festivo',
};

const STATUS_COLOR: Record<string, string> = {
  P: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  A: 'bg-red-500/15 text-red-700 dark:text-red-400',
  M: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  F: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  PR: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  FES: 'bg-slate-500/15 text-slate-700 dark:text-slate-400',
};

type Grouped = {
  key: string; // YYYY-MM
  year: number;
  month: number; // 0-11
  label: string;
  totalChanges: number;
  employees: {
    id: string;
    name: string;
    changes: number;
    entries: HistoryRow[]; // latest per date_key
  }[];
};

export function ArchiveSheet() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: emps } = await supabase
        .from('employees')
        .select('id, name')
        .eq('user_id', user.id);
      const nameMap: Record<string, string> = {};
      (emps || []).forEach(e => { nameMap[e.id] = e.name; });
      setNames(nameMap);

      const PAGE = 1000;
      let all: HistoryRow[] = [];
      let page = 0;
      while (true) {
        const { data, error } = await supabase
          .from('day_entries_history')
          .select('id, employee_id, date_key, status, hours, location, operation, changed_at')
          .eq('user_id', user.id)
          .order('changed_at', { ascending: false })
          .range(page * PAGE, page * PAGE + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all = all.concat(data as HistoryRow[]);
        if (data.length < PAGE) break;
        page++;
      }
      setRows(all);
    } catch (err) {
      console.error('Errore caricamento archivio:', err);
      toast.error('Errore nel caricamento archivio');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (o && rows.length === 0) load();
  };

  // Group by month → employee, keep only the most recent version per (emp, date_key) within each month
  const grouped = useMemo<Grouped[]>(() => {
    const q = search.trim().toLowerCase();
    const byMonth: Record<string, {
      year: number; month: number;
      byEmp: Record<string, { seen: Set<string>; entries: HistoryRow[]; changes: number }>;
    }> = {};

    for (const r of rows) {
      const empName = names[r.employee_id] || '';
      if (q && !empName.toLowerCase().includes(q) && !(r.location || '').toLowerCase().includes(q) && !r.date_key.includes(q)) continue;

      const [y, m] = r.date_key.split('-').map(Number);
      const mKey = `${y}-${String(m).padStart(2, '0')}`;
      if (!byMonth[mKey]) byMonth[mKey] = { year: y, month: m - 1, byEmp: {} };
      const em = byMonth[mKey].byEmp;
      if (!em[r.employee_id]) em[r.employee_id] = { seen: new Set(), entries: [], changes: 0 };
      em[r.employee_id].changes++;
      if (!em[r.employee_id].seen.has(r.date_key)) {
        em[r.employee_id].seen.add(r.date_key);
        em[r.employee_id].entries.push(r); // rows already sorted DESC by changed_at => first is latest
      }
    }

    return Object.entries(byMonth)
      .map(([key, v]) => {
        const employees = Object.entries(v.byEmp).map(([id, d]) => ({
          id,
          name: names[id] || 'Dipendente',
          changes: d.changes,
          entries: d.entries.sort((a, b) => a.date_key.localeCompare(b.date_key)),
        })).sort((a, b) => a.name.localeCompare(b.name));
        return {
          key,
          year: v.year,
          month: v.month,
          label: `${MONTHS_IT[v.month]} ${v.year}`,
          totalChanges: employees.reduce((s, e) => s + e.changes, 0),
          employees,
        };
      })
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [rows, names, search]);

  const downloadMonthCSV = (g: Grouped) => {
    const header = ['Dipendente', 'Data', 'Stato', 'Ore', 'Cantiere/Via', 'Ultima modifica'];
    const lines: string[][] = [];
    g.employees.forEach(emp => {
      emp.entries.forEach(r => {
        lines.push([
          emp.name,
          r.date_key,
          STATUS_LABEL[r.status || ''] ?? (r.status || ''),
          String(r.hours ?? ''),
          r.location || '',
          new Date(r.changed_at).toLocaleString('it-IT'),
        ]);
      });
    });
    const csv = [header, ...lines]
      .map(cols => cols.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `archivio-${g.key}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Scaricato ${g.label}`);
  };

  const totalMonths = grouped.length;
  const totalEmps = new Set(rows.map(r => r.employee_id)).size;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-1 text-xs px-2.5">
          <Archive className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Archivio</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[480px] flex flex-col p-0">
        <div className="px-5 pt-5 pb-3 border-b">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-base">
              <Archive className="h-4 w-4" /> Archivio Storico
            </SheetTitle>
          </SheetHeader>
          <p className="text-xs text-muted-foreground mt-1.5">
            Storico completo di tutte le modifiche. Ogni cambiamento è al sicuro e recuperabile.
          </p>

          {rows.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="rounded-md border bg-card p-2">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wide">
                  <Calendar className="h-3 w-3" /> Mesi
                </div>
                <div className="text-lg font-bold leading-tight mt-0.5">{totalMonths}</div>
              </div>
              <div className="rounded-md border bg-card p-2">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wide">
                  <Users className="h-3 w-3" /> Dipendenti
                </div>
                <div className="text-lg font-bold leading-tight mt-0.5">{totalEmps}</div>
              </div>
              <div className="rounded-md border bg-card p-2">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wide">
                  <FileText className="h-3 w-3" /> Modifiche
                </div>
                <div className="text-lg font-bold leading-tight mt-0.5">{rows.length}</div>
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cerca dipendente, cantiere, data…"
                className="h-8 pl-7 text-xs"
              />
            </div>
            <Button onClick={load} size="sm" variant="outline" className="h-8 gap-1 px-2" disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : grouped.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Archive className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                {rows.length === 0 ? 'Nessuna modifica ancora registrata.' : 'Nessun risultato per la ricerca.'}
              </p>
            </div>
          ) : (
            grouped.map(g => {
              const isMonthOpen = expandedMonth === g.key;
              return (
                <div key={g.key} className="rounded-lg border bg-card overflow-hidden">
                  <button
                    onClick={() => { setExpandedMonth(isMonthOpen ? null : g.key); setExpandedEmp(null); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-accent/50 transition-colors text-left"
                  >
                    {isMonthOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm capitalize">{g.label}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {g.employees.length} dipendenti · {g.totalChanges} modifiche
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-xs shrink-0"
                      onClick={(e) => { e.stopPropagation(); downloadMonthCSV(g); }}
                    >
                      <Download className="h-3 w-3" /> CSV
                    </Button>
                  </button>

                  {isMonthOpen && (
                    <div className="border-t bg-muted/20 divide-y">
                      {g.employees.map(emp => {
                        const empKey = `${g.key}:${emp.id}`;
                        const isEmpOpen = expandedEmp === empKey;
                        return (
                          <div key={emp.id}>
                            <button
                              onClick={() => setExpandedEmp(isEmpOpen ? null : empKey)}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/40 transition-colors text-left"
                            >
                              {isEmpOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                              <span className="text-sm font-medium truncate flex-1">{emp.name}</span>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {emp.entries.length} giorni
                              </span>
                            </button>
                            {isEmpOpen && (
                              <div className="px-3 pb-2.5 pt-1 space-y-1">
                                {emp.entries.map(r => {
                                  const d = new Date(r.date_key);
                                  const dayNum = d.getDate();
                                  const dayName = d.toLocaleDateString('it-IT', { weekday: 'short' });
                                  const st = r.status || '';
                                  return (
                                    <div key={r.id} className="flex items-center gap-2 py-1 text-xs">
                                      <div className="w-10 shrink-0 text-center">
                                        <div className="font-semibold leading-none">{dayNum}</div>
                                        <div className="text-[9px] text-muted-foreground uppercase mt-0.5">{dayName}</div>
                                      </div>
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLOR[st] || 'bg-muted text-muted-foreground'}`}>
                                        {STATUS_LABEL[st] ?? st ?? '—'}
                                      </span>
                                      {r.hours ? <span className="text-muted-foreground">{r.hours}h</span> : null}
                                      {r.location ? (
                                        <span className="text-muted-foreground truncate flex-1">· {r.location}</span>
                                      ) : <span className="flex-1" />}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
