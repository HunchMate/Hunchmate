import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

/**
 * GET /api/events
 *
 * Fetches events using the service role key to bypass RLS.
 * Supports server-side pagination, search, category, and status filtering.
 *
 * Query params:
 *  - page (number, default 1)
 *  - limit (number, default 16, max 100)
 *  - search (string, optional)
 *  - category (string, optional)
 *  - status (string, optional — e.g. 'open', 'ongoing')
 *  - mode (string, optional — e.g. 'Online', 'Offline', 'Hybrid')
 *  - all (boolean, if 'true' returns all events without pagination — for backwards compat)
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

    // If `all=true`, return all events (backwards compat for EventContext bulk sync)
    const fetchAll = searchParams.get('all') === 'true';

    if (fetchAll) {
      const { data, error } = await adminClient
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[/api/events] Error fetching all events:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ events: data || [] });
    }

    // Paginated query
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '16', 10)));
    const search = (searchParams.get('search') || '').trim();
    const category = (searchParams.get('category') || '').trim();
    const status = (searchParams.get('status') || '').trim();
    const mode = (searchParams.get('mode') || '').trim();

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = adminClient
      .from('events')
      .select('*', { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (mode) {
      query = query.eq('mode', mode);
    }

    // Only show published/open events for the explore page (exclude drafts)
    // unless a specific status filter was applied
    if (!status) {
      query = query.neq('status', 'draft');
    }

    query = query
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error('[/api/events] Error fetching events:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      events: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: (from + limit) < (count || 0),
      },
    });
  } catch (err) {
    console.error('[/api/events] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
