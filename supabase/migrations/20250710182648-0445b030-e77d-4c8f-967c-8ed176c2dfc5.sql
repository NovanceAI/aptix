-- Create invitations table for managing account creation links
CREATE TABLE public.invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  invited_by UUID NOT NULL,
  email TEXT NOT NULL,
  invitation_type TEXT NOT NULL CHECK (invitation_type IN ('area_admin', 'employee')),
  area_id UUID NULL, -- NULL for area_admin invitations, set for employee invitations
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  used_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Client admins can manage invitations in their client" 
ON public.invitations 
FOR ALL 
USING ((client_id = get_user_client_id(auth.uid())) AND (get_user_role(auth.uid()) = 'client_admin'::user_role));

CREATE POLICY "Area admins can create employee invitations in their areas" 
ON public.invitations 
FOR INSERT 
WITH CHECK (
  invitation_type = 'employee' AND
  area_id IS NOT NULL AND
  is_user_area_admin(auth.uid(), area_id) AND
  client_id = get_user_client_id(auth.uid())
);

CREATE POLICY "Area admins can view their employee invitations" 
ON public.invitations 
FOR SELECT 
USING (
  (invitation_type = 'employee' AND area_id IS NOT NULL AND is_user_area_admin(auth.uid(), area_id)) OR
  (invited_by = auth.uid())
);

CREATE POLICY "Super admins can manage all invitations" 
ON public.invitations 
FOR ALL 
USING (get_user_role(auth.uid()) = 'super_admin'::user_role);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_invitations_updated_at
BEFORE UPDATE ON public.invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate unique invitation tokens
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  token TEXT;
BEGIN
  -- Generate a random 32 character token
  token := encode(gen_random_bytes(24), 'base64');
  -- Remove any URL-unsafe characters
  token := replace(replace(replace(token, '/', '_'), '+', '-'), '=', '');
  RETURN token;
END;
$$;