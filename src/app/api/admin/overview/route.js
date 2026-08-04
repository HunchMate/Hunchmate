import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createClient } from '../../../../utils/supabase/server';

/**
 * GET /api/admin/overview
 *
 * Returns admin dashboard overview data using the service role key to bypass RLS.
 * Verifies the caller is an admin before returning data.
 *
 * Returns: { metrics, recentUsers, recentEvents }
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

    // Egress-efficient queries: use HEAD counts for metrics, fetch only needed
    // columns for display rows, instead of dumping entire tables.
    const [
      totalUsersRes,
      totalEventsRes,
      totalRegsRes,
      totalCheckInsRes,
      suspendedRes,
      openComplaintsRes,
      roleDataRes,
      recentUsersRes,
      recentEventsRes,
      logsRes,
    ] = await Promise.all([
      // Count-only queries (no rows transferred — just the count header)
      adminClient.from('profiles').select('*', { count: 'exact', head: true }),
      adminClient.from('events').select('*', { count: 'exact', head: true }),
      adminClient.from('registrations').select('*', { count: 'exact', head: true }),
      adminClient.from('registrations').select('*', { count: 'exact', head: true }).eq('checked_in', true),
      adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'suspended'),
      adminClient.from('complaints').select('*', { count: 'exact', head: true }).neq('status', 'resolved'),
      // Role breakdown: only the role column (not full rows)
      adminClient.from('profiles').select('role'),
      // Recent items: specific display columns only, limited to 5
      adminClient.from('profiles').select('id, name, email, role, status, avatar_url, created_at').order('created_at', { ascending: false }).limit(5),
      adminClient.from('events').select('id, title, status, category, mode, created_at, organizer').order('created_at', { ascending: false }).limit(5),
      // Audit logs already limited
      adminClient.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);

    const logs = logsRes.data || [];

    const roleCounts = (roleDataRes.data || []).reduce((acc, u) => {
      const role = u.role || 'participant';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, { participant: 0, organizer: 0, admin: 0 });

    const metrics = {
      totalUsers: totalUsersRes.count || 0,
      totalEvents: totalEventsRes.count || 0,
      totalRegistrations: totalRegsRes.count || 0,
      totalCheckIns: totalCheckInsRes.count || 0,
      activeSessions: 0,
      suspendedUsers: suspendedRes.count || 0,
      roleCounts,
      openComplaints: openComplaintsRes.count || 0,
    };

    return NextResponse.json({
      metrics,
      recentUsers: recentUsersRes.data || [],
      recentEvents: recentEventsRes.data || [],
      logs,
    });
  } catch (err) {
    console.error('[admin/overview] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
