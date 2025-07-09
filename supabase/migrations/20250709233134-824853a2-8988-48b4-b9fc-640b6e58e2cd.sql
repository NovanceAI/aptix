-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('super_admin', 'client_admin', 'user');

-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create allowed email domains table
CREATE TABLE public.client_email_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, domain)
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_email_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- Create function to get user's client_id
CREATE OR REPLACE FUNCTION public.get_user_client_id(user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT client_id FROM public.profiles WHERE id = user_id;
$$;

-- RLS Policies for clients table
CREATE POLICY "Super admins can manage all clients" 
ON public.clients 
FOR ALL 
TO authenticated 
USING (public.get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Client admins and users can view their client" 
ON public.clients 
FOR SELECT 
TO authenticated 
USING (id = public.get_user_client_id(auth.uid()));

-- RLS Policies for client_email_domains table
CREATE POLICY "Super admins can manage all email domains" 
ON public.client_email_domains 
FOR ALL 
TO authenticated 
USING (public.get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Client admins can manage their client's email domains" 
ON public.client_email_domains 
FOR ALL 
TO authenticated 
USING (
  client_id = public.get_user_client_id(auth.uid()) 
  AND public.get_user_role(auth.uid()) = 'client_admin'
);

-- RLS Policies for profiles table
CREATE POLICY "Super admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (public.get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Client admins can view profiles in their client" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (
  client_id = public.get_user_client_id(auth.uid()) 
  AND public.get_user_role(auth.uid()) = 'client_admin'
);

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (id = auth.uid());

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
  user_domain TEXT;
  matching_client_id UUID;
BEGIN
  -- Get email from the new user
  user_email := NEW.email;
  user_domain := split_part(user_email, '@', 2);
  
  -- Find client that allows this email domain
  SELECT client_id INTO matching_client_id
  FROM public.client_email_domains 
  WHERE domain = user_domain
  LIMIT 1;
  
  -- If no matching client found, prevent signup
  IF matching_client_id IS NULL THEN
    RAISE EXCEPTION 'Email domain % is not registered for any client', user_domain;
  END IF;
  
  -- Insert profile with the matching client
  INSERT INTO public.profiles (id, client_id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    matching_client_id,
    user_email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    'user'
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial super admin client and domain (for super admin access)
INSERT INTO public.clients (name, slug) VALUES ('System Admin', 'system-admin');

-- Get the system admin client ID for the email domain
DO $$
DECLARE
  system_client_id UUID;
BEGIN
  SELECT id INTO system_client_id FROM public.clients WHERE slug = 'system-admin';
  INSERT INTO public.client_email_domains (client_id, domain) VALUES (system_client_id, 'admin.com');
END $$;