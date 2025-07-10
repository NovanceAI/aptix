-- Drop the existing trigger and function to recreate with new logic
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function that handles client creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  user_email TEXT;
  user_domain TEXT;
  matching_client_id UUID;
  new_client_id UUID;
  domain_exists BOOLEAN;
  company_name TEXT;
BEGIN
  -- Get email from the new user
  user_email := NEW.email;
  user_domain := split_part(user_email, '@', 2);
  
  -- Check if this domain already exists
  SELECT client_id INTO matching_client_id
  FROM public.client_email_domains 
  WHERE domain = user_domain
  LIMIT 1;
  
  -- If domain exists, assign user to existing client
  IF matching_client_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, client_id, email, first_name, last_name, role)
    VALUES (
      NEW.id,
      matching_client_id,
      user_email,
      NEW.raw_user_meta_data ->> 'first_name',
      NEW.raw_user_meta_data ->> 'last_name',
      'user'
    );
  ELSE
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
    INSERT INTO public.profiles (id, client_id, email, first_name, last_name, role)
    VALUES (
      NEW.id,
      new_client_id,
      user_email,
      NEW.raw_user_meta_data ->> 'first_name',
      NEW.raw_user_meta_data ->> 'last_name',
      'client_admin'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();