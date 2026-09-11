# Anti-pausa automatica al 100% (senza GitHub)

Il piano gratuito di Supabase sospende il progetto dopo 7 giorni senza attività.
Questa guida attiva un "auto-ping" **dentro il database stesso**: si tiene sveglio da solo,
per sempre, senza GitHub, senza servizi esterni, senza costi.

## Procedura (una sola volta, 3 minuti)

### 1. Attiva le estensioni
- Apri la tua dashboard Supabase → progetto `vdfglzacnhtbzvczzpni`
- Vai su **Database → Extensions**
- Cerca e attiva: **pg_cron** e **pg_net**

### 2. Crea il ping automatico
- Vai su **SQL Editor → New query**
- Incolla questo blocco e premi **Run**:

```sql
-- Il database si "pinga" da solo ogni 3 giorni: mai più sospensioni.
select cron.schedule(
  'auto-keepalive',
  '11 4 */3 * *',
  $$
  select net.http_get(
    url := 'https://vdfglzacnhtbzvczzpni.supabase.co/auth/v1/health'
  ) as request_id;
  $$
);
```

### 3. Verifica che sia attivo
Sempre nella SQL Editor, esegui:

```sql
select jobname, schedule, active from cron.job;
```

Devi vedere la riga `auto-keepalive` con `active = true`. Fatto: da questo momento
il progetto non si sospende più, anche se nessuno apre l'app per mesi.

## Per disattivarlo (se mai servisse)

```sql
select cron.unschedule('auto-keepalive');
```

---

## Nota sui ping GitHub (keepalive.yml)

I tre file in `.github/workflows/` sono una **seconda rete di sicurezza** e si attivano
solo quando colleghi il progetto a un repository GitHub (menu + → GitHub → Connect project).
Con l'auto-ping del punto 2 non sono più indispensabili, ma tenerli entrambi
rende il sistema praticamente immune a qualsiasi blocco.
