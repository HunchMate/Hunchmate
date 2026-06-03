import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function POST(req) {
  try {
    const { registrationId, updates } = await req.json();

    if (!registrationId || !updates) {
      return NextResponse.json(
        { success: false, error: 'Missing registrationId or updates data' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Soft verify authentication - we don't strictly require a token for the prototype if we have the service key
    const { data: { user } } = await supabase.auth.getUser();

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    // Use service client if available to bypass RLS
    const adminClient = serviceKey
      ? createServiceClient(supabaseUrl, serviceKey)
      : supabase;

    // Update record
    const { data, error } = await adminClient
      .from('registrations')
      .update({
        team_name: updates.teamName,
        members: updates.members,
        qr_token: updates.qrToken,
        checked_in: updates.checkedIn,
        checked_in_at: updates.checkedInAt,
        participant: updates.participant,
      })
      .eq('id', registrationId)
      .select()
      .single();

    if (error) {
      console.error('Registration update error:', error.message);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, registration: data });
  } catch (error) {
    console.error('Registration server error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
