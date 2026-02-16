import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VAPID_PUBLIC_KEY = 'BD__ChpFvLAAqmk8bKI4ddqK5i-oTBGR1_2VtXdn3VlN2x6IDLi6S9DLQzdA1_EEIWABGvZBVzKPNvNt90qpkbY';

// ── Base64URL helpers ──
function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str: string): Uint8Array {
  const pad = '='.repeat((4 - str.length % 4) % 4);
  const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((a, b) => a + b.length, 0);
  const result = new Uint8Array(len);
  let offset = 0;
  for (const a of arrays) { result.set(a, offset); offset += a.length; }
  return result;
}

// ── VAPID JWT ──
async function createVapidJwt(audience: string, subject: string, privateKeyD: string, publicKeyRaw: Uint8Array): Promise<{ authorization: string; cryptoKey: string }> {
  const x = b64url(publicKeyRaw.slice(1, 33));
  const y = b64url(publicKeyRaw.slice(33, 65));

  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x, y, d: privateKeyD },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const header = b64url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: now + 12 * 3600,
    sub: subject,
  })));
  const unsignedToken = `${header}.${payload}`;
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format for JWT
  const sigBytes = new Uint8Array(sig);
  let rawSig: Uint8Array;
  if (sigBytes.length === 64) {
    rawSig = sigBytes;
  } else {
    // WebCrypto already returns raw format for ECDSA P-256
    rawSig = sigBytes;
  }

  const token = `${unsignedToken}.${b64url(rawSig)}`;
  return {
    authorization: `WebPush ${token}`,
    cryptoKey: `p256ecdsa=${VAPID_PUBLIC_KEY}`,
  };
}

// ── RFC 8291: HTTP ECE aes128gcm encryption ──
async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const te = new TextEncoder();

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  const localPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', localKeyPair.publicKey));

  // Import subscriber's p256dh key
  const subPubBytes = b64urlDecode(p256dhKey);
  const subPubKey = await crypto.subtle.importKey(
    'raw', subPubBytes, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );

  // Derive shared secret via ECDH
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subPubKey },
    localKeyPair.privateKey,
    256
  ));

  // Auth secret
  const authBytes = b64urlDecode(authSecret);

  // HKDF to derive IKM
  const authInfo = te.encode('WebPush: info\0');
  const ikm_info = concat(authInfo, subPubBytes, localPubRaw);
  const ikm = await hkdf(authBytes, sharedSecret, ikm_info, 32);

  // Salt (random 16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive CEK and nonce
  const cekInfo = te.encode('Content-Encoding: aes128gcm\0');
  const nonceInfo = te.encode('Content-Encoding: nonce\0');
  const cek = await hkdf(salt, ikm, cekInfo, 16);
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  // Pad and encrypt
  const paddedPayload = concat(new Uint8Array(te.encode(payload)), new Uint8Array([2])); // delimiter byte

  const cryptoKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    cryptoKey,
    paddedPayload
  ));

  return { encrypted, salt, localPublicKey: localPubRaw };
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8
  );
  return new Uint8Array(bits);
}

function buildAes128gcmBody(salt: Uint8Array, localPubKey: Uint8Array, encrypted: Uint8Array): Uint8Array {
  // Header: salt(16) + rs(4) + idlen(1) + keyid(65) + encrypted
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);
  return concat(salt, rs, new Uint8Array([localPubKey.length]), localPubKey, encrypted);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

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

    const privateKeyD = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const publicKeyRaw = b64urlDecode(VAPID_PUBLIC_KEY);

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
            const audience = new URL(sub.endpoint).origin;
            const vapidHeaders = await createVapidJwt(audience, 'mailto:noreply@edilristrutturazioni.app', privateKeyD, publicKeyRaw);

            const { encrypted, salt, localPublicKey } = await encryptPayload(payload, sub.p256dh, sub.auth);
            const body = buildAes128gcmBody(salt, localPublicKey, encrypted);

            const res = await fetch(sub.endpoint, {
              method: 'POST',
              headers: {
                'Authorization': vapidHeaders.authorization,
                'Crypto-Key': vapidHeaders.cryptoKey,
                'Content-Encoding': 'aes128gcm',
                'Content-Type': 'application/octet-stream',
                'TTL': '86400',
                'Urgency': 'high',
              },
              body,
            });

            if (res.ok || res.status === 201) {
              totalSent++;
            } else {
              const statusCode = res.status;
              const respBody = await res.text();
              errors.push(`HTTP ${statusCode}: ${respBody}`);
              if (statusCode === 410 || statusCode === 404) {
                await supabase.from('push_subscriptions').delete().eq('id', sub.id);
              }
            }
          } catch (e: unknown) {
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
