import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createClient } from '../../../../utils/supabase/server';

/**
 * GET /api/admin/events
 *
 * Returns paginated events using the service role key to bypass RLS.
 * Verifies the caller is an admin before returning data.
 *
 * Query params: status, search, limit
 */
export async function GET(request) {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
    }

    // Verify the caller is authenticated and is an admin
    const cookieStore = await cookies();
    const userClient = createClient(cookieStore);
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const adminClient = createServiceClient(supabaseUrl, serviceKey);

    // Verify caller is admin
    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!callerProfile || callerProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: admin role required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const limit = Math.min(Number(searchParams.get('limit') || 40), 200);

    let query = adminClient.from('events').select('*', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (search) query = query.ilike('title', `%${search}%`);

    query = query.order('created_at', { ascending: false }).limit(limit);

    const { data, count, error } = await query;

    if (error) {
      console.error('[admin/events] query error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      events: data || [],
      total: count || 0,
    });
  } catch (err) {
    console.error('[admin/events] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
