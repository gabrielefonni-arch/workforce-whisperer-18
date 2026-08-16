-- 1. Remove duplicate push cron job (two identical every-minute jobs existed)
DO $$
DECLARE
  dup_id bigint;
BEGIN
  SELECT jobid INTO dup_id
  FROM cron.job
  WHERE jobname = 'send-push-notifications-every-minute'
  LIMIT 1;
  IF dup_id IS NOT NULL THEN
    PERFORM cron.unschedule(dup_id);
  END IF;
END $$;

-- 2. Tighten location_history: authenticated-only, deny anon explicitly
DROP POLICY IF EXISTS "Users manage own location history" ON public.location_history;

CREATE POLICY "Users manage own location history"
ON public.location_history
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Deny anon access to location_history"
ON public.location_history
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.location_history TO authenticated;
GRANT ALL ON public.location_history TO service_role;