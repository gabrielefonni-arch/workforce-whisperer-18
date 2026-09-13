# Anti-pausa del database (gratis, senza dipendere dall'app)

Il piano gratuito sospende il progetto database dopo **7 giorni senza attività**.
Il sistema anti-pausa è già attivo su più livelli: il principale è **dentro il database stesso**, quindi non dipende né dall'app né da GitHub.

## Metodo 1 (principale, già attivo) — auto-ping dentro Supabase

Questo è il ping più affidabile: il database si "pinga" da solo ogni 3 giorni.

- Non richiede GitHub, cron-job.org o altri servizi esterni.
- Si attiva una sola volta nella dashboard Supabase.
- Per i passaggi vedi `docs/GUIDA_ANTI_PAUSA_AUTOMATICA.md`.

Verifica che sia attivo con questa query nel SQL Editor:

```sql
select jobname, schedule, active from cron.job;
```

Devi vedere la riga `auto-keepalive` con `active = true`.

## Metodo 2 (ridondanza) — GitHub Actions

File: `.github/workflows/keepalive.yml`

- Gira automaticamente **ogni 3 giorni** appena il progetto è su GitHub.
- Puoi lanciarlo a mano da **GitHub → Actions → Keepalive database → Run workflow**.
- Se il progetto risulta sospeso, il workflow va in errore e ricevi la mail di notifica da GitHub.

Nessuna configurazione richiesta: usa solo l'URL pubblico e la chiave pubblicabile.

## Metodo 3 (ulteriore ridondanza) — cron-job.org

Un pinger esterno indipendente, utile se GitHub disattiva i workflow per inattività del repo.

**Importante:** l'URL `/auth/v1/health` risponde **401 Unauthorized** perché richiede autenticazione. cron-job.org interpreta il 401 come fallimento e può disabilitare il job. Per questo va usato l'URL REST con l'header `apikey`.

1. Vai su https://cron-job.org e accedi.
2. Trova il job esistente `Keepalive Edilristrutturazioni` e clicca **Modifica** (o creane uno nuovo se è stato cancellato).
3. Imposta:
   - **Title:** `Keepalive Edilristrutturazioni`
   - **URL:** `https://vdfglzacnhtbzvczzpni.supabase.co/rest/v1/`
   - **Schedule:** **Every 1 day** (o ogni 2 giorni)
4. Aggiungi questo **HTTP header**:
   - **Nome:** `apikey`
   - **Valore:** `sb_publishable_DH8l6Hu5AaOPYvv0TImEpw_-EXAK2Qy`
5. Salva e riattiva.

Ora lo stato sarà **200 OK** invece di 401, e il job non verrà più disabilitato.

## Come verificare che il database sia sveglio

Apri nel browser:
`https://vdfglzacnhtbzvczzpni.supabase.co/auth/v1/health`

- Risposta con testo JSON (anche errore 401) → progetto **attivo**.
- Nessuna risposta / errore di connessione → progetto sospeso, va riattivato dal pannello del database.

## Nota

GitHub disabilita i workflow schedulati se il repository resta senza commit per ~60 giorni; per questo il Metodo 1 (auto-ping interno) è la protezione principale, mentre GitHub e cron-job.org sono reti di sicurezza aggiuntive.
