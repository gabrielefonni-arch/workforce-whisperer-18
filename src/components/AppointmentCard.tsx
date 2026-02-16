import { memo, useMemo } from 'react';
import type { Appointment, AppointmentStatus } from '@/types/appointment';
import { Trash2, Calendar, MapPin, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; className: string }> = {
  pending: { label: 'In attesa', className: 'bg-info/15 text-info border-info/30' },
  done: { label: 'Effettuato', className: 'bg-success/15 text-success border-success/30' },
  cancelled: { label: 'Annullato', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  forgotten: { label: 'Dimenticato', className: 'bg-warning/15 text-warning border-warning/30' },
};

const ALL_STATUSES: AppointmentStatus[] = ['pending', 'done', 'cancelled', 'forgotten'];

interface Props {
  appointment: Appointment;
  onRemove: (id: string, name: string) => void;
  onUpdateStatus: (id: string, status: AppointmentStatus) => void;
}

export const AppointmentCard = memo(function AppointmentCard({ appointment: appt, onRemove, onUpdateStatus }: Props) {
  const dateLabel = useMemo(() => {
    const dateObj = new Date(appt.date + 'T00:00:00');
    return format(dateObj, 'EEEE d MMMM yyyy', { locale: it });
  }, [appt.date]);

  return (
    <div className="bg-card border rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="font-bold text-sm truncate">{appt.name}</span>
        </div>
        <button
          onClick={() => onRemove(appt.id, appt.name)}
          className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {appt.address}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {dateLabel}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {appt.time}
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {ALL_STATUSES.map(s => (
          <button
            key={s}
            onClick={() => onUpdateStatus(appt.id, s)}
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all ${
              appt.status === s
                ? STATUS_CONFIG[s].className
                : 'bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary'
            }`}
          >
            {STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>
    </div>
  );
});
