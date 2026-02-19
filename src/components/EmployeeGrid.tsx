import { useState, memo, useCallback, useId } from 'react';
import type { Employee, DayEntry, DayStatus } from '@/types/employee';
import { getDaysInMonth, getWeeksInMonth, dateKey, isWeekend } from '@/lib/dateUtils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { User, ChevronDown, ChevronUp, MapPin, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useLocationHistory } from '@/hooks/useLocationHistory';

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

// Isolated location input – only saves on blur, with history datalist
const LocationInput = memo(function LocationInput({
  initialValue,
  onSave,
  history,
}: {
  initialValue: string;
  onSave: (val: string) => void;
  history: string[];
}) {
  const [value, setValue] = useState(initialValue);
  const listId = useId();
  return (
    <>
      <datalist id={listId}>
        {history.map(loc => (
          <option key={loc} value={loc} />
        ))}
      </datalist>
      <Input
        list={listId}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={() => onSave(value)}
        placeholder="Via / cantiere"
        className="h-7 text-xs px-1.5"
        autoCorrect="off"
        spellCheck={false}
      />
    </>
  );
});

// Isolated hours input – only saves on blur
const HoursInput = memo(function HoursInput({
  initialValue,
  onSave,
}: {
  initialValue: number;
  onSave: (val: number) => void;
}) {
  const [value, setValue] = useState(initialValue === 0 ? '' : String(initialValue));
  return (
    <Input
      type="number"
      inputMode="decimal"
      min={0}
      max={24}
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={() => onSave(parseFloat(value) || 0)}
      placeholder="Ore"
      className="h-7 text-xs px-1.5 text-center font-mono"
      autoComplete="off"
    />
  );
});

interface ExpandedDayProps {
  day: Date;
  entry: DayEntry;
  empId: string;
  updateField: (empId: string, day: Date, field: Partial<DayEntry>) => void;
  locationHistory: string[];
}

const ExpandedDay = memo(function ExpandedDay({ day, entry, empId, updateField, locationHistory }: ExpandedDayProps) {
  const weekend = isWeekend(day);

  const handleStatusClick = useCallback(
    (status: DayStatus) => updateField(empId, day, {
      status,
      ...(status === 'present' ? { hours: 8 } : {}),
    }),
    [empId, day, updateField],
  );
  const handleLocationSave = useCallback(
    (location: string) => updateField(empId, day, { location }),
    [empId, day, updateField],
  );
  const handleHoursSave = useCallback(
    (hours: number) => updateField(empId, day, { hours }),
    [empId, day, updateField],
  );

  return (
    <div className={`px-3 py-2 space-y-1.5 ${weekend && !entry.status ? 'bg-muted/40' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold min-w-[70px]">
          {format(day, 'EEE d MMM', { locale: it })}
        </span>
        <div className="flex gap-1">
          {STATUSES.filter(s => s.value !== '').map(s => (
            <button
              key={s.value}
              onClick={() => handleStatusClick(s.value)}
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

      <div className="flex gap-2">
        <div className="flex items-center gap-1 w-20 shrink-0">
          <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
          <HoursInput
            key={`${empId}-${dateKey(day)}-h-${entry.hours}`}
            initialValue={entry.hours}
            onSave={handleHoursSave}
          />
        </div>
        <div className="flex items-center gap-1 flex-1">
          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
          <LocationInput
            key={`${empId}-${dateKey(day)}-l`}
            initialValue={entry.location || ''}
            onSave={handleLocationSave}
            history={locationHistory}
          />
        </div>
      </div>
    </div>
  );
});

export function EmployeeGrid({ employees, selectedYear, selectedMonth, selectedWeekStart, onUpdateDay }: Props) {
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null);
  const { history: locationHistory, addLocation } = useLocationHistory();
  const allDays = getDaysInMonth(selectedYear, selectedMonth);

  const visibleDays = selectedWeekStart
    ? allDays.filter(d => {
        const weeks = getWeeksInMonth(selectedYear, selectedMonth);
        const week = weeks.find(w => w[0].getTime() === selectedWeekStart.getTime());
        return week?.some(wd => wd.getTime() === d.getTime());
      })
    : allDays;

  const getEntry = useCallback(
    (emp: Employee, day: Date): DayEntry => {
      const saved = emp.days[dateKey(day)];
      if (saved) return saved;
      return isWeekend(day) ? { status: 'holiday', hours: 0, location: '' } : { status: '', hours: 0, location: '' };
    },
    [],
  );

  const updateField = useCallback(
    (empId: string, day: Date, field: Partial<DayEntry>) => {
      const emp = employees.find(e => e.id === empId);
      const current = emp ? getEntry(emp, day) : { status: '' as DayStatus, hours: 0, location: '' };
      if (field.location) addLocation(field.location);
      onUpdateDay(empId, dateKey(day), { ...current, ...field });
    },
    [employees, getEntry, onUpdateDay, addLocation],
  );

  const cycleStatus = useCallback(
    (empId: string, day: Date) => {
      const emp = employees.find(e => e.id === empId);
      const current = emp ? getEntry(emp, day) : { status: '' as DayStatus, hours: 0, location: '' };
      const idx = STATUSES.findIndex(s => s.value === current.status);
      const next = STATUSES[(idx + 1) % STATUSES.length];
      const extraFields = next.value === 'present' ? { hours: 8 } : {};
      onUpdateDay(empId, dateKey(day), { ...current, status: next.value, ...extraFields });
    },
    [employees, getEntry, onUpdateDay],
  );

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

            {isExpanded && (
              <div className="divide-y">
                {visibleDays.map(day => (
                  <ExpandedDay
                    key={dateKey(day)}
                    day={day}
                    entry={getEntry(emp, day)}
                    empId={emp.id}
                    updateField={updateField}
                    locationHistory={locationHistory}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
