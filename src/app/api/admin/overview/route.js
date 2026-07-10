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

    // Fetch all data with service role (bypasses RLS)
    const [profilesRes, eventsRes, regsRes, complaintsRes, logsRes] = await Promise.all([
      adminClient.from('profiles').select('*').order('created_at', { ascending: false }),
      adminClient.from('events').select('*').order('created_at', { ascending: false }),
      adminClient.from('registrations').select('*'),
      adminClient.from('complaints').select('*'),
      adminClient.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);

    const users = profilesRes.data || [];
    const events = eventsRes.data || [];
    const registrations = regsRes.data || [];
    const complaints = complaintsRes.data || [];
    const logs = logsRes.data || [];

    const roleCounts = users.reduce((acc, u) => {
      const role = u.role || 'participant';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, { participant: 0, organizer: 0, admin: 0 });

    const metrics = {
      totalUsers: users.length,
      totalEvents: events.length,
      totalRegistrations: registrations.length,
      totalCheckIns: registrations.filter((r) => r.checked_in).length,
      activeSessions: 0,
      suspendedUsers: users.filter((u) => u.status === 'suspended').length,
      roleCounts,
      openComplaints: complaints.filter((c) => c.status !== 'resolved').length,
    };

    return NextResponse.json({
      metrics,
      recentUsers: users.slice(0, 5),
      recentEvents: events.slice(0, 5),
      logs,
    });
  } catch (err) {
    console.error('[admin/overview] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
