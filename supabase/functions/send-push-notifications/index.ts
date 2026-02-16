import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  importVapidKeys,
  ApplicationServer,
  type PushSubscription as WebPushSubscription,
} from "jsr:@negrel/webpush@0.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VAPID_PUBLIC_KEY = 'BLugXb_kOMd_7gOnmvjjLY71jBpdxCY6kwLESMG86ws44Gwu6Gfj82nrYt1AIASmuSq1-7mOzFCocFCP4HAYSZg';

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - base64Url.length % 4) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function uint8ArrayToBase64Url(arr: Uint8Array): string {
  let binary = '';
  for (const b of arr) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function buildApplicationServer(): Promise<ApplicationServer> {
  const privateKeyD = Deno.env.get('VAPID_PRIVATE_KEY')!;
  const pubRaw = base64UrlToUint8Array(VAPID_PUBLIC_KEY);

  // Reconstruct JWK for import
  const x = uint8ArrayToBase64Url(pubRaw.slice(1, 33));
  const y = uint8ArrayToBase64Url(pubRaw.slice(33, 65));

  const exportedKeys = {
    publicKey: { kty: 'EC' as const, crv: 'P-256' as const, x, y, ext: true },
    privateKey: { kty: 'EC' as const, crv: 'P-256' as const, x, y, d: privateKeyD, ext: true },
  };

  const keys = await importVapidKeys(exportedKeys);
  return new ApplicationServer({
    contactInformation: 'mailto:noreply@edilristrutturazioni.app',
    keys,
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find pending appointments that are due
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const nowTime = now.toTimeString().slice(0, 5);

    const { data: appointments, error: apptErr } = await supabase
      .from('appointments')
      .select('*')
      .eq('status', 'pending')
      .lte('date', todayStr);

    if (apptErr) throw apptErr;

    const dueAppointments = (appointments || []).filter(a => {
      if (a.date < todayStr) return true;
      return a.time <= nowTime;
    });

    if (dueAppointments.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No due appointments' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const appServer = await buildApplicationServer();

    // Group by user_id
    const byUser = new Map<string, typeof dueAppointments>();
    for (const a of dueAppointments) {
      const arr = byUser.get(a.user_id) || [];
      arr.push(a);
      byUser.set(a.user_id, arr);
    }

    let totalSent = 0;
    const errors: string[] = [];

    for (const [userId, userAppts] of byUser) {
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (!subs || subs.length === 0) continue;

      for (const appt of userAppts) {
        const payload = JSON.stringify({
          title: '⏰ Appuntamento scaduto',
          body: `${appt.name} — ${appt.address} alle ${appt.time}`,
          tag: `appt-${appt.id}`,
          url: '/',
        });

        for (const sub of subs) {
          try {
            // Build PushSubscription for the library
            const pushSub: WebPushSubscription = {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            };

            const subscriber = appServer.subscribe(pushSub);
            await subscriber.pushTextMessage(payload, { urgency: 'high', ttl: 86400 });
            totalSent++;
          } catch (e: unknown) {
            const errMsg = String(e);
            errors.push(errMsg);
            // Remove invalid subscriptions (410 Gone)
            if (errMsg.includes('410') || errMsg.includes('Gone') || errMsg.includes('404')) {
              await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ sent: totalSent, due: dueAppointments.length, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Push error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
