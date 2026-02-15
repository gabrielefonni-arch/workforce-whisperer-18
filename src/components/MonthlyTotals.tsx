import type { Employee } from '@/types/employee';
import { getDaysInMonth, dateKey } from '@/lib/dateUtils';
import { MapPin } from 'lucide-react';

interface Props {
  employees: Employee[];
  year: number;
  month: number;
}

export function MonthlyTotals({ employees, year, month }: Props) {
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
          <div key={emp.id} className="bg-card border rounded-lg overflow-hidden shadow-sm">
            {/* Name + stats row */}
            <div className="px-3 py-3 flex items-start justify-between gap-3 border-b bg-secondary/30">
              <h3 className="text-base font-bold leading-tight">{emp.name}</h3>
              <div className="flex gap-3 text-xs shrink-0">
                <div className="text-center">
                  <div className="text-base font-extrabold text-foreground">{totalHours}</div>
                  <div className="text-muted-foreground">ore</div>
                </div>
                <div className="text-center">
                  <div className="text-base font-extrabold text-success">{presentDays}</div>
                  <div className="text-muted-foreground">pres.</div>
                </div>
                <div className="text-center">
                  <div className="text-base font-extrabold text-warning">{injuryDays}</div>
                  <div className="text-muted-foreground">infor.</div>
                </div>
                <div className="text-center">
                  <div className="text-base font-extrabold text-absence">{sickDays}</div>
                  <div className="text-muted-foreground">mal.</div>
                </div>
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
                  <div key={loc} className="flex items-center justify-between text-xs">
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
}
