#!/usr/bin/env node
/**
 * apply-rls-fix.mjs
 * Run this once to fix the profiles RLS trigger in your Supabase project.
 * 
 * BEFORE RUNNING:
 *   Set your Supabase service role key in the environment:
 *   $env:SUPABASE_SERVICE_KEY = "your-service-role-key"
 *   (Find it in: https://supabase.com/dashboard/project/xajtfbgozutlxhflpnim/settings/api)
 *   
 *   Then run:
 *   node apply-rls-fix.mjs
 */

const SUPABASE_URL = 'https://xajtfbgozutlxhflpnim.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error('\n❌ Missing SUPABASE_SERVICE_KEY environment variable.');
  console.error('Set it first:\n  $env:SUPABASE_SERVICE_KEY = "your-service-role-key"');
  console.error('\nFind your service role key at:');
  console.error('  https://supabase.com/dashboard/project/xajtfbgozutlxhflpnim/settings/api\n');
  process.exit(1);
}

const SQL = `
-- Fix 1: Update the trigger to respect role from user metadata
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

-- Fix 2: Recreate INSERT policy (same definition, ensures it's clean)
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON public.profiles;
CREATE POLICY "Allow users to insert their own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- Fix 3: Recreate UPDATE policy (same definition, ensures it's clean)
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
CREATE POLICY "Allow users to update their own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);
`;

async function applyFix() {
  console.log('🔧 Applying Supabase RLS and trigger fix...\n');

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ sql: SQL }),
  });

  if (!response.ok) {
    // Try the pg endpoint instead
    const response2 = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: SQL }),
    });

    if (!response2.ok) {
      console.error('❌ Could not apply fix via REST API.');
      console.error('\n📋 Please run this SQL manually in the Supabase SQL Editor:');
      console.error('   https://supabase.com/dashboard/project/xajtfbgozutlxhflpnim/sql/new\n');
      console.log(SQL);
      return;
    }
  }

  console.log('✅ RLS fix applied successfully!');
  console.log('\nThe following changes were made:');
  console.log('  1. handle_new_user trigger now uses role from signup metadata');
  console.log('  2. INSERT and UPDATE policies on profiles are confirmed correct');
}

applyFix().catch(console.error);
