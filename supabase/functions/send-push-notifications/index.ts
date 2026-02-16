import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// VAPID public key (same one used client-side)
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

async function importVapidKeys() {
  const privateKeyBase64 = Deno.env.get('VAPID_PRIVATE_KEY')!;
  const pubRaw = base64UrlToUint8Array(VAPID_PUBLIC_KEY);
  const privBytes = base64UrlToUint8Array(privateKeyBase64);

  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: uint8ArrayToBase64Url(pubRaw.slice(1, 33)),
    y: uint8ArrayToBase64Url(pubRaw.slice(33, 65)),
    d: privateKeyBase64,
  };

  const privateKey = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  return privateKey;
}

async function createVapidAuthHeader(endpoint: string, vapidKey: CryptoKey): Promise<{ authorization: string; cryptoKey: string }> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const expiry = Math.floor(Date.now() / 1000) + 12 * 3600;

  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = { aud: audience, exp: expiry, sub: 'mailto:noreply@edilristrutturazioni.app' };

  const enc = new TextEncoder();
  const toB64 = (obj: unknown) => uint8ArrayToBase64Url(enc.encode(JSON.stringify(obj)));

  const unsignedToken = `${toB64(header)}.${toB64(payload)}`;
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, vapidKey, enc.encode(unsignedToken));

  const sig = derToRaw(new Uint8Array(signature));
  const token = `${unsignedToken}.${uint8ArrayToBase64Url(sig)}`;

  return {
    authorization: `vapid t=${token}, k=${VAPID_PUBLIC_KEY}`,
    cryptoKey: `p256ecdsa=${VAPID_PUBLIC_KEY}`,
  };
}

// Convert DER signature to raw 64-byte format
function derToRaw(der: Uint8Array): Uint8Array {
  const raw = new Uint8Array(64);
  // DER: 0x30 <len> 0x02 <rLen> <r> 0x02 <sLen> <s>
  let offset = 2; // skip 0x30 <totalLen>
  offset += 1; // skip 0x02
  const rLen = der[offset++];
  const rStart = offset + (rLen > 32 ? rLen - 32 : 0);
  const rDest = rLen < 32 ? 32 - rLen : 0;
  raw.set(der.slice(rStart, offset + rLen), rDest);
  offset += rLen;
  offset += 1; // skip 0x02
  const sLen = der[offset++];
  const sStart = offset + (sLen > 32 ? sLen - 32 : 0);
  const sDest = 32 + (sLen < 32 ? 32 - sLen : 0);
  raw.set(der.slice(sStart, offset + sLen), sDest);
  return raw;
}

// Simple unencrypted push (works for most browsers; payload in plaintext)
// For full RFC 8291 encryption we'd need web-push lib. 
// Using fetch with VAPID for auth, sending JSON payload.
async function sendPushToSubscription(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: object,
  vapidKey: CryptoKey,
) {
  const { authorization, cryptoKey } = await createVapidAuthHeader(sub.endpoint, vapidKey);
  const body = JSON.stringify(payload);

  const resp = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': authorization,
      'Crypto-Key': cryptoKey,
      'Content-Type': 'application/json',
      'TTL': '86400',
    },
    body,
  });

  return { status: resp.status, ok: resp.ok, endpoint: sub.endpoint };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find pending appointments that are due (date+time <= now)
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const nowTime = now.toTimeString().slice(0, 5);

    const { data: appointments, error: apptErr } = await supabase
      .from('appointments')
      .select('*')
      .eq('status', 'pending')
      .lte('date', todayStr);

    if (apptErr) throw apptErr;

    // Filter appointments that are actually due (date < today OR (date == today AND time <= now))
    const dueAppointments = (appointments || []).filter(a => {
      if (a.date < todayStr) return true;
      return a.time <= nowTime;
    });

    if (dueAppointments.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No due appointments' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const vapidKey = await importVapidKeys();

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
      // Get push subscriptions for this user
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (!subs || subs.length === 0) continue;

      for (const appt of userAppts) {
        const payload = {
          title: '⏰ Appuntamento scaduto',
          body: `${appt.name} — ${appt.address} alle ${appt.time}`,
          tag: `appt-${appt.id}`,
          url: '/',
        };

        for (const sub of subs) {
          try {
            const result = await sendPushToSubscription(
              { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
              payload,
              vapidKey,
            );
            if (result.ok) {
              totalSent++;
            } else {
              errors.push(`${result.status} for ${sub.endpoint.slice(0, 50)}`);
              // Remove invalid subscriptions (410 Gone)
              if (result.status === 410 || result.status === 404) {
                await supabase.from('push_subscriptions').delete().eq('id', sub.id);
              }
            }
          } catch (e) {
            errors.push(String(e));
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
