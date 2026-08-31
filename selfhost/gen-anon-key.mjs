// Genera le chiavi API (anon e service_role) per il tuo Supabase self-hosted.
// Uso:  JWT_SECRET="il-tuo-segreto" node gen-anon-key.mjs
import crypto from 'node:crypto';

const secret = process.env.JWT_SECRET;
if (!secret) {
  console.error('Imposta JWT_SECRET');
  process.exit(1);
}

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

function sign(role) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 60 * 60 * 24 * 365 * 10; // 10 anni
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64({ role, iss: 'supabase', iat, exp });
  const sig = crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}

console.log('ANON KEY (usala nel frontend):\n' + sign('anon') + '\n');
console.log('SERVICE ROLE KEY (solo server, mai nel frontend):\n' + sign('service_role'));
