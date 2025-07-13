-- Update the profile insert policy to allow area admins to create profiles
DROP POLICY IF EXISTS "Admins can create profiles" ON public.profiles;

CREATE POLICY "Admins can create profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  -- Super admins can create profiles for any client
  (get_user_role(auth.uid()) = 'super_admin'::user_role) OR
  -- Client admins can create profiles for their own client
  (client_id = get_user_client_id(auth.uid()) AND get_user_role(auth.uid()) = 'client_admin'::user_role) OR
  -- Area admins can create profiles for their own client
  (client_id = get_user_client_id(auth.uid()) AND get_user_role(auth.uid()) = 'area_admin'::user_role)
);