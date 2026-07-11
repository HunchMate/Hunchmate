import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (serviceKey && supabaseUrl) {
    return createServiceClient(supabaseUrl, serviceKey);
  }
  return null;
}

/**
 * POST /api/invitations/accept
 * Accept a team invitation: update its status, create a registration, update event count.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { inviteId, userId } = body;

    if (!inviteId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing inviteId or userId' },
        { status: 400 }
      );
    }

    const adminClient = getAdminClient();
    const cookieStore = await cookies();
    const client = adminClient || createClient(cookieStore);

    // Fetch the invitation
    const { data: invite, error: fetchError } = await client
      .from('team_invitations')
      .select('*')
      .eq('id', inviteId)
      .maybeSingle();

    if (fetchError || !invite) {
      return NextResponse.json(
        { success: false, error: 'Invitation not found or expired.' },
        { status: 404 }
      );
    }

    if (invite.status === 'accepted') {
      return NextResponse.json({
        success: true,
        accepted: true,
        alreadyAccepted: true,
      });
    }

    // Fetch the user profile
    const { data: userProfile } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!userProfile) {
      return NextResponse.json(
        { success: false, error: 'Please sign in to accept this invitation.' },
        { status: 401 }
      );
    }

    // Verify email matches
    const userEmail = String(userProfile.email || '').trim().toLowerCase();
    const inviteEmail = String(invite.invitee_email || '').trim().toLowerCase();
    if (userEmail !== inviteEmail) {
      return NextResponse.json(
        { success: false, error: 'This invitation belongs to another email address.' },
        { status: 403 }
      );
    }

    // Check if event exists
    const { data: event } = await client
      .from('events')
      .select('*')
      .eq('id', invite.event_id)
      .maybeSingle();

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'This event is no longer available.' },
        { status: 404 }
      );
    }

    // Check if already registered
    const { data: existingReg } = await client
      .from('registrations')
      .select('id')
      .eq('event_id', invite.event_id)
      .eq('user_id', userId)
      .maybeSingle();

    let registrationCreated = null;

    if (!existingReg) {
      // Find leader's registration to get team info
      const { data: leaderReg } = await client
        .from('registrations')
        .select('*')
        .eq('event_id', invite.event_id)
        .eq('user_id', invite.inviter_id)
        .maybeSingle();

      const teamId = leaderReg?.team_id || `team-${Date.now()}`;
      const teamName = invite.team_name || leaderReg?.team_name || null;

      // Create new registration for the invitee
      const newReg = {
        event_id: invite.event_id,
        user_id: userId,
        team_lead_id: leaderReg?.team_lead_id || leaderReg?.user_id || invite.inviter_id,
        team_id: teamId,
        team_name: teamName,
        members: [userProfile.name || userProfile.email],
        participant: {
          id: userId,
          name: userProfile.name || '',
          email: userProfile.email || '',
        },
        payment_status: leaderReg?.payment_status || 'not-paid',
        qr_token: leaderReg?.qr_token || `qr-${Date.now()}`,
        checked_in: false,
        checked_in_at: null,
        parent_registration_id: leaderReg?.id || null,
        joined_via_invite_id: invite.id,
        created_at: new Date().toISOString(),
      };

      const { data: insertedReg, error: regError } = await client
        .from('registrations')
        .insert(newReg)
        .select()
        .single();

      if (regError) {
        return NextResponse.json(
          { success: false, error: `Failed to create registration: ${regError.message}` },
          { status: 500 }
        );
      }

      registrationCreated = insertedReg;

      // Update event registered count
      await client
        .from('events')
        .update({ registered_count: (event.registered_count || 0) + 1 })
        .eq('id', invite.event_id);

      // Add member to leader's members array if leader exists
      if (leaderReg) {
        const leaderMembers = Array.isArray(leaderReg.members) ? leaderReg.members : [];
        const memberName = userProfile.name || userProfile.email;
        if (!leaderMembers.includes(memberName)) {
          await client
            .from('registrations')
            .update({ members: [...leaderMembers, memberName] })
            .eq('id', leaderReg.id);
        }
      }
    }

    // Mark invitation as accepted
    const { error: updateError } = await client
      .from('team_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by_user_id: userId,
        invitee_user_id: userId,
      })
      .eq('id', inviteId);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: `Failed to update invitation: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      accepted: true,
      registrationCreated: registrationCreated || null,
      alreadyRegistered: Boolean(existingReg),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
