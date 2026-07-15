import { useState } from 'react';
import { useEmployeeData } from '@/hooks/useEmployeeData';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { WeekMonthNavigator } from '@/components/WeekMonthNavigator';
import { EmployeeGrid } from '@/components/EmployeeGrid';
import { MonthlyTotals } from '@/components/MonthlyTotals';
import { Legend } from '@/components/Legend';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { exportToPDF } from '@/lib/pdfExport';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, Download, Trash2, LogOut, Save, Users } from 'lucide-react';
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
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date | null>(null);

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

  const handleExport = () => {
    if (data.employees.length === 0) {
      toast.error('Nessun dipendente da esportare');
      return;
    }
    exportToPDF(data.employees, selectedYear, selectedMonth, currentCompany.name, currentCompany.id);
    toast.success('PDF scaricato con successo');
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Disconnesso');
  };

  return (
    <div className={`min-h-screen bg-background ${currentSection.themeClass}`}>
      {/* Modern header with layered gradient */}
      <header className="relative bg-primary text-primary-foreground sticky top-0 z-50 shadow-lg overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80 pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
        <div className="relative max-w-[1600px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-primary-foreground/15 backdrop-blur-sm border border-primary-foreground/10 flex items-center justify-center shrink-0">
                <img src={logoImg} alt="Logo" className="h-7 w-7 object-contain" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight leading-tight truncate">
                  {currentCompany.name}
                </h1>
                <p className="text-[10px] sm:text-xs opacity-70 font-medium leading-tight">
                  Gestione Dipendenti · Presenze
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <div className="hidden sm:flex items-center gap-1 pr-1 mr-1 border-r border-primary-foreground/15">
                <Button onClick={() => toast.success('Dati salvati correttamente')} variant="ghost" size="sm" className="gap-1 text-xs h-8 px-2.5 text-primary-foreground hover:bg-primary-foreground/15">
                  <Save className="h-3.5 w-3.5" /> Salva
                </Button>
                <Button onClick={handleExport} variant="ghost" size="sm" className="gap-1 text-xs h-8 px-2.5 text-primary-foreground hover:bg-primary-foreground/15">
                  <Download className="h-3.5 w-3.5" /> PDF
                </Button>
              </div>
              <div className="sm:hidden flex items-center gap-1">
                <Button onClick={() => toast.success('Dati salvati correttamente')} variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/15">
                  <Save className="h-4 w-4" />
                </Button>
                <Button onClick={handleExport} variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/15">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              <ArchiveSheet />
              <SettingsSheet />
              <Button onClick={handleSignOut} variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/15">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <CompanySelector />
            {data.employees.length > 0 && (
              <div className="hidden md:flex items-center gap-1.5 text-[11px] font-medium bg-primary-foreground/10 px-2.5 py-1 rounded-full border border-primary-foreground/10">
                <Users className="h-3 w-3" />
                <span>{data.employees.length} dipendenti attivi</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-3 sm:px-4 py-5 space-y-4">
        <ErrorBoundary>
          {/* Add employee card */}
          <section className="rounded-2xl border bg-card shadow-sm p-3.5 sm:p-4">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <h2 className="text-sm font-bold leading-tight">Nuovo Dipendente</h2>
                <p className="text-[11px] text-muted-foreground">Aggiungi una persona al team</p>
              </div>
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <UserPlus className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nome e cognome"
                className="h-9 text-sm"
                onKeyDown={e => e.key === 'Enter' && handleAddEmployee()}
              />
              <Button onClick={handleAddEmployee} size="sm" className="gap-1 h-9 shrink-0">
                <UserPlus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Aggiungi</span>
              </Button>
            </div>

            {data.employees.length > 0 && (
              <div className="mt-3 pt-3 border-t flex flex-wrap gap-1.5">
                {data.employees.map(emp => (
                  <div key={emp.id} className="group flex items-center gap-1 bg-secondary hover:bg-secondary/70 transition-colors rounded-full pl-2.5 pr-1 py-0.5 text-xs">
                    <span className="font-medium">{emp.name}</span>
                    <button
                      onClick={() => handleRemove(emp.id, emp.name)}
                      className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label={`Rimuovi ${emp.name}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Legend />

          <WeekMonthNavigator
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            selectedWeekStart={selectedWeekStart}
            onMonthChange={(y, m) => { setSelectedYear(y); setSelectedMonth(m); }}
            onWeekChange={setSelectedWeekStart}
          />

          <EmployeeGrid
            employees={data.employees}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            selectedWeekStart={selectedWeekStart}
            sectionId={currentSection.id}
            onUpdateDay={updateDayEntry}
          />

          {data.employees.length > 0 && (
            <section className="rounded-2xl border bg-card shadow-sm p-3.5 sm:p-4">
              <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Riepilogo Mensile
              </h2>
              <MonthlyTotals
                employees={data.employees}
                year={selectedYear}
                month={selectedMonth}
              />
            </section>
          )}
        </ErrorBoundary>

        <div className="h-4" />
      </main>
    </div>
  );
};

export default Index;
