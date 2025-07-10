-- Restore the handle_new_user trigger for company admin creation
-- This handles automatic profile creation for company admins (first users of a domain)
-- while invitation-based signup handles their own profile creation

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
  user_domain TEXT;
  matching_client_id UUID;
  new_client_id UUID;
  domain_exists BOOLEAN;
  company_name TEXT;
  default_area_id UUID;
BEGIN
  -- Get email from the new user
  user_email := NEW.email;
  user_domain := split_part(user_email, '@', 2);
  
  -- Check if this domain already exists
  SELECT client_id INTO matching_client_id
  FROM public.client_email_domains 
  WHERE domain = user_domain
  LIMIT 1;
  
  -- If domain exists, this should be handled by invitation signup
  -- Only create profile if it's a new domain (company admin)
  IF matching_client_id IS NULL THEN
    -- Check if user provided company name in metadata
    company_name := NEW.raw_user_meta_data ->> 'company_name';
    
    -- If no company name provided, generate one from domain
    IF company_name IS NULL OR company_name = '' THEN
      company_name := split_part(user_domain, '.', 1);
      company_name := initcap(company_name) || ' Inc.';
    END IF;
    
    -- Create new client
    INSERT INTO public.clients (name, slug)
    VALUES (
      company_name,
      lower(replace(split_part(user_domain, '.', 1), ' ', '-'))
    )
    RETURNING id INTO new_client_id;
    
    -- Create email domain entry
    INSERT INTO public.client_email_domains (client_id, domain)
    VALUES (new_client_id, user_domain);
    
    -- Create profile as client admin (first user for this domain)
    INSERT INTO public.profiles (id, client_id, area_id, email, first_name, last_name, role)
    VALUES (
      NEW.id,
      new_client_id,
      NULL, -- Client admins don't have area assignments
      user_email,
      NEW.raw_user_meta_data ->> 'first_name',
      NEW.raw_user_meta_data ->> 'last_name',
      'client_admin'
    );
  END IF;
  
  RETURN NEW;
END;
$$;