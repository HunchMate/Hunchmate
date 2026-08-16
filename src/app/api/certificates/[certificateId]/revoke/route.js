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
 * POST /api/certificates/:certificateId/revoke
 * Body: { status: 'active' | 'revoked', reason?: string }
 * Protected: Admin or Organizer only
 */
export async function POST(request, { params }) {
  try {
    const rbac = await verifyRole(['admin', 'organizer']);
    if (!rbac.authorized) return rbac.errorResponse;

    const { certificateId } = await params;
    const body = await request.json();
    const { status = 'revoked', reason = '' } = body;

    if (!['active', 'revoked'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status value. Must be "active" or "revoked"' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    const { data: cert, error: fetchErr } = await adminClient
      .from('certificates')
      .select('*')
      .eq('id', certificateId)
      .single();

    if (fetchErr || !cert) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    const updatedTemplateData = {
      ...(cert.template_data || {}),
      revocationReason: reason,
      updatedBy: rbac.profile?.email || 'admin',
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await adminClient
      .from('certificates')
      .update({
        status,
        template_data: updatedTemplateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', certificateId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit log entry
    await adminClient.from('admin_audit_logs').insert({
      actor_id: rbac.user?.id || 'admin',
      action: `CERTIFICATE_${status.toUpperCase()}`,
      target_type: 'certificate',
      target_id: certificateId,
      metadata: { reason },
    });

    return NextResponse.json({ success: true, certificate: data });
  } catch (err) {
    console.error('[POST /api/certificates/:id/revoke] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
