import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) throw new Error('Missing Supabase Service Key');
  return createServiceClient(supabaseUrl, serviceKey);
}

/**
 * Intelligent QR token parser.
 * Handles raw tokens, URLs (e.g. https://domain.com/checkin?qr=TOKEN or /verify/TOKEN), and JSON payloads.
 */
function parseQrToken(rawToken) {
  let cleaned = String(rawToken || '').trim();
  if (!cleaned) return '';

  // Try parsing JSON if token is JSON stringified object
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.qr_token || parsed.qrToken || parsed.token || parsed.id) {
        return String(parsed.qr_token || parsed.qrToken || parsed.token || parsed.id).trim();
      }
    } catch {
      // Not valid JSON, proceed to standard cleaning
    }
  }

  // Handle URL query parameters or path parameters
  if (cleaned.includes('://') || cleaned.includes('?')) {
    try {
      const url = new URL(cleaned, 'https://hunchmate.com');
      const tokenParam = url.searchParams.get('qr') || url.searchParams.get('qr_token') || url.searchParams.get('token');
      if (tokenParam) return tokenParam.trim();

      // Extract last path segment if path is /verify/CERT-xxx or /checkin/TOKEN
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        return segments[segments.length - 1].trim();
      }
    } catch {
      // Ignore URL parse error
    }
  }

  return cleaned;
}

/**
 * POST /api/registrations/check-in
 * Body: { qrToken: string, eventId?: string }
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawToken = body.qrToken || body.token;
    const eventId = body.eventId || null;

    const qrToken = parseQrToken(rawToken);

    if (!qrToken) {
      return NextResponse.json(
        {
          success: false,
          status: 'invalid',
          message: 'QR token is required for validation.',
        },
        { status: 400 }
      );
    }

    const adminClient = getAdminClient();

    // Query registration by qr_token OR id
    let { data: regData, error: regError } = await adminClient
      .from('registrations')
      .select('*, events(*)')
      .eq('qr_token', qrToken)
      .maybeSingle();

    if (!regData && !regError) {
      // Fallback query by registration ID
      const { data: regById } = await adminClient
        .from('registrations')
        .select('*, events(*)')
        .eq('id', qrToken)
        .maybeSingle();

      if (regById) regData = regById;
    }

    if (!regData) {
      return NextResponse.json({
        success: false,
        status: 'invalid',
        message: 'Invalid QR Code: Registration record not found in system directory.',
        team: null,
        event: null,
      });
    }

    // Event-scoped validation: check if QR belongs to the selected event
    if (eventId && regData.event_id !== eventId) {
      return NextResponse.json({
        success: false,
        status: 'wrong-event',
        message: `Not registered for this event. Registered for: ${regData.events?.title || 'Different Event'}.`,
        team: null,
        event: regData.events || null,
        participant: regData.participant || null,
      });
    }

    const participantName = regData.participant?.name || regData.team_name || 'Participant';

    // Already checked in
    if (regData.checked_in) {
      const checkedInTime = regData.checked_in_at
        ? new Date(regData.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'earlier';

      return NextResponse.json({
        success: false,
        status: 'already-checked-in',
        message: `${participantName} was ALREADY checked in at ${checkedInTime}.`,
        checkedInAt: regData.checked_in_at,
        participant: regData.participant || { name: participantName, email: regData.participant?.email },
        team: {
          registrationIds: [regData.id],
          teamName: regData.team_name,
          members: regData.members || [],
          participant: regData.participant || null,
        },
        event: regData.events || null,
      });
    }

    // Update checked_in status
    const checkedInAt = new Date().toISOString();
    const { error: updateError } = await adminClient
      .from('registrations')
      .update({
        checked_in: true,
        checked_in_at: checkedInAt,
      })
      .eq('id', regData.id);

    if (updateError) {
      console.error('[Check-In Update Error]:', updateError);
      return NextResponse.json(
        {
          success: false,
          status: 'error',
          message: 'Failed to update check-in record in database.',
        },
        { status: 500 }
      );
    }

    // Record audit log
    try {
      await adminClient.from('admin_audit_logs').insert({
        action: 'PARTICIPANT_CHECK_IN',
        target_type: 'registration',
        target_id: regData.id,
        metadata: { eventId: regData.event_id, participantName, qrToken },
      });
    } catch (e) {
      console.warn('[Audit log warning]:', e);
    }

    return NextResponse.json({
      success: true,
      status: 'valid',
      message: `Check-in Successful! ${participantName} verified.`,
      checkedInAt,
      participant: regData.participant || { name: participantName, email: regData.participant?.email },
      team: {
        registrationIds: [regData.id],
        teamName: regData.team_name,
        members: regData.members || [],
        participant: regData.participant || null,
      },
      event: regData.events || null,
    });
  } catch (err) {
    console.error('[POST /api/registrations/check-in] Error:', err);
    return NextResponse.json(
      {
        success: false,
        status: 'error',
        message: 'Internal server error during QR validation.',
      },
      { status: 500 }
    );
  }
}
