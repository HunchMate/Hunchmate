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
 * GET /api/invitations?id=inv-xxx
 * Fetch a single invitation by ID. Public access (no auth required)
 * so that unauthenticated visitors can view the join page.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const inviteId = searchParams.get('id');

    if (!inviteId) {
      return NextResponse.json(
        { success: false, error: 'Missing invitation id' },
        { status: 400 }
      );
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      const cookieStore = await cookies();
      const supabase = createClient(cookieStore);
      const { data, error } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('id', inviteId)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, invitation: data || null });
    }

    const { data, error } = await adminClient
      .from('team_invitations')
      .select('*')
      .eq('id', inviteId)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, invitation: data || null });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invitations
 * Create a new team invitation in Supabase.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      id,
      eventId,
      inviterId,
      inviterName,
      teamName,
      inviteeEmail,
      inviteeUserId,
    } = body;

    if (!id || !eventId || !inviteeEmail) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: id, eventId, inviteeEmail' },
        { status: 400 }
      );
    }

    const adminClient = getAdminClient();
    const cookieStore = await cookies();
    const client = adminClient || createClient(cookieStore);

    // Check for duplicate pending invitation
    const { data: existing } = await client
      .from('team_invitations')
      .select('*')
      .eq('event_id', eventId)
      .ilike('invitee_email', inviteeEmail)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        existed: true,
        invitation: existing,
      });
    }

    const { data, error } = await client
      .from('team_invitations')
      .insert({
        id,
        event_id: eventId,
        inviter_id: inviterId || null,
        inviter_name: inviterName || null,
        team_name: teamName || null,
        invitee_email: inviteeEmail,
        invitee_user_id: inviteeUserId || null,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, existed: false, invitation: data });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
