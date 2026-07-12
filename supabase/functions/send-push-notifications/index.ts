import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function bytesToB64url(buf: Uint8Array): string {
  let s = ''; for (const b of buf) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function b64urlToBytes(s: string): Uint8Array {
  const pad = '='.repeat((4 - s.length % 4) % 4);
  const b = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(b, c => c.charCodeAt(0));
}
function concat(...a: Uint8Array[]): Uint8Array {
  const r = new Uint8Array(a.reduce((n, x) => n + x.length, 0));
  let o = 0; for (const x of a) { r.set(x, o); o += x.length; }
  return r;
}

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key.buffer as ArrayBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data.buffer as ArrayBuffer));
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
  const prk = await hmacSha256(salt.length ? salt : new Uint8Array(32), ikm);
  const t = await hmacSha256(prk, concat(info, new Uint8Array([1])));
  return t.slice(0, len);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Require a shared secret so only the trusted scheduler can trigger pushes.
    const cronSecret = Deno.env.get('PUSH_CRON_SECRET');
    if (!cronSecret) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const provided = req.headers.get('x-cron-secret') ?? '';
    if (provided !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const vapidPrivD = Deno.env.get('VAPID_PRIVATE_KEY');
    if (!vapidPrivD) {
      return new Response(JSON.stringify({ error: 'VAPID_PRIVATE_KEY secret not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const vapidPubB64 = 'BFT3MqUGIWn-3Fyu0U1LsRvOIVrWEciw1-iglkhjasksvJiE0aBAE2LVj-N5DnwHSX1rkdNcCghI-ovn2FvDsB0';
    const vapidPubRaw = b64urlToBytes(vapidPubB64);

    const pubX = bytesToB64url(vapidPubRaw.slice(1, 33));
    const pubY = bytesToB64url(vapidPubRaw.slice(33, 65));

    let signingKey: CryptoKey;
    try {
      signingKey = await crypto.subtle.importKey('jwk', {
        kty: 'EC', crv: 'P-256', x: pubX, y: pubY, d: vapidPrivD,
      }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
    } catch (e) {
      const newPair = await crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']
      );
      const newPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', newPair.publicKey));
      const newPrivJwk = await crypto.subtle.exportKey('jwk', newPair.privateKey);
      return new Response(JSON.stringify({
        error: 'VAPID key mismatch',
        fix: { newPublicKey: bytesToB64url(newPubRaw), newPrivateKeyD: newPrivJwk.d }
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const nowTime = now.toTimeString().slice(0, 5);

    const { data: appts, error: ae } = await supabase.from('appointments').select('*').eq('status', 'pending').lte('date', todayStr);
    if (ae) throw ae;

    const due = (appts || []).filter((a: any) => a.date < todayStr || a.time <= nowTime);
    if (!due.length) return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: subs } = await supabase.from('push_subscriptions').select('*');

    let sent = 0;
    const errors: string[] = [];

    for (const appt of due) {
      const userSubs = (subs || []).filter((s: any) => s.user_id === appt.user_id);
      if (!userSubs.length) continue;

      const payload = JSON.stringify({
        title: '⏰ Appuntamento scaduto',
        body: `${appt.name} — ${appt.address} alle ${appt.time}`,
        tag: `appt-${appt.id}`,
        url: '/',
      });

      for (const sub of userSubs) {
        try {
          const aud = new URL(sub.endpoint).origin;
          const te = new TextEncoder();
          const header = bytesToB64url(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
          const claims = bytesToB64url(te.encode(JSON.stringify({
            aud, exp: Math.floor(Date.now() / 1000) + 43200, sub: 'mailto:noreply@app.com',
          })));
          const unsigned = te.encode(`${header}.${claims}`);
          const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signingKey, unsigned));
          const jwt = `${header}.${claims}.${bytesToB64url(sig)}`;

          const subPubBytes = b64urlToBytes(sub.p256dh);
          const authBytes = b64urlToBytes(sub.auth);

          const lk = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
          const lkPub = new Uint8Array(await crypto.subtle.exportKey('raw', lk.publicKey));
          const subKey = await crypto.subtle.importKey('raw', subPubBytes.buffer as ArrayBuffer, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
          const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: subKey }, lk.privateKey, 256));

          const ikmInfo = concat(te.encode('WebPush: info\0'), subPubBytes, lkPub);
          const ikm = await hkdf(authBytes, shared, ikmInfo, 32);
          const salt = crypto.getRandomValues(new Uint8Array(16));
          const cek = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16);
          const nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);

          const padded = concat(te.encode(payload), new Uint8Array([2]));
          const ck = await crypto.subtle.importKey('raw', cek.buffer as ArrayBuffer, 'AES-GCM', false, ['encrypt']);
          const enc = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, ck, padded.buffer as ArrayBuffer));

          const rs = new Uint8Array(4);
          new DataView(rs.buffer).setUint32(0, 4096);
          const body = concat(salt, rs, new Uint8Array([65]), lkPub, enc);

          const res = await fetch(sub.endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `WebPush ${jwt}`,
              'Crypto-Key': `p256ecdsa=${vapidPubB64}`,
              'Content-Encoding': 'aes128gcm',
              'Content-Type': 'application/octet-stream',
              'TTL': '86400',
              'Urgency': 'high',
            },
            body: body.buffer as ArrayBuffer,
          });

          const status = res.status;
          const txt = await res.text();
          if (status >= 200 && status < 300) {
            sent++;
          } else {
            errors.push(`HTTP ${status}: ${txt}`);
            if (status === 404 || status === 410) {
              await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            }
          }
        } catch (e) {
          const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
          errors.push(msg);
        }
      }
    }

    return new Response(JSON.stringify({ sent, due: due.length, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
