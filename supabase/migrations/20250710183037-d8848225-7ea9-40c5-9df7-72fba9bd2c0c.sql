-- Update the handle_new_user trigger to work with invitation system
-- This removes automatic profile creation since it will be handled by invitation signup

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- For new users, we'll let the invitation signup process handle profile creation
  -- This trigger will now just ensure auth user creation is successful
  RETURN NEW;
END;
$$;