-- Add foreign key constraint between area_permissions.user_id and profiles.id
ALTER TABLE public.area_permissions 
ADD CONSTRAINT area_permissions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;