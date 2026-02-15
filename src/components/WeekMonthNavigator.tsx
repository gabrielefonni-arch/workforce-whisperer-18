import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MONTHS_IT, getWeeksInMonth } from '@/lib/dateUtils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface Props {
  selectedYear: number;
  selectedMonth: number;
  selectedWeekStart: Date | null;
  onMonthChange: (year: number, month: number) => void;
  onWeekChange: (start: Date | null) => void;
}

export function WeekMonthNavigator({ selectedYear, selectedMonth, selectedWeekStart, onMonthChange, onWeekChange }: Props) {
  const weeks = getWeeksInMonth(selectedYear, selectedMonth);

  const prevMonth = () => {
    const m = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const y = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    onMonthChange(y, m);
    onWeekChange(null);
  };

  const nextMonth = () => {
    const m = selectedMonth === 11 ? 0 : selectedMonth + 1;
    const y = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
    onMonthChange(y, m);
    onWeekChange(null);
  };

  return (
    <div className="space-y-3">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-bold">
          {MONTHS_IT[selectedMonth]} {selectedYear}
        </h2>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Week tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => onWeekChange(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            selectedWeekStart === null
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          Tutto il mese
        </button>
        {weeks.map((week, i) => {
          const start = week[0];
          const end = week[week.length - 1];
          const isActive = selectedWeekStart?.getTime() === start.getTime();
          return (
            <button
              key={i}
              onClick={() => onWeekChange(start)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {format(start, 'd', { locale: it })}–{format(end, 'd MMM', { locale: it })}
            </button>
          );
        })}
      </div>
    </div>
  );
}
