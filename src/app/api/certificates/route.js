import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { verifyRole } from '@/lib/rbac';
import { generateIntegrityHash } from '@/lib/certificates/renderer';

function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) throw new Error('Missing Supabase Service Key');
  return createServiceClient(supabaseUrl, serviceKey);
}

/**
 * GET /api/certificates
 * Query params: ?eventId=xxx or ?userId=xxx
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const userId = searchParams.get('userId');

    const adminClient = getAdminClient();
    let query = adminClient.from('certificates').select('*').order('created_at', { ascending: false });

    if (eventId) query = query.eq('event_id', eventId);
    if (userId) query = query.eq('user_id', userId);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ certificates: data || [] });
  } catch (err) {
    console.error('[GET /api/certificates] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch certificates' }, { status: 500 });
  }
}

/**
 * POST /api/certificates
 * Body: { eventId, userId, participantName, eventTitle, templateData?, templateType? }
 * Protected: Admin or Organizer only
 */
export async function POST(request) {
  try {
    const rbac = await verifyRole(['admin', 'organizer']);
    if (!rbac.authorized) return rbac.errorResponse;

    const body = await request.json();
    const { eventId, userId, participantName, eventTitle, templateData = {}, templateType = 'Classic' } = body;

    if (!eventId || !userId || !participantName || !eventTitle) {
      return NextResponse.json(
        { error: 'Missing required fields: eventId, userId, participantName, eventTitle' },
        { status: 400 }
      );
    }

    const adminClient = getAdminClient();

    // Check if certificate already issued for this user & event
    const { data: existing } = await adminClient
      .from('certificates')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Certificate already issued for this participant', certificateId: existing.id },
        { status: 409 }
      );
    }

    // Generate unique certificate ID
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const certId = `CERT-${Date.now().toString(36).toUpperCase()}-${randomHex}`;
    const issueDate = new Date().toISOString().split('T')[0];

    // Compute integrity hash
    const integrityHash = generateIntegrityHash({
      certificateId: certId,
      userId,
      eventId,
      participantName,
      eventTitle,
      issueDate,
    });

    const certRecord = {
      id: certId,
      event_id: eventId,
      user_id: userId,
      participant_name: participantName,
      event_title: eventTitle,
      issue_date: new Date().toISOString(),
      status: 'active',
      integrity_hash: integrityHash,
      template_type: templateType,
      template_data: {
        ...templateData,
        issuerName: rbac.profile?.name || 'Hunchmate Board',
      },
    };

    const { data, error } = await adminClient.from('certificates').insert(certRecord).select().single();

    if (error) {
      console.error('[POST /api/certificates] DB Insert Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Track analytics event
    await adminClient.from('analytics_events').insert({
      event_id: eventId,
      event_type: 'certificate_issued',
      user_id: userId,
      metadata: { certificateId: certId },
    });

    return NextResponse.json({ success: true, certificate: data }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/certificates] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
