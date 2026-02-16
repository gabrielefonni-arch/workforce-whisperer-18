import { useState, useMemo, useCallback, memo } from 'react';
import { useAppointments } from '@/hooks/useAppointments';
import { useAppointmentNotifications } from '@/hooks/useAppointmentNotifications';
import type { AppointmentStatus } from '@/types/appointment';
import { Calendar } from 'lucide-react';
import { AppointmentForm } from '@/components/AppointmentForm';
import { AppointmentCard } from '@/components/AppointmentCard';
import { toast } from 'sonner';

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'In attesa',
  done: 'Effettuato',
  cancelled: 'Annullato',
  forgotten: 'Dimenticato',
};

const ALL_STATUSES: AppointmentStatus[] = ['pending', 'done', 'cancelled', 'forgotten'];

export const AppointmentsView = memo(function AppointmentsView() {
  const { data, addAppointment, removeAppointment, updateStatus } = useAppointments();
  const appointments = data.appointments ?? [];
  const { enabled: notifActive, toggleEnabled, isSupported: notifSupported, registering } = useAppointmentNotifications(appointments);
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | 'all'>('all');

  const sorted = useMemo(() => {
    const filtered = filterStatus === 'all'
      ? appointments
      : appointments.filter(a => a.status === filterStatus);
    return [...filtered].sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return cmp;
      return b.time.localeCompare(a.time);
    });
  }, [appointments, filterStatus]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ALL_STATUSES.forEach(s => {
      counts[s] = appointments.filter(a => a.status === s).length;
    });
    return counts;
  }, [appointments]);

  const handleRemove = useCallback((id: string, apptName: string) => {
    if (confirm(`Rimuovere l'appuntamento di ${apptName}?`)) {
      removeAppointment(id);
      toast.success('Appuntamento rimosso');
    }
  }, [removeAppointment]);

  const handleUpdateStatus = useCallback((id: string, status: AppointmentStatus) => {
    updateStatus(id, status);
  }, [updateStatus]);

  return (
    <div className="space-y-4">
      <AppointmentForm
        onAdd={addAppointment}
        notifSupported={notifSupported}
        notifActive={notifActive}
        registering={registering}
        toggleEnabled={toggleEnabled}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
            filterStatus === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          Tutti ({appointments.length})
        </button>
        {ALL_STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
              filterStatus === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {STATUS_LABELS[s]} ({statusCounts[s]})
          </button>
        ))}
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">Nessun appuntamento</p>
          <p className="text-xs">Aggiungi un appuntamento per iniziare</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(appt => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              onRemove={handleRemove}
              onUpdateStatus={handleUpdateStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
});
