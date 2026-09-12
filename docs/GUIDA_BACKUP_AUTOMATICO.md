# Backup automatico giornaliero (snapshot nel database)

Oltre all'archivio storico già attivo (ogni modifica viene registrata in `day_entries_history`),
questo sistema crea una **fotografia completa di tutti i dati ogni notte**, conservata per 90 giorni.

## Come attivarlo (una volta sola, 2 minuti)

Dashboard Supabase → **SQL Editor** → incolla ed esegui:

```sql
-- Tabella snapshot: copia completa giornaliera di dipendenti e giornaliere
create table if not exists public.daily_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null default current_date,
  user_id uuid not null,
  employees jsonb not null,
  day_entries jsonb not null,
  created_at timestamptz not null default now()
);

-- Funzione che scatta la fotografia
create or replace function public.take_daily_snapshot()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.daily_snapshots (user_id, employees, day_entries)
  select
    u.id,
    coalesce((select jsonb_agg(e.*) from public.employees e where e.user_id = u.id), '[]'::jsonb),
    coalesce((select jsonb_agg(d.*) from public.day_entries d where d.user_id = u.id), '[]'::jsonb)
  from auth.users u;

  -- tiene solo gli ultimi 90 giorni di snapshot
  delete from public.daily_snapshots
  where snapshot_date < current_date - interval '90 days';
end;
$$;

-- Ogni notte alle 03:00
select cron.schedule(
  'daily-backup-snapshot',
  '0 3 * * *',
  $$ select public.take_daily_snapshot(); $$
);
```

## Verifica

```sql
select jobname, schedule, active from cron.job;
select snapshot_date, user_id from public.daily_snapshots order by created_at desc limit 5;
```

Dopo la prima notte vedrai le righe degli snapshot.

## Livelli di protezione attivi

1. **Archivio storico**: ogni singola modifica è tracciata (niente si perde mai).
2. **Snapshot giornalieri**: copia completa ogni notte, 90 giorni di storia.
3. **Backup locale**: l'app salva una copia sul dispositivo.
4. **Export PDF/CSV**: scaricabile in qualsiasi momento dall'Archivio.
