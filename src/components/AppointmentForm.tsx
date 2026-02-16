import { useState, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props {
  onAdd: (appt: { name: string; address: string; date: string; time: string; status: 'pending' }) => void;
  notifSupported: boolean;
  notifActive: boolean;
  registering: boolean;
  toggleEnabled: () => void;
}

export const AppointmentForm = memo(function AppointmentForm({
  onAdd,
  notifSupported,
  notifActive,
  registering,
  toggleEnabled,
}: Props) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('09:00');

  const handleAdd = () => {
    if (!name.trim()) {
      toast.error('Inserisci nome e cognome');
      return;
    }
    if (!address.trim()) {
      toast.error("Inserisci l'indirizzo");
      return;
    }
    onAdd({
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

  return (
    <div className="bg-card border rounded-lg p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Nuovo Appuntamento</h3>
        {notifSupported && (
          <Button
            onClick={toggleEnabled}
            variant={notifActive ? 'default' : 'outline'}
            size="sm"
            className="gap-1 text-xs h-7 px-2"
            disabled={registering}
          >
            {registering ? (
              <>Registrazione...</>
            ) : (
              <>
                {notifActive ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                {notifActive ? 'Notifiche ON' : 'Notifiche OFF'}
              </>
            )}
          </Button>
        )}
      </div>
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
  );
});
