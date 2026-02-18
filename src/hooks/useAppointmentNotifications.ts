import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Appointment } from '@/types/appointment';

const NOTIF_ENABLED_KEY = 'appt_notifications_enabled';
const VAPID_PUBLIC_KEY = 'BFT3MqUGIWn-3Fyu0U1LsRvOIVrWEciw1-iglkhjasksvJiE0aBAE2LVj-N5DnwHSX1rkdNcCghI-ovn2FvDsB0';

function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function registerPushSubscription(userId: string): Promise<boolean> {
  try {
    const ready = await navigator.serviceWorker.ready;
    const pushManager = (ready as any).pushManager;
    if (!pushManager) return false;

    // Check if subscription already exists and is still valid
    const existing = await pushManager.getSubscription();
    if (existing) {
      // Check if it's already saved in DB for this user
      const { data: saved } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('endpoint', existing.endpoint)
        .maybeSingle();

      if (saved) {
        console.log('[Push] Subscription already registered, skipping.');
        return true;
      }
      // Endpoint changed or not in DB – unsubscribe and re-register
      await existing.unsubscribe();
    }

    const subscription = await pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const key = subscription.getKey('p256dh');
    const auth = subscription.getKey('auth');
    if (!key || !auth) return false;

    const p256dh = toBase64Url(key);
    const authKey = toBase64Url(auth);

    // Upsert: delete old rows for user, insert new
    await supabase.from('push_subscriptions').delete().eq('user_id', userId);
    const { error } = await supabase.from('push_subscriptions').insert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh,
      auth: authKey,
    });

    if (error) { console.error('[Push] DB save error:', error); return false; }
    console.log('[Push] Subscription saved successfully.');
    return true;
  } catch (e) {
    console.error('[Push] Registration failed:', e);
    return false;
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
  const [registering, setRegistering] = useState(false);
  const notifiedIds = useRef<Set<string>>(new Set());
  // Prevent duplicate auto-registrations
  const autoRegistered = useRef(false);

  const toggleEnabled = useCallback(async () => {
    if (!isNotificationSupported()) {
      toast.error('Notifiche push non supportate su questo browser');
      return;
    }

    if (!enabled) {
      if (Notification.permission === 'default') {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== 'granted') {
          toast.error('Permesso notifiche negato');
          return;
        }
      } else if (Notification.permission === 'denied') {
        toast.error('Notifiche bloccate. Attivale dalle impostazioni del browser');
        return;
      }

      if (user) {
        setRegistering(true);
        toast.info('Registrazione notifiche push...');
        const success = await registerPushSubscription(user.id);
        setRegistering(false);
        if (!success) {
          toast.error('Registrazione push fallita. Riprova.');
          return;
        }
        autoRegistered.current = true;
        toast.success('Notifiche push attivate!');
      }
      setEnabled(true);
      localStorage.setItem(NOTIF_ENABLED_KEY, 'true');
    } else {
      setEnabled(false);
      localStorage.setItem(NOTIF_ENABLED_KEY, 'false');
      toast.info('Notifiche disattivate');
    }
  }, [enabled, user]);

  // Auto-register on mount ONLY ONCE per session if already enabled
  useEffect(() => {
    if (autoRegistered.current) return;
    if (enabled && user && isNotificationSupported() && Notification.permission === 'granted') {
      autoRegistered.current = true;
      registerPushSubscription(user.id);
    }
  }, [enabled, user]);

  // Client-side notification check every 15s
  useEffect(() => {
    if (!enabled || !isNotificationSupported() || Notification.permission !== 'granted') return;

    const checkAppointments = async () => {
      const now = new Date();
      for (const appt of appointments) {
        if (appt.status !== 'pending') continue;
        if (notifiedIds.current.has(appt.id)) continue;

        const apptDateTime = new Date(`${appt.date}T${appt.time}:00`);
        if (now >= apptDateTime) {
          notifiedIds.current.add(appt.id);
          try {
            const reg = await navigator.serviceWorker.ready;
            await reg.showNotification('⏰ Appuntamento scaduto', {
              body: `${appt.name} — ${appt.address} alle ${appt.time}`,
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
              tag: `appt-${appt.id}`,
              requireInteraction: true,
              data: '/',
            });
          } catch (e) {
            console.error('[Push] showNotification error:', e);
          }
        }
      }
    };

    checkAppointments();
    const interval = setInterval(checkAppointments, 15_000);
    return () => clearInterval(interval);
  }, [appointments, enabled]);

  const isActive = enabled && permission === 'granted';
  return { enabled: isActive, toggleEnabled, isSupported: isNotificationSupported(), permission, registering };
}
