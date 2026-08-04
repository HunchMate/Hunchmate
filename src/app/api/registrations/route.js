import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

/**
 * GET /api/registrations
 *
 * Fetches registrations using the service role key to bypass RLS.
 * This is needed so organizers can see ALL registrations for their events,
 * not just their own rows (which the anon client would restrict via RLS).
 *
 * Query params:
 *  - event_id (string, optional) — filter by a specific event
 *  - user_id  (string, optional) — filter by a specific user
 */
export async function GET(request) {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
    }

    const adminClient = createServiceClient(supabaseUrl, serviceKey);
    const { searchParams } = new URL(request.url);

    const eventId = (searchParams.get('event_id') || '').trim();
    const userId = (searchParams.get('user_id') || '').trim();
    const organizerId = (searchParams.get('organizer_id') || '').trim();

    let query = adminClient
      .from('registrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (organizerId) {
      // Organizer filter: find all events owned by this organizer, then filter
      // registrations to only those events — avoids downloading unrelated rows.
      const { data: orgEvents, error: orgEventsError } = await adminClient
        .from('events')
        .select('id')
        .eq('organizer->>id', organizerId);

      if (orgEventsError) {
        console.error('[/api/registrations] Error fetching organizer events:', orgEventsError);
        return NextResponse.json({ error: orgEventsError.message }, { status: 500 });
      }

      const orgEventIds = (orgEvents || []).map((e) => e.id);

      if (orgEventIds.length === 0) {
        // Organizer has no events yet — return empty immediately
        return NextResponse.json({ registrations: [] });
      }

      query = query.in('event_id', orgEventIds);
    } else if (eventId) {
      query = query.eq('event_id', eventId);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[/api/registrations] Error fetching registrations:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ registrations: data || [] });
  } catch (err) {
    console.error('[/api/registrations] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
