-- Allow client admins to insert new profiles for their client
CREATE POLICY "Client admins can create profiles for their client" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  client_id = get_user_client_id(auth.uid()) AND 
  get_user_role(auth.uid()) = 'client_admin'::user_role
);

-- Allow client admins to update profiles in their client
CREATE POLICY "Client admins can update profiles in their client" 
ON public.profiles 
FOR UPDATE 
USING (
  client_id = get_user_client_id(auth.uid()) AND 
  get_user_role(auth.uid()) = 'client_admin'::user_role
);

-- Allow client admins to delete profiles in their client (except their own)
CREATE POLICY "Client admins can delete profiles in their client" 
ON public.profiles 
FOR DELETE 
USING (
  client_id = get_user_client_id(auth.uid()) AND 
  get_user_role(auth.uid()) = 'client_admin'::user_role AND
  id != auth.uid()
);