UPDATE auth.users
SET
  email_confirmed_at = now()
WHERE email = 'dhernandez@wundertec.com'
  AND email_confirmed_at IS NULL;