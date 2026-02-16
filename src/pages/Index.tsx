import { useState } from 'react';
import { useEmployeeData } from '@/hooks/useEmployeeData';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { WeekMonthNavigator } from '@/components/WeekMonthNavigator';
import { EmployeeGrid } from '@/components/EmployeeGrid';
import { MonthlyTotals } from '@/components/MonthlyTotals';
import { Legend } from '@/components/Legend';
import { AppointmentsView } from '@/components/AppointmentsView';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { exportToPDF } from '@/lib/pdfExport';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, Download, Trash2, LogOut } from 'lucide-react';
import logoImg from '@/assets/logo.png';
import { toast } from 'sonner';
import { CompanySelector } from '@/components/CompanySelector';

const Index = () => {
  const { currentCompany, currentSection } = useCompany();
  const { signOut } = useAuth();
  const { data, addEmployee, removeEmployee, updateDayEntry } = useEmployeeData(currentSection.id);
  const [newName, setNewName] = useState('');
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(2);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date | null>(null);

  const isAppointments = currentSection.type === 'appointments';

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
    exportToPDF(data.employees, selectedYear, selectedMonth, currentCompany.name);
    toast.success('PDF scaricato con successo');
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Disconnesso');
  };

  const headerTitle = isAppointments ? 'Appuntamenti' : currentCompany.name;
  const headerSubtitle = isAppointments ? 'Gestione Appuntamenti' : 'Gestione Dipendenti · Presenze';

  return (
    <div className={`min-h-screen bg-background ${currentSection.themeClass}`}>
      <header className="bg-primary text-primary-foreground sticky top-0 z-50 shadow-lg">
        <div className="max-w-[1600px] mx-auto px-3 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={logoImg} alt="Logo Edilristrutturazioni" className="h-8 w-8 object-contain" />
            <div className="min-w-0">
              <h1 className="text-base font-extrabold tracking-tight leading-tight">{headerTitle}</h1>
              <p className="text-[10px] opacity-75 font-medium hidden sm:block">{headerSubtitle}</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {!isAppointments && (
              <Button onClick={handleExport} variant="secondary" size="sm" className="gap-1 text-xs px-2.5">
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
            )}
            <Button onClick={handleSignOut} variant="secondary" size="sm" className="gap-1 text-xs px-2.5">
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Esci</span>
            </Button>
          </div>
        </div>
        <div className="max-w-[1600px] mx-auto px-3 pb-2 pt-1">
          <CompanySelector />
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-3 py-4 space-y-4">
        {isAppointments ? (
          <ErrorBoundary>
            <AppointmentsView />
          </ErrorBoundary>
        ) : (
          <>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nuovo Dipendente</label>
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Nome e cognome"
                  className="h-9 text-sm"
                  onKeyDown={e => e.key === 'Enter' && handleAddEmployee()}
                />
              </div>
              <Button onClick={handleAddEmployee} size="sm" className="gap-1 h-9">
                <UserPlus className="h-3.5 w-3.5" />
                Aggiungi
              </Button>
            </div>

            <Legend />

            {data.employees.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {data.employees.map(emp => (
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

            <EmployeeGrid
              employees={data.employees}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              selectedWeekStart={selectedWeekStart}
              onUpdateDay={updateDayEntry}
            />

            {data.employees.length > 0 && (
              <div>
                <h2 className="text-sm font-bold mb-2">Riepilogo Mensile</h2>
                <MonthlyTotals
                  employees={data.employees}
                  year={selectedYear}
                  month={selectedMonth}
                />
              </div>
            )}
          </>
        )}

        <div className="h-4" />
      </main>
    </div>
  );
};

export default Index;
