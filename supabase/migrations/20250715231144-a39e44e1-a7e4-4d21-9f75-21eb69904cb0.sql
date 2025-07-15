-- Create roles table
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(name, area_id)
);

-- Create evaluation templates table
CREATE TABLE public.evaluation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create evaluation criteria templates table (supports hierarchical structure)
CREATE TABLE public.evaluation_criteria_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.evaluation_templates(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.evaluation_criteria_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  weight DECIMAL(5,2) NOT NULL CHECK (weight > 0 AND weight <= 100),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add role_id to profiles table to assign roles to employees
ALTER TABLE public.profiles ADD COLUMN role_id UUID REFERENCES public.roles(id);

-- Enable RLS for new tables
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_criteria_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roles table
CREATE POLICY "Super admins can manage all roles" ON public.roles
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Client admins can manage roles in their client" ON public.roles
  FOR ALL TO authenticated
  USING (client_id = get_user_client_id(auth.uid()) AND get_user_role(auth.uid()) = 'client_admin');

CREATE POLICY "Area admins can manage roles in their areas" ON public.roles
  FOR ALL TO authenticated
  USING (area_id IN (SELECT area_id FROM area_permissions WHERE user_id = auth.uid() AND permission_level = 'admin'));

CREATE POLICY "Users can view roles in their accessible areas" ON public.roles
  FOR SELECT TO authenticated
  USING (
    client_id = get_user_client_id(auth.uid()) OR
    area_id IN (SELECT area_id FROM area_permissions WHERE user_id = auth.uid())
  );

-- RLS Policies for evaluation_templates table
CREATE POLICY "Super admins can manage all evaluation templates" ON public.evaluation_templates
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Client and area admins can manage templates for their roles" ON public.evaluation_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roles r 
      WHERE r.id = evaluation_templates.role_id 
      AND (
        (r.client_id = get_user_client_id(auth.uid()) AND get_user_role(auth.uid()) = 'client_admin') OR
        (r.area_id IN (SELECT area_id FROM area_permissions WHERE user_id = auth.uid() AND permission_level = 'admin'))
      )
    )
  );

CREATE POLICY "Users can view templates for roles in their accessible areas" ON public.evaluation_templates
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roles r 
      WHERE r.id = evaluation_templates.role_id 
      AND (
        r.client_id = get_user_client_id(auth.uid()) OR
        r.area_id IN (SELECT area_id FROM area_permissions WHERE user_id = auth.uid())
      )
    )
  );

-- RLS Policies for evaluation_criteria_templates table
CREATE POLICY "Super admins can manage all evaluation criteria templates" ON public.evaluation_criteria_templates
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Client and area admins can manage criteria templates" ON public.evaluation_criteria_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM evaluation_templates et
      JOIN roles r ON r.id = et.role_id
      WHERE et.id = evaluation_criteria_templates.template_id 
      AND (
        (r.client_id = get_user_client_id(auth.uid()) AND get_user_role(auth.uid()) = 'client_admin') OR
        (r.area_id IN (SELECT area_id FROM area_permissions WHERE user_id = auth.uid() AND permission_level = 'admin'))
      )
    )
  );

CREATE POLICY "Users can view criteria templates for accessible roles" ON public.evaluation_criteria_templates
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM evaluation_templates et
      JOIN roles r ON r.id = et.role_id
      WHERE et.id = evaluation_criteria_templates.template_id 
      AND (
        r.client_id = get_user_client_id(auth.uid()) OR
        r.area_id IN (SELECT area_id FROM area_permissions WHERE user_id = auth.uid())
      )
    )
  );

-- Create indexes for performance
CREATE INDEX idx_roles_area_id ON public.roles(area_id);
CREATE INDEX idx_roles_client_id ON public.roles(client_id);
CREATE INDEX idx_evaluation_templates_role_id ON public.evaluation_templates(role_id);
CREATE INDEX idx_evaluation_criteria_templates_template_id ON public.evaluation_criteria_templates(template_id);
CREATE INDEX idx_evaluation_criteria_templates_parent_id ON public.evaluation_criteria_templates(parent_id);
CREATE INDEX idx_profiles_role_id ON public.profiles(role_id);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evaluation_templates_updated_at
  BEFORE UPDATE ON public.evaluation_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evaluation_criteria_templates_updated_at
  BEFORE UPDATE ON public.evaluation_criteria_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();