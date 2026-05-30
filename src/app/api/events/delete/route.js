import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '../../../../utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

/**
 * POST /api/events/delete
 *
 * Deletes an event record server-side.
 * It first verifies user authentication and confirms the user is either:
 *  1. An admin user.
 *  2. The organizer who created the event (matching event.organizer.id).
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // 1. Verify user authentication via their session cookie
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const eventId = body.eventId;

    if (!eventId) {
      return NextResponse.json({ error: 'Missing eventId in request body' }, { status: 400 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const adminClient = createServiceClient(supabaseUrl, serviceKey);

    // 2. Fetch the event to check ownership
    const { data: event, error: fetchError } = await adminClient
      .from('events')
      .select('organizer')
      .eq('id', eventId)
      .maybeSingle();

    if (fetchError || !event) {
      return NextResponse.json({ error: 'Event not found or database error' }, { status: 404 });
    }

    // 3. Fetch user profile to check if they are an admin
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isOwner = event.organizer?.id === user.id;
    const isAdmin = profile?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized to delete this event' }, { status: 403 });
    }

    // 4. Perform deletion
    const { error: deleteError } = await adminClient
      .from('events')
      .delete()
      .eq('id', eventId);

    if (deleteError) {
      console.error('[/api/events/delete] Delete failed:', deleteError.message);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedEventId: eventId });
  } catch (err) {
    console.error('[/api/events/delete] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
