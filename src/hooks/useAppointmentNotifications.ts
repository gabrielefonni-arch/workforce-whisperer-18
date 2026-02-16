import { useEffect, useRef, useCallback } from 'react';
import type { Appointment } from '@/types/appointment';

function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

export function useAppointmentNotifications(appointments: Appointment[]) {
  const notifiedIds = useRef<Set<string>>(new Set());

  const requestPermission = useCallback(async () => {
    if (!isNotificationSupported()) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }, []);

  useEffect(() => {
    // Request permission on mount
    requestPermission();
  }, [requestPermission]);

  useEffect(() => {
    if (!isNotificationSupported() || Notification.permission !== 'granted') return;

    const checkAppointments = () => {
      const now = new Date();

      appointments.forEach(appt => {
        if (appt.status !== 'pending') return;
        if (notifiedIds.current.has(appt.id)) return;

        const apptDateTime = new Date(`${appt.date}T${appt.time}:00`);
        if (now >= apptDateTime) {
          notifiedIds.current.add(appt.id);
          try {
            new Notification('⏰ Appuntamento scaduto', {
              body: `${appt.name} — ${appt.address} alle ${appt.time}`,
              icon: '/pwa-192x192.png',
              tag: `appt-${appt.id}`,
            });
          } catch {
            // SW registration fallback for iOS PWA
            navigator.serviceWorker?.ready?.then(reg => {
              reg.showNotification('⏰ Appuntamento scaduto', {
                body: `${appt.name} — ${appt.address} alle ${appt.time}`,
                icon: '/pwa-192x192.png',
                tag: `appt-${appt.id}`,
              });
            }).catch(() => {});
          }
        }
      });
    };

    checkAppointments();
    const interval = setInterval(checkAppointments, 30_000); // every 30s
    return () => clearInterval(interval);
  }, [appointments]);

  return { requestPermission, isSupported: isNotificationSupported() };
}
