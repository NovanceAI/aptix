-- Update the user role to super_admin for dhernandez@admin.com
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = 'dhernandez@admin.com';