import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupAdmin() {
  const email = 'admin@hunchmate.com';
  const password = 'adminpassword123';

  console.log(`Checking for user: ${email}`);

  // Try to find the user
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing users:', listError.message);
    return;
  }

  const existingUser = users.find(u => u.email === email);

  if (existingUser) {
    console.log('User exists. Resetting password...');
    const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password: password,
      user_metadata: { role: 'admin' },
      email_confirm: true
    });
    if (error) {
      console.error('Error updating user:', error.message);
    } else {
      console.log('Successfully reset password for existing admin.');
      console.log(`Login: ${email}`);
      console.log(`Password: ${password}`);
    }
  } else {
    console.log('User does not exist. Creating...');
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { role: 'admin' }
    });
    
    if (error) {
      console.error('Error creating user:', error.message);
    } else {
      console.log('Successfully created admin user.');
      console.log(`Login: ${email}`);
      console.log(`Password: ${password}`);
    }
  }
}

setupAdmin();
