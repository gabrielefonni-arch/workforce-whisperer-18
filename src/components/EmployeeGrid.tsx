import { useState } from 'react';
import type { Employee, DayEntry, DayStatus } from '@/types/employee';
import { getDaysInMonth, getWeeksInMonth, dateKey, isWeekend } from '@/lib/dateUtils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { User, ChevronDown, ChevronUp, MapPin, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Props {
  employees: Employee[];
  selectedYear: number;
  selectedMonth: number;
  selectedWeekStart: Date | null;
  onUpdateDay: (employeeId: string, dateKey: string, entry: DayEntry) => void;
}

const STATUSES: { value: DayStatus; label: string; short: string; style: string }[] = [
  { value: '', label: '—', short: '—', style: 'bg-muted text-muted-foreground' },
  { value: 'present', label: 'Presente', short: 'P', style: 'bg-success/20 text-success border-success/50' },
  { value: 'injury', label: 'Infortunio', short: 'I', style: 'bg-warning/20 text-accent-foreground border-warning/50' },
  { value: 'sick', label: 'Malattia', short: 'M', style: 'bg-absence/20 text-absence border-absence/50' },
  { value: 'holiday', label: 'Festivo', short: 'F', style: 'bg-info/20 text-info border-info/50' },
];

export function EmployeeGrid({ employees, selectedYear, selectedMonth, selectedWeekStart, onUpdateDay }: Props) {
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null);
  const allDays = getDaysInMonth(selectedYear, selectedMonth);

  const visibleDays = selectedWeekStart
    ? allDays.filter(d => {
        const weeks = getWeeksInMonth(selectedYear, selectedMonth);
        const week = weeks.find(w => w[0].getTime() === selectedWeekStart.getTime());
        return week?.some(wd => wd.getTime() === d.getTime());
      })
    : allDays;

  const getEntry = (emp: Employee, day: Date): DayEntry => {
    const saved = emp.days[dateKey(day)];
    if (saved) return saved;
    return isWeekend(day) ? { status: 'holiday', hours: 0, location: '' } : { status: '', hours: 0, location: '' };
  };

  const updateField = (empId: string, day: Date, field: Partial<DayEntry>) => {
    const emp = employees.find(e => e.id === empId);
    const current = emp ? getEntry(emp, day) : { status: '' as DayStatus, hours: 0, location: '' };
    onUpdateDay(empId, dateKey(day), { ...current, ...field });
  };

  const cycleStatus = (empId: string, day: Date) => {
    const emp = employees.find(e => e.id === empId);
    const current = emp ? getEntry(emp, day) : { status: '' as DayStatus, hours: 0, location: '' };
    const idx = STATUSES.findIndex(s => s.value === current.status);
    const next = STATUSES[(idx + 1) % STATUSES.length];
    onUpdateDay(empId, dateKey(day), { ...current, status: next.value });
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
    <div className="space-y-3 animate-fade-in">
      {employees.map(emp => {
        const isExpanded = expandedEmp === emp.id;
        const totalHours = visibleDays.reduce((s, d) => s + getEntry(emp, d).hours, 0);

        return (
          <div key={emp.id} className="bg-card rounded-lg border shadow-sm overflow-hidden">
            {/* Employee header – tap to expand */}
            <button
              onClick={() => setExpandedEmp(isExpanded ? null : emp.id)}
              className="w-full px-3 py-2.5 flex items-center justify-between bg-secondary/50 border-b hover:bg-secondary/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{emp.name}</span>
                <span className="text-xs text-muted-foreground font-mono">{totalHours}h</span>
              </div>
              {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {/* Compact view: day pills */}
            {!isExpanded && (
              <div className="grid grid-cols-7 gap-px p-1.5">
                {visibleDays.map(day => {
                  const entry = getEntry(emp, day);
                  const statusInfo = STATUSES.find(s => s.value === entry.status) || STATUSES[0];
                  const weekend = isWeekend(day);

                  return (
                    <button
                      key={dateKey(day)}
                      onClick={() => cycleStatus(emp.id, day)}
                      className={`flex flex-col items-center justify-center rounded-md py-1 px-0.5 text-[10px] leading-tight transition-all active:scale-95 border ${
                        entry.status
                          ? statusInfo.style
                          : weekend
                          ? 'bg-muted/60 border-transparent text-muted-foreground'
                          : 'border-transparent hover:bg-muted/40'
                      }`}
                    >
                      <span className="font-medium opacity-70 uppercase">
                        {format(day, 'EEE', { locale: it }).slice(0, 2)}
                      </span>
                      <span className="font-bold text-xs">{format(day, 'd')}</span>
                      {entry.status && (
                        <span className="font-mono font-bold text-[10px] mt-0.5">
                          {entry.hours > 0 ? entry.hours : statusInfo.short}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Expanded view: full day-by-day editing */}
            {isExpanded && (
              <div className="divide-y">
                {visibleDays.map(day => {
                  const entry = getEntry(emp, day);
                  const weekend = isWeekend(day);
                  const statusInfo = STATUSES.find(s => s.value === entry.status) || STATUSES[0];

                  return (
                    <div
                      key={dateKey(day)}
                      className={`px-3 py-2 space-y-1.5 ${weekend && !entry.status ? 'bg-muted/40' : ''}`}
                    >
                      {/* Day label + status buttons */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold min-w-[70px]">
                          {format(day, 'EEE d MMM', { locale: it })}
                        </span>
                        <div className="flex gap-1">
                          {STATUSES.filter(s => s.value !== '').map(s => (
                            <button
                              key={s.value}
                              onClick={() => updateField(emp.id, day, { status: s.value })}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all ${
                                entry.status === s.value
                                  ? s.style + ' ring-1 ring-offset-1'
                                  : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                              }`}
                            >
                              {s.short}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Hours + Location inputs */}
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1 w-20 shrink-0">
                          <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                          <Input
                            type="number"
                            min={0}
                            max={24}
                            value={entry.hours || ''}
                            onChange={e => updateField(emp.id, day, { hours: parseFloat(e.target.value) || 0 })}
                            placeholder="Ore"
                            className="h-7 text-xs px-1.5 text-center font-mono"
                          />
                        </div>
                        <div className="flex items-center gap-1 flex-1">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          <Input
                            value={entry.location || ''}
                            onChange={e => updateField(emp.id, day, { location: e.target.value })}
                            placeholder="Via / cantiere"
                            className="h-7 text-xs px-1.5"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
