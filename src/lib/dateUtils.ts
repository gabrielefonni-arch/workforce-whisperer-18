import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, getDay, addMonths, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';

export const MONTHS_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

export const DAYS_SHORT_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export function getDaysInMonth(year: number, month: number) {
  const start = startOfMonth(new Date(year, month));
  const end = endOfMonth(new Date(year, month));
  return eachDayOfInterval({ start, end });
}

export function getWeeksInMonth(year: number, month: number) {
  const days = getDaysInMonth(year, month);
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  let currentWeekStart: number | null = null;

  days.forEach(day => {
    const weekStart = startOfWeek(day, { weekStartsOn: 1 }).getTime();
    if (currentWeekStart !== weekStart) {
      if (currentWeek.length > 0) weeks.push(currentWeek);
      currentWeek = [];
      currentWeekStart = weekStart;
    }
    currentWeek.push(day);
  });
  if (currentWeek.length > 0) weeks.push(currentWeek);
  return weeks;
}

export function dateKey(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

export function isWeekend(d: Date) {
  const day = getDay(d);
  return day === 0 || day === 6;
}

export function formatDayLabel(d: Date) {
  return format(d, 'EEE d', { locale: it });
}

export { addMonths, subMonths, format };
