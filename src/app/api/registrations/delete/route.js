import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function POST(req) {
  try {
    const { registrationId } = await req.json();

    if (!registrationId) {
      return NextResponse.json(
        { success: false, error: 'Missing registrationId' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Soft verify authentication
    const { data: { user } } = await supabase.auth.getUser();

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    // Use service client if available to bypass RLS
    const adminClient = serviceKey
      ? createServiceClient(supabaseUrl, serviceKey)
      : supabase;

    // Delete record
    const { data, error } = await adminClient
      .from('registrations')
      .delete()
      .eq('id', registrationId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Registration delete error:', error.message);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, deletedRegistrationId: registrationId, existed: !!data });
  } catch (error) {
    console.error('Registration server error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
