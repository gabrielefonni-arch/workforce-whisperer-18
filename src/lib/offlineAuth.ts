/**
 * Login offline.
 *
 * Dopo un accesso online riuscito salviamo sul dispositivo:
 *  - email e id utente
 *  - un hash PBKDF2-SHA256 della password (mai la password in chiaro)
 *
 * Quando il dispositivo è senza rete, l'utente può sbloccare l'app
 * verificando la password contro l'hash locale: vede i dati in cache e
 * le modifiche vengono accodate e sincronizzate al ritorno della rete.
 */

const CRED_KEY = 'offline-auth-credential-v1';
const UNLOCK_KEY = 'offline-auth-unlock-v1';
const UNLOCK_TTL_MS = 12 * 60 * 60 * 1000; // 12 ore

export interface OfflineCredential {
  userId: string;
  email: string;
  salt: string;
  hash: string;
  iterations: number;
  savedAt: number;
}

const toB64 = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)));

async function derive(password: string, saltB64: string, iterations: number) {
  const enc = new TextEncoder();
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    256,
  );
  return toB64(bits);
}

/** Salva (o aggiorna) la credenziale offline dopo un login online riuscito. */
export async function saveOfflineCredential(userId: string, email: string, password: string) {
  try {
    const iterations = 150_000;
    const saltBytes = crypto.getRandomValues(new Uint8Array(16));
    const salt = toB64(saltBytes.buffer);
    const hash = await derive(password, salt, iterations);
    const cred: OfflineCredential = {
      userId,
      email: email.trim().toLowerCase(),
      salt,
      hash,
      iterations,
      savedAt: Date.now(),
    };
    localStorage.setItem(CRED_KEY, JSON.stringify(cred));
  } catch {
    // Se il salvataggio non è possibile, l'app resta comunque funzionante online.
  }
}

export function getOfflineCredential(): OfflineCredential | null {
  try {
    const raw = localStorage.getItem(CRED_KEY);
    if (!raw) return null;
    const cred = JSON.parse(raw) as OfflineCredential;
    if (!cred?.hash || !cred?.salt || !cred?.userId) return null;
    return cred;
  } catch {
    return null;
  }
}

export function hasOfflineCredential(email?: string) {
  const cred = getOfflineCredential();
  if (!cred) return false;
  if (!email) return true;
  return cred.email === email.trim().toLowerCase();
}

/** Verifica la password contro l'hash locale (confronto a tempo costante). */
export async function verifyOfflineCredential(email: string, password: string) {
  const cred = getOfflineCredential();
  if (!cred) return false;
  if (cred.email !== email.trim().toLowerCase()) return false;
  const hash = await derive(password, cred.salt, cred.iterations || 150_000);
  if (hash.length !== cred.hash.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ cred.hash.charCodeAt(i);
  return diff === 0;
}

export interface OfflineUnlock {
  userId: string;
  email: string;
  at: number;
}

export function setOfflineUnlock(cred: OfflineCredential) {
  const unlock: OfflineUnlock = { userId: cred.userId, email: cred.email, at: Date.now() };
  localStorage.setItem(UNLOCK_KEY, JSON.stringify(unlock));
  return unlock;
}

export function getOfflineUnlock(): OfflineUnlock | null {
  try {
    const raw = localStorage.getItem(UNLOCK_KEY);
    if (!raw) return null;
    const unlock = JSON.parse(raw) as OfflineUnlock;
    if (!unlock?.userId) return null;
    if (Date.now() - unlock.at > UNLOCK_TTL_MS) {
      localStorage.removeItem(UNLOCK_KEY);
      return null;
    }
    return unlock;
  } catch {
    return null;
  }
}

export function clearOfflineUnlock() {
  localStorage.removeItem(UNLOCK_KEY);
}

export function clearOfflineCredential() {
  localStorage.removeItem(CRED_KEY);
  clearOfflineUnlock();
}

/** Sblocca l'app offline: true se la password locale è corretta. */
export async function offlineSignIn(email: string, password: string) {
  const ok = await verifyOfflineCredential(email, password);
  if (!ok) return false;
  const cred = getOfflineCredential()!;
  setOfflineUnlock(cred);
  return true;
}
