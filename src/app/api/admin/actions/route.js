import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '../../../../utils/supabase/server';

/**
 * POST /api/admin/actions
 *
 * Server-side admin action handler that uses the service role key to bypass RLS.
 * Verifies the caller is an admin before performing any action.
 *
 * Body: { action, targetId, payload }
 *
 * Supported actions:
 *  - update-user-role: { targetId: userId, payload: { role } }
 *  - update-user-status: { targetId: userId, payload: { status } }
 *  - update-event-status: { targetId: eventId, payload: { status } }
 */
export async function POST(request) {
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

    // Use the service role client to check the caller's role
    const adminClient = createServiceClient(supabaseUrl, serviceKey);

    const { data: callerProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !callerProfile || callerProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: admin role required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, targetId, payload } = body;

    if (!action || !targetId) {
      return NextResponse.json({ error: 'Missing action or targetId' }, { status: 400 });
    }

    // ── Handle actions ──
    if (action === 'update-user-role') {
      const { role } = payload || {};
      if (!role || !['participant', 'organizer', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }

      const { error: updateError } = await adminClient
        .from('profiles')
        .update({ role })
        .eq('id', targetId);

      if (updateError) {
        console.error('[admin/actions] update-user-role error:', updateError.message);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Log the action
      await adminClient.from('admin_audit_logs').insert({
        action: 'user-role-updated',
        actor_id: String(user.id),
        target_type: 'user',
        target_id: String(targetId),
        metadata: { role },
      });

      return NextResponse.json({ success: true, action: 'update-user-role', targetId, role });
    }

    if (action === 'update-user-status') {
      const { status } = payload || {};
      if (!status || !['active', 'suspended'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }

      const { error: updateError } = await adminClient
        .from('profiles')
        .update({ status })
        .eq('id', targetId);

      if (updateError) {
        console.error('[admin/actions] update-user-status error:', updateError.message);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Log the action
      await adminClient.from('admin_audit_logs').insert({
        action: 'user-status-updated',
        actor_id: String(user.id),
        target_type: 'user',
        target_id: String(targetId),
        metadata: { status },
      });

      return NextResponse.json({ success: true, action: 'update-user-status', targetId, status });
    }

    if (action === 'update-event-status') {
      const { status } = payload || {};
      if (!status) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }

      const { error: updateError } = await adminClient
        .from('events')
        .update({ status })
        .eq('id', targetId);

      if (updateError) {
        console.error('[admin/actions] update-event-status error:', updateError.message);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Log the action
      await adminClient.from('admin_audit_logs').insert({
        action: 'event-status-updated',
        actor_id: String(user.id),
        target_type: 'event',
        target_id: String(targetId),
        metadata: { status },
      });

      return NextResponse.json({ success: true, action: 'update-event-status', targetId, status });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    console.error('[admin/actions] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
