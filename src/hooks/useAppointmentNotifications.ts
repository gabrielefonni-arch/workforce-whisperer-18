import { useState, useEffect, useRef, useCallback } from 'react';
import type { Appointment } from '@/types/appointment';

const NOTIF_ENABLED_KEY = 'appt_notifications_enabled';

function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

export function useAppointmentNotifications(appointments: Appointment[]) {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(NOTIF_ENABLED_KEY) !== 'false'; } catch { return true; }
  });
  const [permission, setPermission] = useState<NotificationPermission>(
    isNotificationSupported() ? Notification.permission : 'denied'
  );
  const notifiedIds = useRef<Set<string>>(new Set());

  const toggleEnabled = useCallback(async () => {
    if (!isNotificationSupported()) return;

    if (!enabled) {
      // Turning on — request permission if needed
      if (Notification.permission === 'default') {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== 'granted') return;
      } else if (Notification.permission === 'denied') {
        return; // Can't enable
      }
      setEnabled(true);
      localStorage.setItem(NOTIF_ENABLED_KEY, 'true');
    } else {
      setEnabled(false);
      localStorage.setItem(NOTIF_ENABLED_KEY, 'false');
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !isNotificationSupported() || Notification.permission !== 'granted') return;

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
    const interval = setInterval(checkAppointments, 30_000);
    return () => clearInterval(interval);
  }, [appointments, enabled]);

  const isActive = enabled && permission === 'granted';

  return { enabled: isActive, toggleEnabled, isSupported: isNotificationSupported(), permission };
}
