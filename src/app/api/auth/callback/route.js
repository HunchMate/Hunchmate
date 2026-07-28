import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * GET /api/auth/callback
 *
 * Supabase OAuth callback handler (PKCE flow).
 * After Google authenticates the user, Supabase redirects here with `?code=`.
 * We exchange the code for a session, set the session cookies on the redirect
 * response, then send the user to onboarding or their dashboard.
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error');

  if (errorParam) {
    console.error('[/api/auth/callback] OAuth error from provider:', errorParam, searchParams.get('error_description'));
    return NextResponse.redirect(`${origin}/login?error=oauth_provider_error`);
  }

  if (!code) {
    console.error('[/api/auth/callback] No code in callback URL');
    return NextResponse.redirect(`${origin}/login?error=oauth_missing_code`);
  }

  const cookieStore = await cookies();

  // Collect cookies that Supabase sets during exchangeCodeForSession so we
  // can manually apply them to the redirect response.
  const pendingCookies = [];

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        pendingCookies.push(...cookiesToSet);
        cookiesToSet.forEach(({ name, value, options }) => {
          try { cookieStore.set(name, value, options); } catch { /* ignore server component restriction */ }
        });
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data?.session) {
    console.error('[/api/auth/callback] exchangeCodeForSession failed:', error?.message);
    const res = NextResponse.redirect(`${origin}/login?error=oauth_failed`);
    pendingCookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
    return res;
  }

  // ── Determine where to send the user ──────────────────────────────────────
  let redirectPath = '/onboarding'; // safe default for new users

  const signupRole = searchParams.get('signup_role')
    || searchParams.get('role')
    || cookieStore.get('hm_google_signup_role')?.value
    || cookieStore.get('sb-hm-google-signup-role')?.value;

  try {
    const adminClient = serviceKey ? createServiceClient(supabaseUrl, serviceKey) : supabase;
    const userEmail = data.session?.user?.email;
    let profile = null;

    if (userEmail) {
      const { data: pByEmail } = await adminClient
        .from('profiles')
        .select('id, role, onboarding_completed, host_onboarding_completed')
        .eq('email', userEmail)
        .maybeSingle();
      profile = pByEmail;
    }

    if (!profile && data.session?.user?.id) {
      const { data: pById } = await adminClient
        .from('profiles')
        .select('id, role, onboarding_completed, host_onboarding_completed')
        .eq('id', data.session.user.id)
        .maybeSingle();
      profile = pById;
    }

    if (profile) {
      if (signupRole && profile.role !== signupRole) {
        await adminClient
          .from('profiles')
          .update({ role: signupRole, updated_at: new Date().toISOString() })
          .eq('id', profile.id);
        profile.role = signupRole;
      }
    } else if (data.session?.user) {
      // Create new profile row immediately using service role key
      const newRole = signupRole || 'participant';
      const userName = data.session.user.user_metadata?.name || userEmail?.split('@')[0] || 'User';
      const { data: createdProfile } = await adminClient
        .from('profiles')
        .insert({
          id: data.session.user.id,
          email: userEmail,
          name: userName,
          role: newRole,
          status: 'active',
          onboarding_completed: false,
          host_onboarding_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id, role, onboarding_completed, host_onboarding_completed')
        .maybeSingle();
      if (createdProfile) {
        profile = createdProfile;
      }
    }

    if (profile) {
      const role = profile.role || signupRole || 'participant';
      if (role === 'admin') {
        redirectPath = '/admin/dashboard';
      } else if (role === 'organizer' || role === 'host') {
        redirectPath = profile.host_onboarding_completed ? '/organizer/dashboard' : '/host-onboarding';
      } else {
        redirectPath = profile.onboarding_completed ? '/events' : '/onboarding';
      }
    } else {
      const isHost = signupRole === 'organizer' || signupRole === 'host';
      redirectPath = isHost ? '/host-onboarding' : '/onboarding';
    }
  } catch (profileErr) {
    console.warn('[/api/auth/callback] Profile lookup failed:', profileErr?.message);
    const isHost = signupRole === 'organizer' || signupRole === 'host';
    redirectPath = isHost ? '/host-onboarding' : '/onboarding';
  }

  // ── Build the redirect response and attach all session cookies ────────────
  const response = NextResponse.redirect(`${origin}${redirectPath}`);
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}
