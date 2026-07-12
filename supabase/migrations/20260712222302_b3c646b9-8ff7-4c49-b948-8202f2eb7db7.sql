-- 1. ARCHIVE: keep only the latest change per entry
-- Remove older duplicates, keeping the most recent per (user_id, employee_id, date_key)
DELETE FROM public.day_entries_history a
USING public.day_entries_history b
WHERE a.user_id = b.user_id
  AND a.employee_id = b.employee_id
  AND a.date_key = b.date_key
  AND (a.changed_at < b.changed_at OR (a.changed_at = b.changed_at AND a.id < b.id));

ALTER TABLE public.day_entries_history
  ADD CONSTRAINT day_entries_history_unique_entry UNIQUE (user_id, employee_id, date_key);

CREATE OR REPLACE FUNCTION public.archive_day_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.day_entries_history (user_id, employee_id, date_key, status, hours, location, operation)
    VALUES (OLD.user_id, OLD.employee_id, OLD.date_key, OLD.status, OLD.hours, OLD.location, 'DELETE')
    ON CONFLICT (user_id, employee_id, date_key)
    DO UPDATE SET status = EXCLUDED.status, hours = EXCLUDED.hours, location = EXCLUDED.location, operation = EXCLUDED.operation, changed_at = now();
    RETURN OLD;
  ELSE
    INSERT INTO public.day_entries_history (user_id, employee_id, date_key, status, hours, location, operation)
    VALUES (NEW.user_id, NEW.employee_id, NEW.date_key, NEW.status, NEW.hours, NEW.location, TG_OP)
    ON CONFLICT (user_id, employee_id, date_key)
    DO UPDATE SET status = EXCLUDED.status, hours = EXCLUDED.hours, location = EXCLUDED.location, operation = EXCLUDED.operation, changed_at = now();
    RETURN NEW;
  END IF;
END;
$function$;

-- 2. LOCATION HISTORY: persisted and separated per company (section) and per user
CREATE TABLE public.location_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  section_id text NOT NULL,
  location text NOT NULL,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, section_id, location)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.location_history TO authenticated;
GRANT ALL ON public.location_history TO service_role;

ALTER TABLE public.location_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own location history"
  ON public.location_history
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);