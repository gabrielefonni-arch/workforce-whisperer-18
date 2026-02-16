import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Appointment } from '@/types/appointment';

const NOTIF_ENABLED_KEY = 'appt_notifications_enabled';
const VAPID_PUBLIC_KEY = 'BD__ChpFvLAAqmk8bKI4ddqK5i-oTBGR1_2VtXdn3VlN2x6IDLi6S9DLQzdA1_EEIWABGvZBVzKPNvNt90qpkbY';

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
    console.log('[Push] Starting registration for user:', userId);
    
    // Use the existing PWA service worker - do NOT register a separate one
    const ready = await navigator.serviceWorker.ready;
    console.log('[Push] Using PWA service worker, scope:', ready.scope);

    const pushManager = (ready as any).pushManager;
    if (!pushManager) {
      console.error('[Push] PushManager not available');
      return false;
    }

    // Unsubscribe from any existing subscription (might be with old key)
    const existing = await pushManager.getSubscription();
    if (existing) {
      console.log('[Push] Unsubscribing from old subscription');
      await existing.unsubscribe();
    }

    // Create new subscription with current VAPID key
    const subscription = await pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    console.log('[Push] New subscription created:', subscription.endpoint.substring(0, 60));

    const key = subscription.getKey('p256dh');
    const auth = subscription.getKey('auth');
    if (!key || !auth) {
      console.error('[Push] Missing p256dh or auth keys');
      return false;
    }

    const p256dh = toBase64Url(key);
    const authKey = toBase64Url(auth);

    console.log('[Push] Saving subscription to DB...');
    
    // Delete old subscriptions for this user first, then insert new
    await supabase.from('push_subscriptions').delete().eq('user_id', userId);
    
    const { error } = await supabase.from('push_subscriptions').insert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: p256dh,
      auth: authKey,
    });

    if (error) {
      console.error('[Push] DB save error:', error);
      return false;
    }

    console.log('[Push] Subscription saved successfully!');
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

  // Auto-register push on mount if already enabled
  useEffect(() => {
    if (enabled && user && isNotificationSupported() && Notification.permission === 'granted') {
      registerPushSubscription(user.id);
    }
  }, [enabled, user]);

  // Client-side fallback for when app is open
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

  return { enabled: isActive, toggleEnabled, isSupported: isNotificationSupported(), permission, registering };
}
