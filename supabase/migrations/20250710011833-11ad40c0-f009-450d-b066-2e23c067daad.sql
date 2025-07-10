-- Create areas table
CREATE TABLE public.areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create area permissions table to manage who can admin which areas
CREATE TABLE public.area_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL CHECK (permission_level IN ('admin', 'viewer')),
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(area_id, user_id)
);

-- Add area_id to evaluation_criteria table
ALTER TABLE public.evaluation_criteria 
ADD COLUMN area_id UUID REFERENCES public.areas(id) ON DELETE CASCADE;

-- Add area_id to evaluations table
ALTER TABLE public.evaluations 
ADD COLUMN area_id UUID REFERENCES public.areas(id) ON DELETE CASCADE;

-- Enable RLS on new tables
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.area_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies for areas table
CREATE POLICY "Users can view areas in their client" 
ON public.areas 
FOR SELECT 
USING (client_id = get_user_client_id(auth.uid()));

CREATE POLICY "Client admins can manage areas in their client" 
ON public.areas 
FOR ALL 
USING (client_id = get_user_client_id(auth.uid()) AND get_user_role(auth.uid()) = 'client_admin');

CREATE POLICY "Super admins can manage all areas" 
ON public.areas 
FOR ALL 
USING (get_user_role(auth.uid()) = 'super_admin');

-- Create policies for area_permissions table
CREATE POLICY "Users can view their own area permissions" 
ON public.area_permissions 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Area admins can view permissions for their areas" 
ON public.area_permissions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.area_permissions ap
    WHERE ap.area_id = area_permissions.area_id 
    AND ap.user_id = auth.uid() 
    AND ap.permission_level = 'admin'
  )
);

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

CREATE POLICY "Area admins can grant permissions in their areas" 
ON public.area_permissions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.area_permissions ap
    WHERE ap.area_id = area_permissions.area_id 
    AND ap.user_id = auth.uid() 
    AND ap.permission_level = 'admin'
  )
);

CREATE POLICY "Super admins can manage all area permissions" 
ON public.area_permissions 
FOR ALL 
USING (get_user_role(auth.uid()) = 'super_admin');

-- Update evaluation_criteria policies to include area access
DROP POLICY IF EXISTS "Client admins can manage their client's criteria" ON public.evaluation_criteria;
DROP POLICY IF EXISTS "Users can view their client's criteria" ON public.evaluation_criteria;

CREATE POLICY "Client admins can manage criteria in their client areas" 
ON public.evaluation_criteria 
FOR ALL 
USING (
  (client_id = get_user_client_id(auth.uid()) AND get_user_role(auth.uid()) = 'client_admin')
  OR
  (area_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.area_permissions ap
    WHERE ap.area_id = evaluation_criteria.area_id 
    AND ap.user_id = auth.uid() 
    AND ap.permission_level = 'admin'
  ))
);

CREATE POLICY "Users can view criteria in their accessible areas" 
ON public.evaluation_criteria 
FOR SELECT 
USING (
  client_id = get_user_client_id(auth.uid())
  OR
  (area_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.area_permissions ap
    WHERE ap.area_id = evaluation_criteria.area_id 
    AND ap.user_id = auth.uid()
  ))
);

-- Update evaluations policies to include area access
DROP POLICY IF EXISTS "Client admins can manage their client's evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Users can view evaluations they're involved in" ON public.evaluations;

CREATE POLICY "Client admins and area admins can manage evaluations" 
ON public.evaluations 
FOR ALL 
USING (
  (client_id = get_user_client_id(auth.uid()) AND get_user_role(auth.uid()) = 'client_admin')
  OR
  (area_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.area_permissions ap
    WHERE ap.area_id = evaluations.area_id 
    AND ap.user_id = auth.uid() 
    AND ap.permission_level = 'admin'
  ))
);

CREATE POLICY "Users can view evaluations in their accessible areas" 
ON public.evaluations 
FOR SELECT 
USING (
  (client_id = get_user_client_id(auth.uid()) AND ((evaluatee_id = auth.uid()) OR (evaluator_id = auth.uid())))
  OR
  (area_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.area_permissions ap
    WHERE ap.area_id = evaluations.area_id 
    AND ap.user_id = auth.uid()
  ) AND ((evaluatee_id = auth.uid()) OR (evaluator_id = auth.uid())))
);

-- Create functions to check area permissions
CREATE OR REPLACE FUNCTION public.get_user_area_permission(user_id uuid, area_id uuid)
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT permission_level FROM public.area_permissions 
  WHERE user_id = $1 AND area_id = $2
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_area_admin(user_id uuid, area_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.area_permissions 
    WHERE user_id = $1 AND area_id = $2 AND permission_level = 'admin'
  );
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_areas_updated_at
BEFORE UPDATE ON public.areas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_area_permissions_updated_at
BEFORE UPDATE ON public.area_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();