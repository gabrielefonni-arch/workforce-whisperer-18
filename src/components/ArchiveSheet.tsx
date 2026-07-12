import { useState, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Archive, Download, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
  '': 'Vuoto',
  P: 'Presente',
  A: 'Assente',
  M: 'Malattia',
  F: 'Ferie',
  PR: 'Permesso',
  FES: 'Festivo',
};

const OP_LABEL: Record<string, string> = {
  INSERT: 'Aggiunto',
  UPDATE: 'Modificato',
  DELETE: 'Cancellato',
};

export function ArchiveSheet() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

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
    if (o) load();
  };

  const downloadCSV = () => {
    if (rows.length === 0) {
      toast.error('Archivio vuoto');
      return;
    }
    const header = ['Data e ora modifica', 'Operazione', 'Dipendente', 'Giorno', 'Stato', 'Ore', 'Cantiere/Via'];
    const lines = rows.map(r => [
      new Date(r.changed_at).toLocaleString('it-IT'),
      OP_LABEL[r.operation] || r.operation,
      names[r.employee_id] || r.employee_id,
      r.date_key,
      STATUS_LABEL[r.status || ''] ?? (r.status || ''),
      String(r.hours ?? ''),
      (r.location || '').replace(/"/g, '""'),
    ]);
    const csv = [header, ...lines]
      .map(cols => cols.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `archivio-modifiche-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Archivio scaricato');
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-1 text-xs px-2.5">
          <Archive className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Archivio</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[340px] sm:w-[440px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Archive className="h-4 w-4" /> Archivio Modifiche
          </SheetTitle>
        </SheetHeader>

        <p className="text-xs text-muted-foreground mt-2">
          Qui viene conservata l'ultima versione salvata di ogni giornata, sempre aggiornata.
          {rows.length > 0 && ` (${rows.length} voci)`}
        </p>

        <div className="flex gap-2 mt-3">
          <Button onClick={downloadCSV} size="sm" className="gap-1 flex-1" disabled={loading || rows.length === 0}>
            <Download className="h-3.5 w-3.5" /> Scarica CSV
          </Button>
          <Button onClick={load} size="sm" variant="outline" className="gap-1" disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> Aggiorna
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto mt-3 -mx-1 px-1 space-y-1.5">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-10">Nessuna modifica registrata.</p>
          ) : (
            rows.slice(0, 500).map(r => (
              <div key={r.id} className="border rounded-md p-2 text-xs bg-card">
                <div className="flex justify-between items-center gap-2">
                  <span className="font-semibold truncate">{names[r.employee_id] || 'Dipendente'}</span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(r.changed_at).toLocaleString('it-IT')}
                  </span>
                </div>
                <div className="text-muted-foreground mt-0.5">
                  <span className="font-medium">{OP_LABEL[r.operation] || r.operation}</span>
                  {' · '}{r.date_key}
                  {' · '}{STATUS_LABEL[r.status || ''] ?? r.status}
                  {r.hours ? ` · ${r.hours}h` : ''}
                  {r.location ? ` · ${r.location}` : ''}
                </div>
              </div>
            ))
          )}
          {rows.length > 500 && (
            <p className="text-[10px] text-muted-foreground text-center py-2">
              Mostrate le 500 modifiche più recenti. Scarica il CSV per l'archivio completo.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
