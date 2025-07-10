-- Add 'area_admin' to the user_role enum
ALTER TYPE public.user_role ADD VALUE 'area_admin';

-- Update RLS policies to properly handle area_admin role
-- Update evaluation_criteria policies 
DROP POLICY IF EXISTS "Client admins and area admins can manage criteria" ON public.evaluation_criteria;

CREATE POLICY "Client admins and area admins can manage criteria" 
ON public.evaluation_criteria 
FOR ALL 
USING (
  (get_user_role(auth.uid()) = 'client_admin' AND client_id = get_user_client_id(auth.uid())) OR
  (get_user_role(auth.uid()) = 'area_admin' AND area_id IS NOT NULL AND is_user_area_admin(auth.uid(), area_id)) OR
  get_user_role(auth.uid()) = 'super_admin'
);

-- Update profiles policies for area_admin role
DROP POLICY IF EXISTS "Client and area admins can view relevant profiles" ON public.profiles;

CREATE POLICY "Client and area admins can view relevant profiles" 
ON public.profiles 
FOR SELECT 
USING (
  id = auth.uid() OR
  (get_user_role(auth.uid()) = 'client_admin' AND client_id = get_user_client_id(auth.uid())) OR
  (get_user_role(auth.uid()) = 'area_admin' AND (area_id IS NULL OR is_user_area_admin(auth.uid(), area_id))) OR
  get_user_role(auth.uid()) = 'super_admin'
);

DROP POLICY IF EXISTS "Client and area admins can update relevant profiles" ON public.profiles;

CREATE POLICY "Client and area admins can update relevant profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  id = auth.uid() OR
  (get_user_role(auth.uid()) = 'client_admin' AND client_id = get_user_client_id(auth.uid())) OR
  get_user_role(auth.uid()) = 'super_admin'
);

-- Update areas policies to allow area_admins to view their assigned areas
DROP POLICY IF EXISTS "Users can view areas in their client" ON public.areas;

CREATE POLICY "Users can view areas in their client" 
ON public.areas 
FOR SELECT 
USING (
  client_id = get_user_client_id(auth.uid()) OR
  (get_user_role(auth.uid()) = 'area_admin' AND is_user_area_admin(auth.uid(), id))
);