import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkUpdate() {
  // Try to find a user
  const { data: users } = await supabase.from('profiles').select('id, name').limit(1);
  if (!users || users.length === 0) {
    console.log('No users found.');
    return;
  }
  
  const user = users[0];
  console.log('Found user:', user);
  
  // Try to update with the same anon key (or service role)
  // Wait, if we use anon key, we need to act as that user, which we can't without their token.
  // We can just check the policies from pg_policies!
  const { data: policies, error } = await supabase.from('pg_policies').select('*').eq('tablename', 'profiles');
  if (error) {
    console.log('Cannot read pg_policies, probably no permissions.');
  } else {
    console.log('Policies:', policies);
  }
}

checkUpdate();
