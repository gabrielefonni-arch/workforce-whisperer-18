# Anti-pausa del database (gratis, senza dipendere dall'app)

Il piano gratuito sospende il progetto database dopo **7 giorni senza attività**.
Ora il "ping" non dipende più dall'apertura dell'app: viene fatto da un cron esterno gratuito.

## Metodo 1 (già pronto) — GitHub Actions

File: `.github/workflows/keepalive.yml`

- Gira automaticamente **ogni 3 giorni** appena il progetto è su GitHub.
- Puoi lanciarlo a mano da **GitHub → Actions → Keepalive database → Run workflow**.
- Se il progetto risulta sospeso, il workflow va in errore e ricevi la mail di notifica da GitHub.

Nessuna configurazione richiesta: usa solo l'URL pubblico e la chiave pubblicabile.

## Metodo 2 (ridondanza, consigliato) — cron-job.org

Un secondo pinger indipendente, nel caso GitHub disattivi i workflow per inattività del repo:

1. Vai su https://cron-job.org e registrati (gratis).
2. **Create cronjob**
   - Title: `Keepalive Edilristrutturazioni`
   - URL: `https://vdfglzacnhtbzvczzpni.supabase.co/auth/v1/health`
   - Schedule: **Every 1 day** (o ogni 2 giorni)
3. Salva. Fine.

## Come verificare

Apri nel browser:
`https://vdfglzacnhtbzvczzpni.supabase.co/auth/v1/health`

- Risposta con testo JSON → progetto **attivo**.
- Nessuna risposta / errore di connessione → progetto sospeso, va riattivato dal pannello del database.

## Nota

GitHub disabilita i workflow schedulati se il repository resta senza commit per ~60 giorni;
per questo il Metodo 2 (cron-job.org) è la rete di sicurezza consigliata.
