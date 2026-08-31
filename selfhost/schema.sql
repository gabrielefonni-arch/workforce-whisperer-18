-- =====================================================================
-- Edilristrutturazioni — Schema completo del database (PostgreSQL)
-- Da eseguire su qualsiasi istanza Postgres / Supabase self-hosted.
-- Richiede l'estensione auth di Supabase (auth.users) OPPURE, se usi
-- Postgres puro, rimuovi le FOREIGN KEY verso auth.users.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------- employees
CREATE TABLE IF NOT EXISTS public.employees (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  section_id text NOT NULL,
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------- day_entries
CREATE TABLE IF NOT EXISTS public.day_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  date_key    text NOT NULL,
  status      text NOT NULL DEFAULT '',
  hours       numeric NOT NULL DEFAULT 0,
  location    text DEFAULT ''
);
CREATE INDEX IF NOT EXISTS day_entries_user_date_idx ON public.day_entries (user_id, date_key);
CREATE UNIQUE INDEX IF NOT EXISTS day_entries_unique_idx ON public.day_entries (employee_id, date_key);

-- ------------------------------------------------------ day_entries_history
CREATE TABLE IF NOT EXISTS public.day_entries_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  employee_id uuid NOT NULL,
  date_key    text NOT NULL,
  status      text,
  hours       numeric,
  location    text,
  operation   text NOT NULL,
  changed_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, employee_id, date_key)
);

-- ------------------------------------------------------------- appointments
CREATE TABLE IF NOT EXISTS public.appointments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  name       text NOT NULL,
  address    text NOT NULL DEFAULT '',
  date       text NOT NULL,
  time       text NOT NULL DEFAULT '',
  status     text NOT NULL DEFAULT 'pending',
  notes      text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------- location_history
CREATE TABLE IF NOT EXISTS public.location_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  section_id   text NOT NULL,
  location     text NOT NULL,
  last_used_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------- push_subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  endpoint   text NOT NULL,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------------------- cloud_keepalive
CREATE TABLE IF NOT EXISTS public.cloud_keepalive (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pinged_at timestamptz NOT NULL DEFAULT now()
);

-- ================================ GRANTS (Data API / PostgREST) ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.day_entries        TO authenticated;
GRANT SELECT                         ON public.day_entries_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.location_history   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- ================================ RLS =====================================
ALTER TABLE public.employees           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_entries         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_entries_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_keepalive     ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['employees','day_entries','appointments','location_history','push_subscriptions']
  LOOP
    EXECUTE format('CREATE POLICY "own_all_%1$s" ON public.%1$I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t);
    EXECUTE format('CREATE POLICY "deny_anon_%1$s" ON public.%1$I AS RESTRICTIVE TO anon USING (false)', t);
  END LOOP;
END $$;

CREATE POLICY "own_select_history" ON public.day_entries_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "deny_anon_history" ON public.day_entries_history
  AS RESTRICTIVE TO anon USING (false);
CREATE POLICY "deny_anon_keepalive" ON public.cloud_keepalive
  AS RESTRICTIVE TO anon USING (false);

-- ================================ Audit trail =============================
CREATE OR REPLACE FUNCTION public.archive_day_entry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.day_entries_history (user_id, employee_id, date_key, status, hours, location, operation)
    VALUES (OLD.user_id, OLD.employee_id, OLD.date_key, OLD.status, OLD.hours, OLD.location, 'DELETE')
    ON CONFLICT (user_id, employee_id, date_key)
    DO UPDATE SET status = EXCLUDED.status, hours = EXCLUDED.hours, location = EXCLUDED.location,
                  operation = EXCLUDED.operation, changed_at = now();
    RETURN OLD;
  ELSE
    INSERT INTO public.day_entries_history (user_id, employee_id, date_key, status, hours, location, operation)
    VALUES (NEW.user_id, NEW.employee_id, NEW.date_key, NEW.status, NEW.hours, NEW.location, TG_OP)
    ON CONFLICT (user_id, employee_id, date_key)
    DO UPDATE SET status = EXCLUDED.status, hours = EXCLUDED.hours, location = EXCLUDED.location,
                  operation = EXCLUDED.operation, changed_at = now();
    RETURN NEW;
  END IF;
END;
$function$;

DROP TRIGGER IF EXISTS trg_archive_day_entry ON public.day_entries;
CREATE TRIGGER trg_archive_day_entry
AFTER INSERT OR UPDATE OR DELETE ON public.day_entries
FOR EACH ROW EXECUTE FUNCTION public.archive_day_entry();
