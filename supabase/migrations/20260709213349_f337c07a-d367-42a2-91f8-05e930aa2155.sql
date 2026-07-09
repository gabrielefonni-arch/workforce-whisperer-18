CREATE TABLE public.day_entries_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  date_key text NOT NULL,
  status text,
  hours numeric,
  location text,
  operation text NOT NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_day_entries_history_user ON public.day_entries_history (user_id, changed_at DESC);
CREATE INDEX idx_day_entries_history_emp_date ON public.day_entries_history (employee_id, date_key);

GRANT SELECT ON public.day_entries_history TO authenticated;
GRANT ALL ON public.day_entries_history TO service_role;

ALTER TABLE public.day_entries_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon access to day_entries_history"
  ON public.day_entries_history AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);

CREATE POLICY "Users select own day entries history"
  ON public.day_entries_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.archive_day_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.day_entries_history (user_id, employee_id, date_key, status, hours, location, operation)
    VALUES (OLD.user_id, OLD.employee_id, OLD.date_key, OLD.status, OLD.hours, OLD.location, 'DELETE');
    RETURN OLD;
  ELSE
    INSERT INTO public.day_entries_history (user_id, employee_id, date_key, status, hours, location, operation)
    VALUES (NEW.user_id, NEW.employee_id, NEW.date_key, NEW.status, NEW.hours, NEW.location, TG_OP);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER trg_archive_day_entry
AFTER INSERT OR UPDATE OR DELETE ON public.day_entries
FOR EACH ROW EXECUTE FUNCTION public.archive_day_entry();