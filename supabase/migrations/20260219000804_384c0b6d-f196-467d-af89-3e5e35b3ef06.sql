-- Deny all anonymous access to appointments table
CREATE POLICY "Deny anon access to appointments"
ON public.appointments AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Deny all anonymous access to push_subscriptions table (same exposure issue)
CREATE POLICY "Deny anon access to push_subscriptions"
ON public.push_subscriptions AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Also restrict employees and day_entries for consistency
CREATE POLICY "Deny anon access to employees"
ON public.employees AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny anon access to day_entries"
ON public.day_entries AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);