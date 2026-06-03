import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function POST(req) {
  try {
    const { eventId, registration } = await req.json();

    if (!eventId || !registration) {
      return NextResponse.json(
        { success: false, error: 'Missing eventId or registration data' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Soft verify authentication (don't strictly fail if JWT is expired, as long as client sent a userId)
    const { data: { user } } = await supabase.auth.getUser();
    const userId = registration.userId || registration.participant?.id || registration.user_id || user?.id;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - please sign in again' },
        { status: 401 }
      );
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    // Use service client if available to bypass RLS
    const adminClient = serviceKey
      ? createServiceClient(supabaseUrl, serviceKey)
      : supabase;

    // Insert record
    const { data, error } = await adminClient
      .from('registrations')
      .insert({
        event_id: eventId,
        user_id: userId,
        team_name: registration.teamName || registration.team_name,
        members: registration.members || [],
        qr_token: registration.qrToken || registration.qr_token,
        checked_in: registration.checkedIn || false,
        checked_in_at: registration.checkedInAt || null,
        participant: registration.participant || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Registration insert error:', error.message);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    // Increment event registeredCount (call RPC if available, or ignore if handled elsewhere)
    await adminClient.rpc('increment_event_registration', { event_id_param: eventId });

    return NextResponse.json({ success: true, registration: data });
  } catch (error) {
    console.error('Registration server error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
