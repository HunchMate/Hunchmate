-- ==========================================
-- FIX: Profile RLS and Trigger
-- ==========================================
-- Problem: The handle_new_user trigger inserts a profile with role='participant'
-- but ignores raw_user_meta_data role. Then the client tries to upsert (UPDATE+INSERT)
-- which fails because:
--   1. UPDATE returns no data (profile may not exist yet due to timing)
--   2. INSERT fails because the trigger already created it (duplicate key)
-- Solution:
--   1. Update trigger to respect role from user metadata
--   2. Add a policy allowing users to upsert their own profile row

-- Step 1: Update the trigger function to use role from user metadata
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
  ON CONFLICT (id) DO NOTHING; -- Do not overwrite if somehow already exists
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop and recreate INSERT policy to allow upsert (conflict handling)
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON public.profiles;

CREATE POLICY "Allow users to insert their own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- Step 3: Ensure UPDATE policy also lets users update themselves
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;

CREATE POLICY "Allow users to update their own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);
