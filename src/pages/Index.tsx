import { useState } from 'react';
import { useEmployeeData, forceSave } from '@/hooks/useEmployeeData';
import { useCompany } from '@/contexts/CompanyContext';
import { WeekMonthNavigator } from '@/components/WeekMonthNavigator';
import { EmployeeGrid } from '@/components/EmployeeGrid';
import { MonthlyTotals } from '@/components/MonthlyTotals';
import { Legend } from '@/components/Legend';
import { exportToPDF } from '@/lib/pdfExport';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, Download, Trash2, Save } from 'lucide-react';
import logoImg from '@/assets/logo.png';
import { toast } from 'sonner';
import { CompanySelector } from '@/components/CompanySelector';

const Index = () => {
  const { currentCompany } = useCompany();
  const { data, addEmployee, removeEmployee, updateDayEntry } = useEmployeeData(currentCompany.storageKey);
  const [newName, setNewName] = useState('');
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(2);
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
    exportToPDF(data.employees, selectedYear, selectedMonth);
    toast.success('PDF scaricato con successo');
  };

  const handleSave = () => {
    forceSave(data, currentCompany.storageKey);
    toast.success('Modifiche salvate con successo!');
  };

  return (
    <div className={`min-h-screen bg-background ${currentCompany.themeClass}`}>
      {/* Header – compact mobile */}
      <header className="bg-primary text-primary-foreground sticky top-0 z-50 shadow-lg">
        <div className="max-w-[1600px] mx-auto px-3 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={logoImg} alt="Logo Edilristrutturazioni" className="h-8 w-8 object-contain" />
            <div className="min-w-0">
              <h1 className="text-base font-extrabold tracking-tight leading-tight">{currentCompany.name}</h1>
              <p className="text-[10px] opacity-75 font-medium hidden sm:block">Gestione Dipendenti · Presenze</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <Button onClick={handleSave} variant="secondary" size="sm" className="gap-1 text-xs px-2.5">
              <Save className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Salva</span>
            </Button>
            <Button onClick={handleExport} variant="secondary" size="sm" className="gap-1 text-xs px-2.5">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
          </div>
        </div>
        {/* Company Selector */}
        <div className="max-w-[1600px] mx-auto px-3 pb-2 pt-1">
          <CompanySelector />
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-3 py-4 space-y-4">
        {/* Add employee */}
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

        {/* Legend */}
        <Legend />

        {/* Employee chips */}
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

        {/* Navigation */}
        <WeekMonthNavigator
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          selectedWeekStart={selectedWeekStart}
          onMonthChange={(y, m) => { setSelectedYear(y); setSelectedMonth(m); }}
          onWeekChange={setSelectedWeekStart}
        />

        {/* Main Grid */}
        <EmployeeGrid
          employees={data.employees}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          selectedWeekStart={selectedWeekStart}
          onUpdateDay={updateDayEntry}
        />

        {/* Monthly Totals */}
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

        {/* Bottom spacing for mobile */}
        <div className="h-4" />
      </main>
    </div>
  );
};

export default Index;
