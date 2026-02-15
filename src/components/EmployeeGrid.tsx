import type { Employee, DayEntry, DayStatus } from '@/types/employee';
import { getDaysInMonth, getWeeksInMonth, dateKey, isWeekend, formatDayLabel } from '@/lib/dateUtils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { User } from 'lucide-react';

interface Props {
  employees: Employee[];
  selectedYear: number;
  selectedMonth: number;
  selectedWeekStart: Date | null;
  onUpdateDay: (employeeId: string, dateKey: string, entry: DayEntry) => void;
}

const STATUS_CYCLE: DayStatus[] = ['', 'present', 'half', 'absent', 'holiday'];
const STATUS_HOURS: Record<DayStatus, number> = { '': 0, present: 8, half: 4, absent: 0, holiday: 0 };

const STATUS_STYLES: Record<DayStatus, string> = {
  '': '',
  present: 'bg-success/20 border-success/50 text-success',
  half: 'bg-warning/20 border-warning/50 text-accent-foreground',
  absent: 'bg-absence/20 border-absence/50 text-absence',
  holiday: 'bg-info/20 border-info/50 text-info',
};

const STATUS_LABELS: Record<DayStatus, string> = {
  '': '–',
  present: '8',
  half: '4',
  absent: 'A',
  holiday: 'F',
};

export function EmployeeGrid({ employees, selectedYear, selectedMonth, selectedWeekStart, onUpdateDay }: Props) {
  const allDays = getDaysInMonth(selectedYear, selectedMonth);

  const visibleDays = selectedWeekStart
    ? allDays.filter(d => {
        const weeks = getWeeksInMonth(selectedYear, selectedMonth);
        const week = weeks.find(w => w[0].getTime() === selectedWeekStart.getTime());
        return week?.some(wd => wd.getTime() === d.getTime());
      })
    : allDays;

  const handleCycle = (empId: string, day: Date) => {
    const key = dateKey(day);
    const emp = employees.find(e => e.id === empId);
    const current = emp?.days[key]?.status || '';
    const idx = STATUS_CYCLE.indexOf(current);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    onUpdateDay(empId, key, { status: next, hours: STATUS_HOURS[next] });
  };

  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground animate-fade-in">
        <User className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-sm font-medium">Nessun dipendente aggiunto</p>
        <p className="text-xs">Aggiungi un dipendente per iniziare</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {employees.map(emp => (
        <div key={emp.id} className="bg-card rounded-lg border shadow-sm overflow-hidden">
          {/* Employee header */}
          <div className="px-3 py-2.5 bg-secondary/50 border-b">
            <span className="font-semibold text-sm">{emp.name}</span>
            <span className="text-xs text-muted-foreground ml-2">
              {visibleDays.reduce((sum, d) => sum + (emp.days[dateKey(d)]?.hours || 0), 0)}h
            </span>
          </div>

          {/* Days grid – mobile-optimized */}
          <div className="grid grid-cols-7 gap-px p-1.5">
            {visibleDays.map(day => {
              const key = dateKey(day);
              const entry = emp.days[key];
              const status = entry?.status || '';
              const weekend = isWeekend(day);

              return (
                <button
                  key={key}
                  onClick={() => handleCycle(emp.id, day)}
                  className={`flex flex-col items-center justify-center rounded-md py-1.5 px-0.5 text-[10px] leading-tight transition-all active:scale-95 border ${
                    weekend && !status
                      ? 'bg-muted/60 border-transparent text-muted-foreground'
                      : status
                      ? STATUS_STYLES[status]
                      : 'border-transparent hover:bg-muted/40'
                  }`}
                >
                  <span className="font-medium opacity-70 uppercase">
                    {format(day, 'EEE', { locale: it }).slice(0, 2)}
                  </span>
                  <span className="font-bold text-xs">{format(day, 'd')}</span>
                  <span className="font-mono font-bold text-[10px] mt-0.5">
                    {status ? STATUS_LABELS[status] : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
