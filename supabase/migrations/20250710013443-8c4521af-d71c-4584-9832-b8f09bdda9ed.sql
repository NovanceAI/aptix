-- Fix infinite recursion in area_permissions RLS policies by creating security definer functions

-- First, drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "Area admins can grant permissions in their areas" ON public.area_permissions;
DROP POLICY IF EXISTS "Area admins can view permissions for their areas" ON public.area_permissions;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.get_user_area_admin_areas(user_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT ARRAY_AGG(area_id) 
  FROM public.area_permissions 
  WHERE user_id = $1 AND permission_level = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.is_user_area_admin(user_id uuid, area_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.area_permissions 
    WHERE user_id = $1 AND area_id = $2 AND permission_level = 'admin'
  );
$$;

-- Recreate the policies using the security definer functions
CREATE POLICY "Area admins can grant permissions in their areas" 
ON public.area_permissions 
FOR INSERT 
WITH CHECK (is_user_area_admin(auth.uid(), area_id));

CREATE POLICY "Area admins can view permissions for their areas" 
ON public.area_permissions 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  is_user_area_admin(auth.uid(), area_id) OR
  get_user_role(auth.uid()) = 'client_admin' OR
  get_user_role(auth.uid()) = 'super_admin'
);

-- Update the existing policies that might also cause issues
DROP POLICY IF EXISTS "Client admins can manage area permissions in their client" ON public.area_permissions;
DROP POLICY IF EXISTS "Super admins can manage all area permissions" ON public.area_permissions;
DROP POLICY IF EXISTS "Users can view their own area permissions" ON public.area_permissions;

-- Recreate them with better logic
CREATE POLICY "Client admins can manage area permissions in their client" 
ON public.area_permissions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.areas a 
    WHERE a.id = area_permissions.area_id 
    AND a.client_id = get_user_client_id(auth.uid()) 
    AND get_user_role(auth.uid()) = 'client_admin'
  )
);

CREATE POLICY "Super admins can manage all area permissions" 
ON public.area_permissions 
FOR ALL 
USING (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Users can view their own area permissions" 
ON public.area_permissions 
FOR SELECT 
USING (user_id = auth.uid());