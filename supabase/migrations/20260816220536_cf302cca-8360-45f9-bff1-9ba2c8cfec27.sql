CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE TABLE IF NOT EXISTS public.cloud_keepalive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pinged_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.cloud_keepalive TO service_role;
ALTER TABLE public.cloud_keepalive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny anon access to cloud_keepalive" ON public.cloud_keepalive AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.cloud_keepalive_ping()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.cloud_keepalive WHERE pinged_at < now() - interval '30 days';
  INSERT INTO public.cloud_keepalive DEFAULT VALUES;
END;
$$;

SELECT cron.schedule('cloud-keepalive-daily', '0 6 * * *', $$SELECT public.cloud_keepalive_ping();$$)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cloud-keepalive-daily');