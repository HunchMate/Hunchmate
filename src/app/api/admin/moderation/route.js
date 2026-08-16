import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { verifyRole } from '@/lib/rbac';

function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) throw new Error('Missing Supabase Service Key');
  return createServiceClient(supabaseUrl, serviceKey);
}

/**
 * GET /api/admin/moderation
 * Query params: ?type=join_requests|submissions|certificates &status=pending|approved|rejected|all &page=1 &limit=20
 */
export async function GET(request) {
  try {
    const rbac = await verifyRole(['admin', 'organizer']);
    if (!rbac.authorized) return rbac.errorResponse;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'submissions';
    const status = searchParams.get('status') || 'all';

    const adminClient = getAdminClient();

    if (type === 'join_requests') {
      let query = adminClient.from('team_invitations').select('*').order('created_at', { ascending: false });
      if (status !== 'all') {
        query = query.eq('status', status);
      }
      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ items: data || [] });
    }

    if (type === 'certificates') {
      let query = adminClient.from('certificates').select('*').order('created_at', { ascending: false });
      if (status === 'approved' || status === 'active') {
        query = query.eq('status', 'active');
      } else if (status === 'rejected' || status === 'revoked') {
        query = query.eq('status', 'revoked');
      }
      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ items: data || [] });
    }

    // Default: Project Submissions
    let query = adminClient.from('project_submissions').select('*').order('created_at', { ascending: false });
    if (status !== 'all') {
      query = query.eq('status', status);
    }
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ items: data || [] });
  } catch (err) {
    console.error('[GET /api/admin/moderation] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/moderation
 * Body: { type: 'join_requests'|'submissions'|'certificates', action: 'approve'|'reject'|'revoke'|'active', ids: string[], moderationNote?: string }
 * Protected: Admin or Organizer
 */
export async function POST(request) {
  try {
    const rbac = await verifyRole(['admin', 'organizer']);
    if (!rbac.authorized) return rbac.errorResponse;

    const body = await request.json();
    const { type = 'submissions', action, ids = [], moderationNote = '' } = body;

    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Action and non-empty array of item ids are required' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    let updatedCount = 0;

    if (type === 'submissions') {
      const targetStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'pending';
      const { data, error } = await adminClient
        .from('project_submissions')
        .update({
          status: targetStatus,
          moderation_note: moderationNote,
          updated_at: new Date().toISOString(),
        })
        .in('id', ids)
        .select();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      updatedCount = data?.length || 0;
    } else if (type === 'join_requests') {
      const targetStatus = action === 'approve' ? 'accepted' : action === 'reject' ? 'rejected' : 'pending';
      const { data, error } = await adminClient
        .from('team_invitations')
        .update({
          status: targetStatus,
        })
        .in('id', ids)
        .select();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      updatedCount = data?.length || 0;
    } else if (type === 'certificates') {
      const targetStatus = action === 'revoke' || action === 'reject' ? 'revoked' : 'active';
      const { data, error } = await adminClient
        .from('certificates')
        .update({
          status: targetStatus,
          updated_at: new Date().toISOString(),
        })
        .in('id', ids)
        .select();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      updatedCount = data?.length || 0;
    }

    // Insert Admin Audit Log
    await adminClient.from('admin_audit_logs').insert({
      actor_id: rbac.user?.id || 'admin',
      action: `BULK_${action.toUpperCase()}_${type.toUpperCase()}`,
      target_type: type,
      target_id: ids.join(','),
      metadata: { count: updatedCount, moderationNote },
    });

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `Successfully processed ${updatedCount} items (${action}).`,
    });
  } catch (err) {
    console.error('[POST /api/admin/moderation] Error:', err);
    return NextResponse.json({ error: 'Failed to process bulk moderation request' }, { status: 500 });
  }
}
