import type { Employee } from '@/types/employee';
import { getDaysInMonth, dateKey } from '@/lib/dateUtils';

interface Props {
  employees: Employee[];
  year: number;
  month: number;
}

export function MonthlyTotals({ employees, year, month }: Props) {
  const days = getDaysInMonth(year, month);

  if (employees.length === 0) return null;

  return (
    <div className="space-y-2 animate-fade-in">
      {employees.map(emp => {
        let totalHours = 0;
        let presentDays = 0;
        let absentDays = 0;
        let halfDays = 0;

        days.forEach(d => {
          const entry = emp.days[dateKey(d)];
          if (entry) {
            totalHours += entry.hours;
            if (entry.status === 'present') presentDays++;
            if (entry.status === 'absent') absentDays++;
            if (entry.status === 'half') halfDays++;
          }
        });

        return (
          <div key={emp.id} className="flex items-center justify-between bg-card border rounded-lg px-3 py-2.5">
            <span className="font-semibold text-sm truncate mr-2">{emp.name}</span>
            <div className="flex gap-3 text-xs shrink-0">
              <div className="text-center">
                <div className="font-bold text-foreground">{totalHours}</div>
                <div className="text-muted-foreground">ore</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-success">{presentDays}</div>
                <div className="text-muted-foreground">pres.</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-warning">{halfDays}</div>
                <div className="text-muted-foreground">½</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-absence">{absentDays}</div>
                <div className="text-muted-foreground">ass.</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
