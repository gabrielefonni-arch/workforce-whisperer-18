import { memo } from 'react';
import type { Employee } from '@/types/employee';
import { getDaysInMonth, dateKey } from '@/lib/dateUtils';
import { MapPin } from 'lucide-react';

interface Props {
  employees: Employee[];
  year: number;
  month: number;
}

export const MonthlyTotals = memo(function MonthlyTotals({ employees, year, month }: Props) {
  const days = getDaysInMonth(year, month);

  if (employees.length === 0) return null;

  return (
    <div className="space-y-3 animate-fade-in">
      {employees.map(emp => {
        let totalHours = 0;
        let presentDays = 0;
        let injuryDays = 0;
        let sickDays = 0;
        const locationCount: Record<string, number> = {};

        days.forEach(d => {
          const entry = emp.days[dateKey(d)];
          if (entry) {
            totalHours += entry.hours;
            if (entry.status === 'present') presentDays++;
            if (entry.status === 'injury') injuryDays++;
            if (entry.status === 'sick') sickDays++;
            if (entry.location?.trim()) {
              const loc = entry.location.trim();
              locationCount[loc] = (locationCount[loc] || 0) + 1;
            }
          }
        });

        const locations = Object.entries(locationCount).sort((a, b) => b[1] - a[1]);

        return (
          <div key={emp.id} className="panel overflow-hidden">
            {/* Name + stats row */}
            <div className="px-3 py-3 flex items-center justify-between gap-3 border-b bg-muted/40">
              <h3 className="text-sm font-bold leading-tight truncate">{emp.name}</h3>
              <div className="flex gap-1.5 text-xs shrink-0">
                {[
                  { v: totalHours, l: 'ore', c: 'text-foreground' },
                  { v: presentDays, l: 'pres.', c: 'text-success' },
                  { v: injuryDays, l: 'infor.', c: 'text-warning' },
                  { v: sickDays, l: 'mal.', c: 'text-absence' },
                ].map(s => (
                  <div key={s.l} className="text-center rounded-lg bg-card border px-2 py-1 min-w-[46px]">
                    <div className={`text-sm font-extrabold font-mono leading-none ${s.c}`}>{s.v}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Locations summary */}
            {locations.length > 0 && (
              <div className="px-3 py-2 space-y-1">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  <MapPin className="h-3 w-3" />
                  Cantieri / Vie
                </div>
                {locations.map(([loc, count]) => (
                  <div key={loc} className="flex items-center justify-between text-xs rounded-md px-2 py-1 odd:bg-muted/40">
                    <span className="truncate mr-2">{loc}</span>
                    <span className="shrink-0 text-muted-foreground font-mono">{count}g</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});
