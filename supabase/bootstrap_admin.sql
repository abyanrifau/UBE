-- =====================================================================
-- Bootstrap the first admin.
--
-- There is no public sign-up, so the very first account has to be made by
-- hand. Do this once, right after running 0001_init.sql.
--
--   1. Supabase Dashboard → Authentication → Users → "Add user"
--      · Email:    you@yourdomain.com
--      · Password: pick something temporary
--      · Tick "Auto Confirm User"
--
--   2. Edit the email below and run this whole file in the SQL editor.
--
--   3. Sign in at /login. You will be asked to choose a real password,
--      then you can create everyone else from Accounts.
-- =====================================================================

update public.profiles
set
  role              = 'admin',
  is_active         = true,
  full_name         = coalesce(nullif(full_name, ''), 'Academy Admin'),
  -- Leave this true to be walked through setting your own password on first
  -- login. Set it to false if you already chose the password in step 1.
  must_set_password = true
where email = 'CHANGE-ME@example.com';

-- Confirm it worked. You should get exactly one row back, role = admin.
select id, email, full_name, role, is_active, must_set_password
from public.profiles
where email = 'CHANGE-ME@example.com';
