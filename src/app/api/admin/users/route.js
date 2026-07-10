import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createClient } from '../../../../utils/supabase/server';

/**
 * GET /api/admin/users
 *
 * Returns paginated user profiles using the service role key to bypass RLS.
 * Verifies the caller is an admin before returning data.
 *
 * Query params: role, status, search, limit
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
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const limit = Math.min(Number(searchParams.get('limit') || 40), 200);

    let query = adminClient.from('profiles').select('*', { count: 'exact' });

    if (role) query = query.eq('role', role);
    if (status) query = query.eq('status', status);
    if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);

    query = query.order('created_at', { ascending: false }).limit(limit);

    const { data, count, error } = await query;

    if (error) {
      console.error('[admin/users] query error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      users: data || [],
      total: count || 0,
    });
  } catch (err) {
    console.error('[admin/users] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
