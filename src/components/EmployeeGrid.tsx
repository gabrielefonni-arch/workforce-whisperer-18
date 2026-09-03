import { useState, memo, useCallback, useId, useMemo, useRef } from 'react';
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
  sectionId: string;
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

interface DayMeta {
  day: Date;
  key: string;
  weekend: boolean;
  isToday: boolean;
  dowShort: string;
  dom: string;
  longLabel: string;
}


interface ExpandedDayProps {
  meta: DayMeta;
  entry: DayEntry;
  empId: string;
  updateField: (empId: string, day: Date, field: Partial<DayEntry>) => void;
  locationHistory: string[];
}

const ExpandedDay = memo(function ExpandedDay({ meta, entry, empId, updateField, locationHistory }: ExpandedDayProps) {
  const { day, weekend } = meta;

  const handleStatusClick = useCallback(
    (status: DayStatus) => {
      const hours = status === 'present' ? 8 : 0;
      updateField(empId, day, { status, hours });
    },
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
        <span className="text-xs font-semibold min-w-[70px]">{meta.longLabel}</span>
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
            key={`${empId}-${meta.key}-h-${entry.hours}`}
            initialValue={entry.hours}
            onSave={handleHoursSave}
          />
        </div>
        <div className="flex items-center gap-1 flex-1">
          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
          <LocationInput
            key={`${empId}-${meta.key}-l`}
            initialValue={entry.location || ''}
            onSave={handleLocationSave}
            history={locationHistory}
          />
        </div>
      </div>
    </div>
  );
});

const STATUS_MAP = new Map(STATUSES.map(s => [s.value, s]));

function entryFor(emp: Employee, meta: DayMeta): DayEntry {
  const saved = emp.days[meta.key];
  if (saved) return saved;
  return meta.weekend ? { status: 'holiday', hours: 0, location: '' } : { status: '', hours: 0, location: '' };
}

interface CardProps {
  emp: Employee;
  days: DayMeta[];
  isExpanded: boolean;
  onToggle: (id: string) => void;
  updateField: (empId: string, day: Date, field: Partial<DayEntry>) => void;
  cycleStatus: (empId: string, day: Date) => void;
  locationHistory: string[];
}

const EmployeeCard = memo(function EmployeeCard({
  emp,
  days,
  isExpanded,
  onToggle,
  updateField,
  cycleStatus,
  locationHistory,
}: CardProps) {
  const entries = useMemo(() => days.map(meta => entryFor(emp, meta)), [emp, days]);
  const totalHours = useMemo(() => entries.reduce((s, e) => s + e.hours, 0), [entries]);

  return (
    <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
      <button
        onClick={() => onToggle(emp.id)}
        className="w-full px-3 py-2.5 flex items-center justify-between bg-secondary/50 border-b hover:bg-secondary/70 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{emp.name}</span>
          <span className="text-xs text-muted-foreground font-mono">{totalHours}h</span>
        </div>
        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {!isExpanded ? (
        <div className="grid grid-cols-7 gap-1 p-2">
          {days.map((meta, i) => {
            const entry = entries[i];
            const statusInfo = STATUS_MAP.get(entry.status) || STATUSES[0];

            return (
              <button
                key={meta.key}
                onClick={() => cycleStatus(emp.id, meta.day)}
                className={`relative flex flex-col items-center justify-center rounded-lg min-h-[52px] py-1.5 px-0.5 text-[10px] leading-tight transition-all active:scale-95 border-2 ${
                  entry.status
                    ? statusInfo.style
                    : meta.weekend
                    ? 'bg-muted/60 border-transparent text-muted-foreground'
                    : 'border-dashed border-border/70 hover:bg-muted/40'
                } ${meta.isToday ? 'ring-2 ring-primary ring-offset-1' : ''}`}
              >
                <span className="font-semibold opacity-70 uppercase tracking-wide">{meta.dowShort}</span>
                <span className="font-bold text-sm">{meta.dom}</span>
                {entry.status ? (
                  <span className="font-mono font-bold text-[11px] mt-0.5">
                    {entry.hours > 0 ? `${entry.hours}` : statusInfo.short}
                  </span>
                ) : (
                  <span className="text-[10px] opacity-40 mt-0.5">·</span>
                )}
              </button>
            );
          })}
        </div>

      ) : (
        <div className="divide-y">
          {days.map((meta, i) => (
            <ExpandedDay
              key={meta.key}
              meta={meta}
              entry={entries[i]}
              empId={emp.id}
              updateField={updateField}
              locationHistory={locationHistory}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export function EmployeeGrid({ employees, selectedYear, selectedMonth, selectedWeekStart, sectionId, onUpdateDay }: Props) {
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null);
  const { history: locationHistory, addLocation } = useLocationHistory(sectionId);

  // Precompute day metadata + labels once per month/week instead of per cell render
  const visibleDays = useMemo<DayMeta[]>(() => {
    const allDays = getDaysInMonth(selectedYear, selectedMonth);
    let days = allDays;
    if (selectedWeekStart) {
      const weeks = getWeeksInMonth(selectedYear, selectedMonth);
      const week = weeks.find(w => w[0].getTime() === selectedWeekStart.getTime());
      const set = new Set((week || []).map(d => d.getTime()));
      days = allDays.filter(d => set.has(d.getTime()));
    }
    return days.map(day => ({
      day,
      key: dateKey(day),
      weekend: isWeekend(day),
      isToday: dateKey(day) === dateKey(new Date()),
      dowShort: format(day, 'EEE', { locale: it }).slice(0, 2),
      dom: format(day, 'd'),
      longLabel: format(day, 'EEE d MMM', { locale: it }),
    }));

  }, [selectedYear, selectedMonth, selectedWeekStart]);

  const dayByKey = useMemo(() => new Map(visibleDays.map(m => [m.key, m])), [visibleDays]);

  const employeesRef = useRef(employees);
  employeesRef.current = employees;

  const currentEntry = useCallback(
    (empId: string, day: Date): DayEntry => {
      const emp = employeesRef.current.find(e => e.id === empId);
      const meta = dayByKey.get(dateKey(day));
      if (!emp || !meta) return { status: '' as DayStatus, hours: 0, location: '' };
      return entryFor(emp, meta);
    },
    [dayByKey],
  );

  const updateField = useCallback(
    (empId: string, day: Date, field: Partial<DayEntry>) => {
      const current = currentEntry(empId, day);
      if (field.location) addLocation(field.location);
      onUpdateDay(empId, dateKey(day), { ...current, ...field });
    },
    [currentEntry, onUpdateDay, addLocation],
  );

  const cycleStatus = useCallback(
    (empId: string, day: Date) => {
      const current = currentEntry(empId, day);
      const idx = STATUSES.findIndex(s => s.value === current.status);
      const next = STATUSES[(idx + 1) % STATUSES.length];
      const hours = next.value === 'present' ? 8 : 0;
      onUpdateDay(empId, dateKey(day), { ...current, status: next.value, hours });
    },
    [currentEntry, onUpdateDay],
  );

  const handleToggle = useCallback((id: string) => {
    setExpandedEmp(prev => (prev === id ? null : id));
  }, []);

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
      {employees.map(emp => (
        <EmployeeCard
          key={emp.id}
          emp={emp}
          days={visibleDays}
          isExpanded={expandedEmp === emp.id}
          onToggle={handleToggle}
          updateField={updateField}
          cycleStatus={cycleStatus}
          locationHistory={locationHistory}
        />
      ))}
    </div>
  );
}

