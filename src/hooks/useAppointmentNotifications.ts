import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Appointment } from '@/types/appointment';

const NOTIF_ENABLED_KEY = 'appt_notifications_enabled';
const VAPID_PUBLIC_KEY = 'BD__ChpFvLAAqmk8bKI4ddqK5i-oTBGR1_2VtXdn3VlN2x6IDLi6S9DLQzdA1_EEIWABGvZBVzKPNvNt90qpkbY';

function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function registerPushSubscription(userId: string): Promise<PushSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.register('/sw-push.js');
    await navigator.serviceWorker.ready;

    const mgr = (registration as any).pushManager;
    if (!mgr) return null;

    let subscription = await mgr.getSubscription();
    if (!subscription) {
      subscription = await mgr.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const key = subscription.getKey('p256dh');
    const auth = subscription.getKey('auth');
    if (!key || !auth) return null;

    const p256dh = btoa(String.fromCharCode(...new Uint8Array(key))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const authKey = btoa(String.fromCharCode(...new Uint8Array(auth))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // Upsert subscription
    await supabase.from('push_subscriptions').upsert(
      { user_id: userId, endpoint: subscription.endpoint, p256dh: p256dh, auth: authKey },
      { onConflict: 'user_id,endpoint' }
    );

    return subscription;
  } catch (e) {
    console.error('Push registration failed:', e);
    return null;
  }
}

export function useAppointmentNotifications(appointments: Appointment[]) {
  const { user } = useAuth();
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
      if (Notification.permission === 'default') {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== 'granted') return;
      } else if (Notification.permission === 'denied') {
        return;
      }
      // Register push subscription for server-side notifications
      if (user) {
        await registerPushSubscription(user.id);
      }
      setEnabled(true);
      localStorage.setItem(NOTIF_ENABLED_KEY, 'true');
    } else {
      setEnabled(false);
      localStorage.setItem(NOTIF_ENABLED_KEY, 'false');
    }
  }, [enabled, user]);

  // Auto-register push on mount if already enabled
  useEffect(() => {
    if (enabled && user && isNotificationSupported() && Notification.permission === 'granted') {
      registerPushSubscription(user.id);
    }
  }, [enabled, user]);

  // Keep client-side fallback for when app is open
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
            // SW will handle it via push
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
