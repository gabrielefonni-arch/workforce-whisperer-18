import { useState } from 'react';
import { useAppointments } from '@/hooks/useAppointments';
import type { AppointmentStatus } from '@/types/appointment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Calendar, MapPin, Clock, User } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; className: string }> = {
  pending: { label: 'In attesa', className: 'bg-info/15 text-info border-info/30' },
  done: { label: 'Già fatto', className: 'bg-success/15 text-success border-success/30' },
  cancelled: { label: 'Annullato', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  forgotten: { label: 'Dimenticato', className: 'bg-warning/15 text-warning border-warning/30' },
};

const ALL_STATUSES: AppointmentStatus[] = ['pending', 'done', 'cancelled', 'forgotten'];

interface Props {
  storageKey: string;
}

export function AppointmentsView({ storageKey }: Props) {
  const { data, addAppointment, removeAppointment, updateStatus } = useAppointments(storageKey);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('09:00');
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | 'all'>('all');

  const handleAdd = () => {
    if (!name.trim()) {
      toast.error('Inserisci nome e cognome');
      return;
    }
    if (!address.trim()) {
      toast.error("Inserisci l'indirizzo");
      return;
    }
    addAppointment({
      name: name.trim(),
      address: address.trim(),
      date,
      time,
      status: 'pending',
    });
    setName('');
    setAddress('');
    toast.success('Appuntamento aggiunto');
  };

  const handleRemove = (id: string, apptName: string) => {
    if (confirm(`Rimuovere l'appuntamento di ${apptName}?`)) {
      removeAppointment(id);
      toast.success('Appuntamento rimosso');
    }
  };

  const filtered = filterStatus === 'all'
    ? data.appointments
    : data.appointments.filter(a => a.status === filterStatus);

  // Sort by date desc, then time
  const sorted = [...filtered].sort((a, b) => {
    const cmp = b.date.localeCompare(a.date);
    if (cmp !== 0) return cmp;
    return b.time.localeCompare(a.time);
  });

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="bg-card border rounded-lg p-3 space-y-2.5">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Nuovo Appuntamento</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground mb-0.5 block">Nome e Cognome</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Mario Rossi"
              className="h-9 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-0.5 block">Via / Indirizzo</label>
            <Input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Via Roma 1, Milano"
              className="h-9 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-0.5 block">Data</label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-0.5 block">Orario</label>
            <Input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>
        <Button onClick={handleAdd} size="sm" className="gap-1 w-full sm:w-auto">
          <Plus className="h-3.5 w-3.5" />
          Aggiungi Appuntamento
        </Button>
      </div>

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
          Tutti ({data.appointments.length})
        </button>
        {ALL_STATUSES.map(s => {
          const count = data.appointments.filter(a => a.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                filterStatus === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {STATUS_CONFIG[s].label} ({count})
            </button>
          );
        })}
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
          {sorted.map(appt => {
            const dateObj = new Date(appt.date + 'T00:00:00');
            const dateLabel = format(dateObj, 'EEEE d MMMM yyyy', { locale: it });

            return (
              <div
                key={appt.id}
                className="bg-card border rounded-lg p-3 space-y-2"
              >
                {/* Top row: name + delete */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-bold text-sm truncate">{appt.name}</span>
                  </div>
                  <button
                    onClick={() => handleRemove(appt.id, appt.name)}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Info row */}
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

                {/* Status buttons */}
                <div className="flex flex-wrap gap-1">
                  {ALL_STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => updateStatus(appt.id, s)}
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
          })}
        </div>
      )}
    </div>
  );
}
