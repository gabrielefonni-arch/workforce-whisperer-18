import { useMemo, useState } from 'react';
import { useEmployeeData } from '@/hooks/useEmployeeData';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { WeekMonthNavigator } from '@/components/WeekMonthNavigator';
import { EmployeeGrid } from '@/components/EmployeeGrid';
import { MonthlyTotals } from '@/components/MonthlyTotals';
import { Legend } from '@/components/Legend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, Download, Trash2, LogOut, Save, Search, X } from 'lucide-react';
import logoImg from '@/assets/logo.png';
import { toast } from 'sonner';
import { CompanySelector } from '@/components/CompanySelector';
import { SettingsSheet } from '@/components/SettingsSheet';
import { ArchiveSheet } from '@/components/ArchiveSheet';

const Index = () => {
  const { currentCompany, currentSection } = useCompany();
  const { signOut } = useAuth();
  const { data, addEmployee, removeEmployee, updateDayEntry } = useEmployeeData(currentSection.id);
  const [newName, setNewName] = useState('');
  const [search, setSearch] = useState('');
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date | null>(null);

  const query = search.trim().toLowerCase();
  const visibleEmployees = useMemo(() => {
    if (!query) return data.employees;
    return data.employees.filter(emp => {
      if (emp.name.toLowerCase().includes(query)) return true;
      return Object.values(emp.days).some(d => (d.location || '').toLowerCase().includes(query));
    });
  }, [data.employees, query]);


  const handleAddEmployee = () => {
    const name = newName.trim();
    if (!name) {
      toast.error('Inserisci il nome del dipendente');
      return;
    }
    addEmployee(name);
    setNewName('');
    toast.success(`${name} aggiunto con successo`);
  };

  const handleRemove = (id: string, name: string) => {
    if (confirm(`Sei sicuro di voler rimuovere ${name}?`)) {
      removeEmployee(id);
      toast.success(`${name} rimosso`);
    }
  };

  const handleExport = async () => {
    if (data.employees.length === 0) {
      toast.error('Nessun dipendente da esportare');
      return;
    }
    // Loaded on demand so the PDF code never slows down the initial app start
    const { exportToPDF } = await import('@/lib/pdfExport');
    exportToPDF(data.employees, selectedYear, selectedMonth, currentCompany.name, currentCompany.id);
    toast.success('PDF scaricato con successo');
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Disconnesso');
  };

  const headerTitle = currentCompany.name;
  const headerSubtitle = 'Gestione Dipendenti · Presenze';

  return (
    <div className={`min-h-screen bg-background ${currentSection.themeClass}`}>
      <header className="bg-primary text-primary-foreground sticky top-0 z-50 shadow-lg">
        <div className="max-w-[1600px] mx-auto px-2 py-1.5 sm:px-3 sm:py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img src={logoImg} alt="Logo Edilristrutturazioni" className="h-6 w-6 sm:h-7 sm:w-7 object-contain shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-extrabold tracking-tight leading-tight truncate">{headerTitle}</h1>
              <p className="text-[9px] opacity-75 font-medium hidden sm:block">{headerSubtitle}</p>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button onClick={() => toast.success('Dati salvati correttamente')} variant="secondary" size="sm" className="gap-1 text-[11px] px-1.5 sm:px-2 h-7 sm:h-8">
              <Save className="h-3 w-3" />
              <span className="hidden sm:inline">Salva</span>
            </Button>
            <Button onClick={handleExport} variant="secondary" size="sm" className="gap-1 text-[11px] px-1.5 sm:px-2 h-7 sm:h-8">
              <Download className="h-3 w-3" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
            <ArchiveSheet />
            <SettingsSheet />
            <Button onClick={handleSignOut} variant="secondary" size="sm" className="gap-1 text-[11px] px-1.5 sm:px-2 h-7 sm:h-8">
              <LogOut className="h-3 w-3" />
              <span className="hidden sm:inline">Esci</span>
            </Button>
          </div>
        </div>
        <div className="max-w-[1600px] mx-auto px-3 pb-2 pt-1">
          <CompanySelector />
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-3 py-4 space-y-4">
        {(
          <>
            <section className="rounded-xl border bg-card shadow-sm p-3 space-y-2.5">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 block">Nuovo Dipendente</label>
                  <Input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Nome e cognome"
                    className="h-10 text-sm"
                    onKeyDown={e => e.key === 'Enter' && handleAddEmployee()}
                  />
                </div>
                <Button onClick={handleAddEmployee} size="sm" className="gap-1 h-10 px-3">
                  <UserPlus className="h-4 w-4" />
                  Aggiungi
                </Button>
              </div>

              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Cerca dipendente o cantiere…"
                  className="h-10 text-sm pl-9 pr-9 rounded-full bg-muted/40 border-transparent focus-visible:bg-background"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    aria-label="Cancella ricerca"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {query && (
                <p className="text-xs text-muted-foreground">
                  {visibleEmployees.length === 0
                    ? 'Nessun risultato per la ricerca'
                    : `${visibleEmployees.length} di ${data.employees.length} dipendenti`}
                </p>
              )}
            </section>


            <Legend />

            {visibleEmployees.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {visibleEmployees.map(emp => (
                  <div key={emp.id} className="flex items-center gap-1 bg-secondary rounded-full px-2.5 py-1 text-xs">
                    <span className="font-medium">{emp.name}</span>
                    <button
                      onClick={() => handleRemove(emp.id, emp.name)}
                      className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <WeekMonthNavigator
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              selectedWeekStart={selectedWeekStart}
              onMonthChange={(y, m) => { setSelectedYear(y); setSelectedMonth(m); }}
              onWeekChange={setSelectedWeekStart}
            />

            {visibleEmployees.length > 0 && (
              <section className="rounded-xl border bg-card shadow-sm p-3">
                <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                  Riepilogo Mensile
                </h2>
                <MonthlyTotals
                  employees={visibleEmployees}
                  year={selectedYear}
                  month={selectedMonth}
                />
              </section>
            )}

            <EmployeeGrid
              employees={visibleEmployees}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              selectedWeekStart={selectedWeekStart}
              sectionId={currentSection.id}
              onUpdateDay={updateDayEntry}
            />


          </>
        )}

        <div className="h-4" />
      </main>
    </div>
  );
};

export default Index;
