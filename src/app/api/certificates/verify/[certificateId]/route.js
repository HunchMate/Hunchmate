import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { generateIntegrityHash } from '@/lib/certificates/renderer';

function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) throw new Error('Missing Supabase Service Key');
  return createServiceClient(supabaseUrl, serviceKey);
}

/**
 * GET /api/certificates/verify/:certificateId
 * High-speed, public-facing route to validate certificate authenticity.
 */
export async function GET(request, { params }) {
  try {
    const { certificateId } = await params;

    if (!certificateId) {
      return NextResponse.json({ isValid: false, message: 'Certificate ID is required' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // Fetch certificate metadata
    const { data: cert, error } = await adminClient
      .from('certificates')
      .select('*')
      .eq('id', certificateId)
      .single();

    if (error || !cert) {
      return NextResponse.json(
        {
          isValid: false,
          status: 'notFound',
          message: 'Certificate record not found in system directory.',
        },
        { status: 404 }
      );
    }

    const issueDateStr = cert.issue_date ? new Date(cert.issue_date).toISOString().split('T')[0] : '';
    const recomputedHash = generateIntegrityHash({
      certificateId: cert.id,
      userId: cert.user_id,
      eventId: cert.event_id,
      participantName: cert.participant_name,
      eventTitle: cert.event_title,
      issueDate: issueDateStr,
    });

    const isHashMatched = recomputedHash === cert.integrity_hash;
    const isActive = cert.status === 'active';

    // Log verification view async (best effort, no blocking)
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    Promise.all([
      adminClient.from('verification_logs').insert({
        certificate_id: cert.id,
        ip_address: clientIp,
        user_agent: userAgent,
      }),
      adminClient.from('analytics_events').insert({
        event_id: cert.event_id,
        event_type: 'verification_view',
        metadata: { certificateId: cert.id },
      }),
    ]).catch((err) => console.warn('[Verification Analytics Error]:', err));

    return NextResponse.json({
      isValid: isActive && isHashMatched,
      status: cert.status,
      integrityVerified: isHashMatched,
      certificate: {
        id: cert.id,
        participantName: cert.participant_name,
        eventTitle: cert.event_title,
        issueDate: cert.issue_date,
        status: cert.status,
        integrityHash: cert.integrity_hash,
        issuerName: cert.template_data?.issuerName || 'Hunchmate Certification Board',
        organizationName: cert.template_data?.organizationName || 'Hunchmate Platform',
        recipientRole: cert.template_data?.recipientRole || 'Participant',
        customFields: cert.template_data?.customFields || {},
      },
    });
  } catch (err) {
    console.error('[GET /api/certificates/verify/:id] Unexpected error:', err);
    return NextResponse.json({ isValid: false, message: 'Internal verification server error' }, { status: 500 });
  }
}
