
-- Drop existing FOR ALL policies
DROP POLICY IF EXISTS "Users manage own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users manage own employees" ON public.employees;
DROP POLICY IF EXISTS "Users manage own day entries" ON public.day_entries;
DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;

-- Appointments: explicit per-operation policies
CREATE POLICY "Users select own appointments" ON public.appointments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own appointments" ON public.appointments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own appointments" ON public.appointments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own appointments" ON public.appointments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Employees
CREATE POLICY "Users select own employees" ON public.employees FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own employees" ON public.employees FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own employees" ON public.employees FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own employees" ON public.employees FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Day entries
CREATE POLICY "Users select own day entries" ON public.day_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own day entries" ON public.day_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own day entries" ON public.day_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own day entries" ON public.day_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Push subscriptions
CREATE POLICY "Users select own push subscriptions" ON public.push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own push subscriptions" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own push subscriptions" ON public.push_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own push subscriptions" ON public.push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);
