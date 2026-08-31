# Migrazione su infrastruttura indipendente

Questo pacchetto rende l'app **completamente indipendente da Lovable**: codice,
database, autenticazione e backup sotto il tuo controllo.

## Cosa contiene

| File | A cosa serve |
|---|---|
| `schema.sql` | Schema completo del database (tabelle, indici, RLS, trigger di archivio) |
| `docker-compose.yml` | Postgres + Auth + API REST + backup giornaliero automatico |
| `kong.yml` | Instradamento delle API (`/auth/v1`, `/rest/v1`) |
| `.env.example` | Variabili da personalizzare (password e segreti) |
| `import-data.sh` | Importa i CSV esportati dal database attuale |

L'export dei dati attuali (CSV di tutte le tabelle) è stato generato a parte e
scaricabile dalla chat: `employees`, `day_entries`, `day_entries_history`,
`appointments`, `location_history`, `push_subscriptions`.

## Procedura (una volta sola, ~30 minuti)

1. **Prendi un server.** Qualsiasi VPS Linux con 2 GB di RAM (Hetzner ~5 €/mese)
   con Docker installato.
2. **Copia questa cartella** sul server e prepara le variabili:
   ```bash
   cp .env.example .env && nano .env    # password + JWT_SECRET + domini
   ```
3. **Avvia l'infrastruttura:**
   ```bash
   docker compose up -d
   ```
   Lo schema viene creato automaticamente al primo avvio.
4. **Importa i dati:**
   ```bash
   export DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/postgres"
   ./import-data.sh /percorso/cartella-csv
   ```
   Lo script stampa i conteggi finali: devono corrispondere a quelli attuali.
5. **Ricrea l'utente di accesso** (le password non sono esportabili per motivi di
   sicurezza): registra la stessa email dall'app, poi allinea l'`user_id`:
   ```sql
   -- id del nuovo utente
   select id, email from auth.users;
   -- allinea i dati importati al nuovo id
   update public.employees           set user_id = 'NUOVO-UUID';
   update public.day_entries         set user_id = 'NUOVO-UUID';
   update public.day_entries_history set user_id = 'NUOVO-UUID';
   update public.appointments        set user_id = 'NUOVO-UUID';
   update public.location_history    set user_id = 'NUOVO-UUID';
   ```
6. **Punta l'app al nuovo backend.** Nel progetto frontend basta cambiare due
   variabili d'ambiente (`.env`) e ricompilare:
   ```
   VITE_SUPABASE_URL="https://api.tuodominio.it"
   VITE_SUPABASE_PUBLISHABLE_KEY="<chiave anon generata dal tuo JWT_SECRET>"
   ```
   La chiave anon si genera firmando `{"role":"anon","iss":"supabase"}` con il tuo
   `JWT_SECRET` (es. su jwt.io oppure con lo script `gen-anon-key.mjs`).
7. **Pubblica il frontend** dove preferisci: `npm run build` genera la cartella
   `dist/` statica, caricabile su Netlify, Cloudflare Pages, Vercel o sullo stesso
   VPS con Nginx. Nessun vincolo con Lovable.

## Backup

Il servizio `backup` esegue ogni 24 h un dump completo in `./backups/` e conserva
30 giorni di storico. Consigliato aggiungere una copia off-site:

```bash
rclone sync ./backups remote:edilristrutturazioni-backup
```

## Note importanti

- Il codice dell'app è React + Vite standard: non contiene nulla di proprietario
  Lovable, quindi compila e gira ovunque.
- Le notifiche push richiedono le Edge Function riscritte come piccolo servizio
  Node/Deno sullo stesso VPS (opzionale, l'app funziona anche senza).
- Ripeti il passo 4 con un export aggiornato appena prima dello switch definitivo,
  per non perdere le giornaliere inserite nel frattempo.
