-- ============================================================
-- PASTE THIS ENTIRE BLOCK INTO SUPABASE SQL EDITOR AND CLICK RUN
-- https://supabase.com/dashboard/project/xajtfbgozutlxhflpnim/sql/new
-- ============================================================

-- 1. Make sure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Grant table access to authenticated and anon roles
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT ON public.profiles TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;

-- 3. Drop all existing profile policies (clean slate)
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;

-- 4. Recreate policies
CREATE POLICY "Allow public read access to profiles" ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow users to insert their own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Allow users to update their own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- 5. Fix the trigger to use metadata from signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'participant'),
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create the missing profile for user 62559a81-fb66-4937-adf8-daad3c440e92
-- (this user exists in auth.users but has no profiles row)
INSERT INTO public.profiles (id, email, name, role, status)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1), 'User'),
  COALESCE(u.raw_user_meta_data->>'role', 'participant'),
  'active'
FROM auth.users u
WHERE u.id = '62559a81-fb66-4937-adf8-daad3c440e92'
ON CONFLICT (id) DO NOTHING;

-- 7. Also backfill ALL auth users who are missing a profile row
INSERT INTO public.profiles (id, email, name, role, status)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1), 'User'),
  COALESCE(u.raw_user_meta_data->>'role', 'participant'),
  'active'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- Done! All users now have profile rows, RLS policies are correct,
-- and the trigger will handle future signups automatically.
