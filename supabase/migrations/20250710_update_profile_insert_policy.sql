-- 2025-07-10  Update INSERT policy on public.profiles
-- Replaces the old client-admin-only rule with a broader rule
-- that also lets super-admins create profiles for any client.

DROP POLICY IF EXISTS "Client admins can create profiles for their client"
  ON public.profiles;

CREATE POLICY "Admins can create profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    (get_user_role(auth.uid()) = 'super_admin'::user_role) OR
    (client_id = get_user_client_id(auth.uid())
     AND get_user_role(auth.uid()) = 'client_admin'::user_role)
  );
