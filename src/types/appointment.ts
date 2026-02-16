export type AppointmentStatus = 'pending' | 'done' | 'cancelled' | 'forgotten';

export interface Appointment {
  id: string;
  name: string; // nome e cognome
  address: string; // via
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: AppointmentStatus;
  notes?: string;
}

export interface AppointmentData {
  appointments: Appointment[];
}
