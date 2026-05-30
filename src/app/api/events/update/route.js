import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '../../../../utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

/**
 * POST /api/events/update
 *
 * Updates an event record server-side.
 * It first verifies user authentication and confirms the user is either:
 *  1. An admin user.
 *  2. The organizer who created the event (matching event.organizer.id).
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // 1. Verify user authentication via their session cookie
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { eventId, updates } = body;

    if (!eventId || !updates) {
      return NextResponse.json({ error: 'Missing eventId or updates in request body' }, { status: 400 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const adminClient = createServiceClient(supabaseUrl, serviceKey);

    // 2. Fetch the event to check ownership
    const { data: event, error: fetchError } = await adminClient
      .from('events')
      .select('organizer')
      .eq('id', eventId)
      .maybeSingle();

    if (fetchError || !event) {
      return NextResponse.json({ error: 'Event not found or database error' }, { status: 404 });
    }

    // 3. Fetch user profile to check if they are an admin
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isOwner = event.organizer?.id === user.id;
    const isAdmin = profile?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized to update this event' }, { status: 403 });
    }

    // 4. Force upgrade profile to organizer if not already
    if (profile?.role === 'participant') {
      await adminClient
        .from('profiles')
        .update({ role: 'organizer', updated_at: new Date().toISOString() })
        .eq('id', user.id);
    }

    // 5. Pack extended metadata into organizer JSONB
    const organizerPayload = {
      ...(updates.organizer || updates.organiser || {}),
      id: event.organizer?.id || user.id, // Keep original owner ID
      venue: updates.venue || '',
      venueAddress: updates.venueAddress || '',
      venueInstructions: updates.venueInstructions || '',
      fee: updates.fee || '',
      prizes: updates.prizes || [],
      faqs: updates.faqs || [],
      judges: updates.judges || [],
      mentors: updates.mentors || [],
      rounds: updates.rounds || [],
      judgingCriteria: updates.judgingCriteria || [],
      rules: updates.rules || [],
      sections: updates.sections || {},
      mapLink: updates.mapLink || '',
      eligibility: updates.eligibility || '',
      participationGuidelines: updates.participationGuidelines || '',
      codeOfConduct: updates.codeOfConduct || '',
      visibility: updates.visibility || 'public',
      primaryColor: updates.primaryColor || '#5227FF',
      paymentConfig: updates.paymentConfig || { type: 'free' },
      communicationPrefs: updates.communicationPrefs || {},
      internships: updates.internships || '',
      goodies: updates.goodies || '',
      sponsorPerks: updates.sponsorPerks || '',
      sponsors: updates.sponsors || [],
      partners: updates.partners || [],
      tagline: updates.tagline || '',
      logo: updates.logo || '',
      accessType: updates.accessType || 'Open',
      maxParticipants: updates.maxParticipants || 100,
      maxRegistrations: updates.maxRegistrations || 100,
      participationType: updates.participationType || 'Both',
      credentialEnabled: updates.credentialEnabled || false,
      credentialTemplate: updates.credentialTemplate || 'Classic',
      programStructure: updates.programStructure || 'single',
    };

    // 6. Perform update
    const { data: updatedEvent, error: updateError } = await adminClient
      .from('events')
      .update({
        title: updates.title,
        description: updates.description,
        short_description: updates.shortDescription || updates.short_description || '',
        category: updates.category,
        mode: updates.mode,
        status: updates.status,
        timeline: updates.timeline,
        tags: updates.tags,
        team_size: updates.teamSize || updates.team_size || null,
        poster_image: updates.posterImage || updates.poster_image || '',
        showcase_image: updates.showcaseImage || updates.showcase_image || '',
        banner_images: updates.bannerImages || updates.banner_images || [],
        gallery_images: updates.galleryImages || updates.gallery_images || [],
        media: updates.media || { banners: [], gallery: [] },
        credential_config: updates.credentialConfig || updates.credential_config || {},
        organizer: organizerPayload,
        timeline_items: updates.timelineItems || updates.timeline_items || [],
        problem_statements: updates.problemStatements || updates.problem_statements || [],
        sub_events: updates.subEvents || updates.sub_events || [],
        registered_count: updates.registeredCount || updates.registered_count || 0,
      })
      .eq('id', eventId)
      .select()
      .single();

    if (updateError) {
      console.error('[/api/events/update] Update failed:', updateError.message);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, event: updatedEvent });
  } catch (err) {
    console.error('[/api/events/update] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
