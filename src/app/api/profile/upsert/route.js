import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '../../../../utils/supabase/server';

/**
 * POST /api/profile/upsert
 *
 * Creates or updates the authenticated user's profile row in the `profiles` table.
 * Runs SERVER-SIDE with cookie-based auth — auth.uid() is always correctly
 * populated in RLS policies, with no client-side session timing issues.
 *
 * Body: { name?, role?, provider?, termsAccepted?, termsAcceptedAt?, phoneNumber? }
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Verify the user is authenticated via their session cookie
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    const uid = user.id;
    const email = String(user.email || body.email || '').trim().toLowerCase();
    const name = String(body.name || user.user_metadata?.name || email.split('@')[0] || 'User').trim();
    const role = body.role || user.user_metadata?.role || 'participant';
    const provider = body.provider || user.app_metadata?.provider || 'email';
    // Pick up Google profile picture from the body or directly from user_metadata
    const avatar = body.avatar || user.user_metadata?.avatar_url || user.user_metadata?.picture || undefined;

    const updates = {
      email,
      name,
      role,
      provider,
      ...(avatar !== undefined && { avatar }),
      ...(body.phoneNumber !== undefined && { phone_number: String(body.phoneNumber || '').trim() }),
      ...(body.termsAccepted !== undefined && { terms_accepted: Boolean(body.termsAccepted) }),
      ...(body.termsAcceptedAt !== undefined && { terms_accepted_at: body.termsAcceptedAt }),
      // Host onboarding fields
      ...(body.organisationName !== undefined && { organisation_name: String(body.organisationName || '').trim() }),
      ...(body.hostCategory !== undefined && { host_category: String(body.hostCategory || '').trim() }),
      ...(body.hostType !== undefined && { host_type: String(body.hostType || '').trim() }),
      ...(body.orgLogo !== undefined && { org_logo: body.orgLogo }),
      ...(body.website !== undefined && { website: String(body.website || '').trim() }),
      ...(body.linkedin !== undefined && { linkedin: String(body.linkedin || '').trim() }),
      ...(body.country !== undefined && { country: String(body.country || '').trim() }),
      ...(body.state !== undefined && { state: String(body.state || '').trim() }),
      ...(body.city !== undefined && { city: String(body.city || '').trim() }),
      ...(body.hostOnboardingCompleted !== undefined && { host_onboarding_completed: Boolean(body.hostOnboardingCompleted) }),
      updated_at: new Date().toISOString(),
    };

    // Step 1: Try UPDATE (trigger likely already created the row on signup)
    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', uid)
      .select()
      .maybeSingle();

    if (!updateError && updated) {
      return NextResponse.json({ profile: updated });
    }

    // Step 2: Row doesn't exist yet — INSERT it
    const { data: inserted, error: insertError } = await supabase
      .from('profiles')
      .insert({ id: uid, ...updates })
      .select()
      .single();

    if (!insertError && inserted) {
      return NextResponse.json({ profile: inserted });
    }

    // Step 3: Read whatever the trigger may have created
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ profile: existing });
    }

    console.error('[/api/profile/upsert] All write paths failed:', insertError?.message);
    return NextResponse.json(
      { error: insertError?.message || 'Failed to create profile' },
      { status: 500 }
    );
  } catch (err) {
    console.error('[/api/profile/upsert] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
