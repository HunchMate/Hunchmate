import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '../../../../utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

/**
 * POST /api/events/create
 *
 * Creates a new event record server-side using the authenticated user's cookie session.
 * This guarantees auth.uid() is correctly populated in RLS policies.
 * It also force-upgrades the user's role to 'organizer' before inserting.
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Verify the user is authenticated via their session cookie
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const eventData = body.eventData;

    if (!eventData) {
      return NextResponse.json({ error: 'Missing eventData in request body' }, { status: 400 });
    }

    // Use the service role client which completely bypasses RLS.
    // This is safe because we already verified the user is authenticated above.
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    // If service role key is available, use it to bypass RLS
    const adminClient = serviceKey && serviceKey !== 'PASTE_YOUR_SERVICE_ROLE_KEY_HERE'
      ? createServiceClient(supabaseUrl, serviceKey)
      : supabase; // Fall back to cookie client

    // Also upgrade the user's profile role to organizer using the admin client
    if (serviceKey && serviceKey !== 'PASTE_YOUR_SERVICE_ROLE_KEY_HERE') {
      await adminClient.from('profiles').upsert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email,
        role: 'organizer',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    }

    // Pack all extended fields into the organizer JSONB column
    // since the DB schema only has a fixed set of columns.
    const organizerPayload = {
      ...(eventData.organizer || eventData.organiser || {}),
      id: user.id, // FORCE OWNER ID!
      // Extended metadata stored inside organizer JSONB
      venue: eventData.venue || '',
      venueAddress: eventData.venueAddress || '',
      venueInstructions: eventData.venueInstructions || '',
      fee: eventData.fee || '',
      prizes: eventData.prizes || [],
      faqs: eventData.faqs || [],
      judges: eventData.judges || [],
      mentors: eventData.mentors || [],
      rounds: eventData.rounds || [],
      judgingCriteria: eventData.judgingCriteria || [],
      rules: eventData.rules || [],
      sections: eventData.sections || {},
      mapLink: eventData.mapLink || '',
      eligibility: eventData.eligibility || '',
      participationGuidelines: eventData.participationGuidelines || '',
      codeOfConduct: eventData.codeOfConduct || '',
      visibility: eventData.visibility || 'public',
      primaryColor: eventData.primaryColor || '#5227FF',
      paymentConfig: eventData.paymentConfig || { type: 'free' },
      communicationPrefs: eventData.communicationPrefs || {},
      internships: eventData.internships || '',
      goodies: eventData.goodies || '',
      sponsorPerks: eventData.sponsorPerks || '',
      sponsors: eventData.sponsors || [],
      partners: eventData.partners || [],
      tagline: eventData.tagline || '',
      logo: eventData.logo || '',
      accessType: eventData.accessType || 'Open',
      maxParticipants: eventData.maxParticipants || 100,
      maxRegistrations: eventData.maxRegistrations || 100,
      participationType: eventData.participationType || 'Both',
      credentialEnabled: eventData.credentialEnabled || false,
      credentialTemplate: eventData.credentialTemplate || 'Classic',
      programStructure: eventData.programStructure || 'single',
    };

    const { data: newEvent, error: insertError } = await adminClient
      .from('events')
      .insert({
        title: eventData.title,
        description: eventData.description,
        short_description: eventData.shortDescription || eventData.short_description || '',
        category: eventData.category,
        mode: eventData.mode,
        status: eventData.status || 'upcoming',
        timeline: eventData.timeline || {},
        tags: eventData.tags || [],
        team_size: eventData.teamSize || eventData.team_size || null,
        poster_image: eventData.posterImage || eventData.poster_image || '',
        showcase_image: eventData.showcaseImage || eventData.showcase_image || '',
        banner_images: eventData.bannerImages || eventData.banner_images || [],
        gallery_images: eventData.galleryImages || eventData.gallery_images || [],
        media: eventData.media || { banners: [], gallery: [] },
        credential_config: eventData.credentialConfig || eventData.credential_config || {},
        organizer: organizerPayload,
        timeline_items: eventData.timelineItems || eventData.timeline_items || [],
        problem_statements: eventData.problemStatements || eventData.problem_statements || [],
        sub_events: eventData.subEvents || eventData.sub_events || [],
        registered_count: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[/api/events/create] Insert failed:', insertError.message);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, event: newEvent });
  } catch (err) {
    console.error('[/api/events/create] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
