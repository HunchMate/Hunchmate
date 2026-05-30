import { createClient } from '../utils/supabase/client';

// Default (anon) client — used for public reads (SELECT policy allows everyone)
const supabase = createClient();

/**
 * Returns a Supabase client that is fully authenticated for the given session.
 * Calls setSession() (awaited) so auth.uid() is correctly populated in every
 * subsequent RLS policy check — even during the very first page-load session restore.
 *
 * @param {string} accessToken  - JWT access token from the live Supabase session
 * @param {string} refreshToken - Refresh token from the live Supabase session
 */
async function getAuthClient(accessToken, refreshToken) {
  // Fast path: check if the shared singleton already has a valid session.
  // If it matches the access token being requested, reuse it directly.
  // This is the common path once the user is logged in and the session is hydrated.
  try {
    const { data: { session: existing } } = await supabase.auth.getSession();
    if (existing?.access_token) {
      // Singleton is authenticated — use it (avoids creating a new client)
      return supabase;
    }
  } catch {
    // ignore — fall through to explicit session setup
  }

  if (!accessToken) return supabase;

  // Create a fresh client and hydrate its session so auth.uid() works in RLS.
  // This path is hit during the very first page-load (_emitInitialSession) before
  // the singleton's session is restored from storage.
  const client = createClient();
  try {
    await client.auth.setSession({
      access_token: accessToken,
      // refresh_token is required by the API but we may not always have it;
      // falling back to access_token keeps setSession from throwing a validation error.
      refresh_token: refreshToken || accessToken,
    });
  } catch {
    // setSession can throw if the token is malformed; still attempt the request
    // — the client will send the apikey header and the request may succeed or
    // produce a clearer error from Supabase.
  }
  return client;
}


const ADMIN_EMAILS = String(
  (typeof process !== 'undefined' && process.env ? (process.env.NEXT_PUBLIC_ADMIN_EMAILS || process.env.VITE_ADMIN_EMAILS) : '') ||
  (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_ADMIN_EMAILS : '') ||
  ''
)
  .split(',')
  .map((value) => String(value || '').trim().toLowerCase())
  .filter(Boolean);

function nowIso() {
  return new Date().toISOString();
}

function mapProfileToApp(row) {
  if (!row) return null;
  return {
    id: row.id,
    uid: row.id,
    email: row.email,
    name: row.name,
    role: row.role || 'participant',
    status: row.status || 'active',
    provider: row.provider || 'supabase',
    onboardingCompleted: row.onboarding_completed,
    hostOnboardingCompleted: row.host_onboarding_completed,
    avatar: row.avatar || '',
    avatarBackdrop: row.avatar_backdrop || '',
    bio: row.bio || '',
    institution: row.institution || '',
    organizationName: row.organization_name || '',
    organisationName: row.organization_name || '',
    companyName: row.organization_name || '',
    location: row.location || '',
    headline: row.headline || '',
    website: row.website || '',
    skills: row.skills || [],
    profileType: row.profile_type || '',
    stream: row.stream || '',
    graduationYear: row.graduation_year || '',
    institutionName: row.institution_name || '',
    hostType: row.host_type || '',
    phoneNumber: row.phone_number || '',
    state: row.state || '',
    city: row.city || '',
    experience: row.experience || '',
    techProficiency: row.tech_proficiency || '',
    workSummary: row.work_summary || '',
    currentDesignation: row.current_designation || '',
    socials: row.socials || { linkedin: '', github: '', instagram: '' },
    termsAccepted: row.terms_accepted,
    termsAcceptedAt: row.terms_accepted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProfileToDb(app) {
  if (!app) return {};
  const db = {};
  if (app.email !== undefined) db.email = app.email;
  if (app.name !== undefined) db.name = app.name;
  if (app.role !== undefined) db.role = app.role;
  if (app.status !== undefined) db.status = app.status;
  if (app.provider !== undefined) db.provider = app.provider;
  if (app.onboardingCompleted !== undefined) db.onboarding_completed = app.onboardingCompleted;
  if (app.hostOnboardingCompleted !== undefined) db.host_onboarding_completed = app.hostOnboardingCompleted;
  if (app.avatar !== undefined) db.avatar = app.avatar;
  if (app.avatarBackdrop !== undefined) db.avatar_backdrop = app.avatarBackdrop;
  if (app.bio !== undefined) db.bio = app.bio;
  if (app.institution !== undefined) db.institution = app.institution;
  if (app.organizationName !== undefined) {
    db.organization_name = app.organizationName;
  } else if (app.organisationName !== undefined) {
    db.organization_name = app.organisationName;
  } else if (app.companyName !== undefined) {
    db.organization_name = app.companyName;
  }
  if (app.location !== undefined) db.location = app.location;
  if (app.headline !== undefined) db.headline = app.headline;
  if (app.website !== undefined) db.website = app.website;
  if (app.skills !== undefined) db.skills = app.skills;
  if (app.profileType !== undefined) db.profile_type = app.profileType;
  if (app.stream !== undefined) db.stream = app.stream;
  if (app.graduationYear !== undefined) db.graduation_year = app.graduationYear;
  if (app.institutionName !== undefined) db.institution_name = app.institutionName;
  if (app.hostType !== undefined) db.host_type = app.hostType;
  if (app.phoneNumber !== undefined) db.phone_number = app.phoneNumber;
  if (app.state !== undefined) db.state = app.state;
  if (app.city !== undefined) db.city = app.city;
  if (app.experience !== undefined) db.experience = app.experience;
  if (app.techProficiency !== undefined) db.tech_proficiency = app.techProficiency;
  if (app.workSummary !== undefined) db.work_summary = app.workSummary;
  if (app.currentDesignation !== undefined) db.current_designation = app.currentDesignation;
  if (app.socials !== undefined) db.socials = app.socials;
  if (app.termsAccepted !== undefined) db.terms_accepted = app.termsAccepted;
  if (app.termsAcceptedAt !== undefined) db.terms_accepted_at = app.termsAcceptedAt;
  return db;
}

function mapEventToApp(row) {
  if (!row) return null;
  // The organizer JSONB column stores both organizer info AND extended metadata
  const org = row.organizer || {};
  return {
    ...row,
    id: String(row.id),
    organizer: org,
    organiser: org,
    // Extract extended metadata from organizer JSONB to top-level
    venue: org.venue || row.venue || '',
    venueAddress: org.venueAddress || row.venue_address || '',
    venueInstructions: org.venueInstructions || row.venue_instructions || '',
    fee: org.fee || row.fee || '',
    prizes: org.prizes || row.prizes || [],
    faqs: org.faqs || row.faqs || [],
    judges: org.judges || row.judges || [],
    mentors: org.mentors || row.mentors || [],
    rounds: org.rounds || row.rounds || [],
    judgingCriteria: org.judgingCriteria || row.judging_criteria || [],
    rules: org.rules || row.rules || [],
    sections: org.sections || row.sections || {},
    mapLink: org.mapLink || row.map_link || '',
    eligibility: org.eligibility || row.eligibility || '',
    participationGuidelines: org.participationGuidelines || row.participation_guidelines || '',
    codeOfConduct: org.codeOfConduct || row.code_of_conduct || '',
    visibility: org.visibility || row.visibility || 'public',
    primaryColor: org.primaryColor || row.primary_color || '#5227FF',
    paymentConfig: org.paymentConfig || row.payment_config || { type: 'free' },
    communicationPrefs: org.communicationPrefs || row.communication_prefs || {},
    internships: org.internships || row.internships || '',
    goodies: org.goodies || row.goodies || '',
    sponsorPerks: org.sponsorPerks || row.sponsor_perks || '',
    sponsors: org.sponsors || row.sponsors || [],
    partners: org.partners || row.partners || [],
    tagline: org.tagline || row.tagline || '',
    logo: org.logo || row.logo || '',
    accessType: org.accessType || row.access_type || 'Open',
    maxParticipants: org.maxParticipants || row.max_participants || 100,
    maxRegistrations: org.maxRegistrations || row.max_registrations || 100,
    participationType: org.participationType || row.participation_type || 'Both',
    credentialEnabled: org.credentialEnabled || row.credential_enabled || false,
    credentialTemplate: org.credentialTemplate || row.credential_template || 'Classic',
    credentialConfig: row.credential_config || row.credentialConfig || {},
    programStructure: org.programStructure || row.program_structure || 'single',
    // Existing snake_case → camelCase mappings
    shortDescription: row.short_description || row.shortDescription || '',
    posterImage: row.poster_image || row.posterImage || '',
    showcaseImage: row.showcase_image || row.showcaseImage || '',
    bannerImages: row.banner_images || row.bannerImages || [],
    galleryImages: row.gallery_images || row.galleryImages || [],
    timelineItems: row.timeline_items || row.timelineItems || [],
    problemStatements: row.problem_statements || row.problemStatements || [],
    subEvents: row.sub_events || row.subEvents || [],
    teamSize: row.team_size || row.teamSize || null,
    registeredCount: row.registered_count || row.registeredCount || 0,
  };
}

function mapRegistrationToApp(row) {
  if (!row) return null;
  return {
    ...row,
    id: String(row.id),
  };
}

function mapComplaintToApp(row) {
  if (!row) return null;
  return {
    ...row,
    complaintId: String(row.id),
    status: row.status || 'raised',
    history: row.history || [],
  };
}

// ==========================================
// USER PROFILES
// ==========================================
export async function upsertUserProfileFromAuthUser(authUser, options = {}) {
  if (!authUser?.id) throw new Error('Invalid authenticated user.');

  const uid = authUser.id;
  const normalizedEmail = String(authUser.email || options.email || '').trim().toLowerCase();
  const autoAdmin = normalizedEmail && ADMIN_EMAILS.includes(normalizedEmail);
  const resolvedRole = autoAdmin ? 'admin' : (options.role || 'participant');
  const resolvedName = options.name || authUser.user_metadata?.name || normalizedEmail.split('@')[0] || 'User';
  const resolvedProvider = options.provider || authUser.app_metadata?.provider || 'supabase';

  const fallbackProfile = {
    id: uid,
    email: normalizedEmail,
    name: resolvedName,
    role: resolvedRole,
    status: 'active',
    onboarding_completed: false,
    host_onboarding_completed: false,
  };

  // ── Path A: Server-side API route (cookie auth, bypasses RLS timing) ──
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/profile/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: resolvedName,
          role: resolvedRole,
          provider: resolvedProvider,
          termsAccepted: options.termsAccepted,
          termsAcceptedAt: options.termsAcceptedAt,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.profile) {
          console.log('[upsert] ✓ Path A (API route) succeeded');
          return mapProfileToApp(json.profile);
        }
      }
      // Log why Path A failed so we can diagnose
      console.warn(`[upsert] Path A (API route) returned ${res.status} — falling through to Path B`);
    } catch (fetchErr) {
      console.warn('[upsert] Path A (API route) network error:', fetchErr.message);
    }
  }

  // ── Path B: Direct Supabase client with explicit session ──
  const updates = mapProfileToDb({
    ...options,
    email: normalizedEmail,
    name: resolvedName,
    role: resolvedRole,
    provider: resolvedProvider,
    termsAccepted: options.termsAccepted,
    termsAcceptedAt: options.termsAcceptedAt,
  });

  const client = await getAuthClient(options.accessToken, options.refreshToken);

  // Check if client actually has a session
  try {
    const { data: { session: clientSession } } = await client.auth.getSession();
    console.log('[upsert] Path B client session:', clientSession ? 'present' : 'MISSING');
  } catch { /* ignore */ }

  try {
    // Step 1: UPDATE (if trigger already created the row)
    const { data: updateData, error: updateError } = await client
      .from('profiles')
      .update(updates)
      .eq('id', uid)
      .select()
      .maybeSingle();

    if (updateError) {
      console.warn('[upsert] UPDATE error:', updateError.message, `(code: ${updateError.code})`);
    } else if (updateData) {
      console.log('[upsert] ✓ Path B UPDATE succeeded');
      return mapProfileToApp(updateData);
    } else {
      console.log('[upsert] UPDATE returned no data (row does not exist yet)');
    }

    // Step 2: INSERT
    const { data: insertData, error: insertError } = await client
      .from('profiles')
      .insert({ id: uid, ...updates })
      .select()
      .single();

    if (insertError) {
      console.warn('[upsert] INSERT error:', insertError.message, `(code: ${insertError.code})`);
    } else if (insertData) {
      console.log('[upsert] ✓ Path B INSERT succeeded');
      return mapProfileToApp(insertData);
    } else {
      console.warn('[upsert] INSERT returned no error but also no data');
    }

    // Step 3: Read whatever exists
    const { data: readData, error: readError } = await client
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    if (readError) {
      console.warn('[upsert] SELECT error:', readError.message);
    } else if (readData) {
      console.log('[upsert] ✓ Path B SELECT fallback succeeded');
      return mapProfileToApp(readData);
    } else {
      console.warn('[upsert] SELECT returned no data — profile truly does not exist');
    }

    // Last resort
    console.error('[upsert] All paths exhausted. Using in-memory fallback for uid:', uid);
    return mapProfileToApp(fallbackProfile);
  } catch (err) {
    console.error('[upsert] Unexpected error:', err.message);
    return mapProfileToApp(fallbackProfile);
  }
}


export async function getUserProfile(uid) {
  if (!uid) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .maybeSingle();

  if (error) {
    if (error.message !== 'JWT expired') {
      console.error('getUserProfile error:', error.message);
    }
    return null;
  }
  return mapProfileToApp(data);
}

export async function updateUserProfile(uid, updates = {}) {
  if (!uid) throw new Error('User id is required.');

  const dbPayload = mapProfileToDb(updates);

  const { data, error } = await supabase
    .from('profiles')
    .update(dbPayload)
    .eq('id', uid)
    .select()
    .single();

  if (error) {
    console.error('updateUserProfile error:', error.message);
    throw error;
  }
  return mapProfileToApp(data);
}

// ==========================================
// EVENTS
// ==========================================
export async function listEvents() {
  try {
    // Fetch ALL events for EventContext bulk sync (backwards compat)
    const cacheBuster = Date.now();
    const res = await fetch(`/api/events?all=true&cb=${cacheBuster}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      console.error('listEvents fetch error:', res.statusText);
      return [];
    }

    const json = await res.json();
    if (json.error) {
      console.error('listEvents api error:', json.error);
      return [];
    }

    return (json.events || []).map(mapEventToApp);
  } catch (error) {
    console.error('listEvents unexpected error:', error.message);
    return [];
  }
}

/**
 * Fetch a paginated page of events from the server.
 * @param {Object} params
 * @param {number} params.page - Page number (1-indexed)
 * @param {number} params.limit - Events per page (default 16)
 * @param {string} params.search - Search query
 * @param {string} params.category - Category filter
 * @param {string} params.status - Status filter (open, ongoing, etc.)
 * @param {string} params.mode - Mode filter (Online, Offline, Hybrid)
 * @returns {{ events: Array, pagination: { page, limit, total, totalPages, hasMore } }}
 */
export async function listEventsPaginated(params = {}) {
  try {
    const searchParams = new URLSearchParams();
    searchParams.set('page', String(params.page || 1));
    searchParams.set('limit', String(params.limit || 16));
    if (params.search) searchParams.set('search', params.search);
    if (params.category) searchParams.set('category', params.category);
    if (params.status) searchParams.set('status', params.status);
    if (params.mode) searchParams.set('mode', params.mode);
    searchParams.set('cb', Date.now());

    const res = await fetch(`/api/events?${searchParams.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      console.error('listEventsPaginated fetch error:', res.statusText);
      return { events: [], pagination: { page: 1, limit: 16, total: 0, totalPages: 0, hasMore: false } };
    }

    const json = await res.json();
    if (json.error) {
      console.error('listEventsPaginated api error:', json.error);
      return { events: [], pagination: { page: 1, limit: 16, total: 0, totalPages: 0, hasMore: false } };
    }

    return {
      events: (json.events || []).map(mapEventToApp),
      pagination: json.pagination || { page: 1, limit: 16, total: 0, totalPages: 0, hasMore: false },
    };
  } catch (error) {
    console.error('listEventsPaginated unexpected error:', error.message);
    return { events: [], pagination: { page: 1, limit: 16, total: 0, totalPages: 0, hasMore: false } };
  }
}

export async function createEventRecord(eventData) {
  // Route creation through server-side API route which has correct auth.uid() context
  // and handles role upgrade + insert atomically, bypassing all client-side RLS issues.
  const res = await fetch('/api/events/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ eventData }),
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    const message = json?.error || 'Failed to create event on server';
    console.error('createEventRecord server error:', message);
    throw new Error(message);
  }

  console.log('Event created successfully via server route!');
  return mapEventToApp(json.event);
}


export async function updateEventRecord(eventId, updates) {
  // Route update through server-side API route which has correct auth.uid() context
  // and handles verification + update, bypassing all client-side RLS issues.
  const res = await fetch('/api/events/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ eventId, updates }),
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    const message = json?.error || 'Failed to update event on server';
    console.error('updateEventRecord server error:', message);
    throw new Error(message);
  }

  console.log('Event updated successfully via server route!');
  return mapEventToApp(json.event);
}

export async function deleteEventRecord(eventId) {
  // Route deletion through server-side API route which has correct auth.uid() context
  // and handles verification + delete, bypassing all client-side RLS issues.
  const res = await fetch('/api/events/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ eventId }),
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    const message = json?.error || 'Failed to delete event on server';
    console.error('deleteEventRecord server error:', message);
    throw new Error(message);
  }

  console.log('Event deleted successfully via server route!');
  return { deletedEventId: json.deletedEventId };
}

// ==========================================
// REGISTRATIONS
// ==========================================
export async function listRegistrations() {
  const { data, error } = await supabase
    .from('registrations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    if (error.message !== 'JWT expired') {
      console.error('listRegistrations error:', error.message);
    }
    return [];
  }
  return data.map(mapRegistrationToApp);
}

export async function createRegistrationRecord(eventId, registration) {
  const { data, error } = await supabase
    .from('registrations')
    .insert({
      event_id: eventId,
      user_id: registration.userId || registration.participant?.id || registration.user_id,
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
    console.error('createRegistrationRecord error:', error.message);
    throw error;
  }

  // Increment event registeredCount
  await supabase.rpc('increment_event_registration', { event_id_param: eventId });

  return {
    registration: mapRegistrationToApp(data),
  };
}

export async function updateRegistrationRecord(registrationId, updates = {}) {
  const { data, error } = await supabase
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
    console.error('updateRegistrationRecord error:', error.message);
    throw error;
  }
  return mapRegistrationToApp(data);
}

export async function deleteRegistrationRecord(registrationId) {
  const { data, error } = await supabase
    .from('registrations')
    .delete()
    .eq('id', registrationId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('deleteRegistrationRecord error:', error.message);
    throw error;
  }
  return { deletedRegistrationId: registrationId, existed: !!data };
}

export async function checkInByQrToken(qrToken) {
  const { data: regData, error: regError } = await supabase
    .from('registrations')
    .select('*, events(*)')
    .eq('qr_token', qrToken)
    .maybeSingle();

  if (regError || !regData) {
    return {
      success: false,
      status: 'invalid',
      message: 'QR token is invalid or registration not found.',
      team: null,
      event: null,
    };
  }

  const checkedInAt = nowIso();
  const { error: updateError } = await supabase
    .from('registrations')
    .update({
      checked_in: true,
      checked_in_at: checkedInAt,
    })
    .eq('id', regData.id);

  if (updateError) {
    return {
      success: false,
      status: 'error',
      message: 'Failed to update check-in status.',
      team: null,
      event: null,
    };
  }

  return {
    success: true,
    status: 'valid',
    message: 'Checked in successfully!',
    checkedInAt,
    team: {
      registrationIds: [regData.id],
      teamName: regData.team_name,
      members: regData.members || [],
      participant: regData.participant || null,
    },
    event: mapEventToApp(regData.events),
  };
}

// ==========================================
// COMPLAINTS
// ==========================================
export async function createComplaintForUser({ user, name, message }) {
  const { data, error } = await supabase
    .from('complaints')
    .insert({
      user_id: user.id || user.uid,
      email: user.email,
      name: name || user.name || 'Anonymous',
      message,
      status: 'raised',
      history: [{ status: 'raised', note: 'Ticket created', createdAt: nowIso() }],
    })
    .select()
    .single();

  if (error) {
    console.error('createComplaintForUser error:', error.message);
    throw error;
  }
  return mapComplaintToApp(data);
}

export async function listComplaintsForUser(user) {
  const { data, error } = await supabase
    .from('complaints')
    .select('*')
    .eq('user_id', user.id || user.uid)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('listComplaintsForUser error:', error.message);
    return [];
  }
  return data.map(mapComplaintToApp);
}

// ==========================================
// ADMIN UTILITIES
// ==========================================
export async function appendAdminAuditLog({ action, actorId, targetType, targetId, metadata = {} }) {
  const { error } = await supabase
    .from('admin_audit_logs')
    .insert({
      action,
      actor_id: String(actorId),
      target_type: targetType,
      target_id: String(targetId),
      metadata,
    });

  if (error) {
    console.error('appendAdminAuditLog error:', error.message);
  }
}

export async function getAdminOverview() {
  const [profilesRes, eventsRes, regsRes, complaintsRes] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('events').select('*'),
    supabase.from('registrations').select('*'),
    supabase.from('complaints').select('*'),
  ]);

  const users = (profilesRes.data || []).map(mapProfileToApp);
  const events = (eventsRes.data || []).map(mapEventToApp);
  const registrations = (regsRes.data || []).map(mapRegistrationToApp);
  const complaints = (complaintsRes.data || []).map(mapComplaintToApp);

  const roleCounts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, { participant: 0, organizer: 0, admin: 0 });

  const metrics = {
    totalUsers: users.length,
    totalEvents: events.length,
    totalRegistrations: registrations.length,
    totalCheckIns: registrations.filter((r) => r.checked_in).length,
    activeSessions: 0,
    suspendedUsers: users.filter((u) => u.status === 'suspended').length,
    roleCounts,
    openComplaints: complaints.filter((c) => c.status !== 'resolved').length,
  };

  return {
    metrics,
    recentUsers: users.slice(0, 5),
    recentEvents: events.slice(0, 5),
  };
}

export async function listUsers(params = {}) {
  let query = supabase.from('profiles').select('*', { count: 'exact' });

  if (params.role) query = query.eq('role', params.role);
  if (params.status) query = query.eq('status', params.status);
  if (params.search) query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%`);

  const limit = params.limit || 40;
  query = query.limit(limit);

  const { data, count, error } = await query;
  if (error) {
    console.error('listUsers error:', error.message);
    return { users: [], total: 0 };
  }
  return {
    users: data.map(mapProfileToApp),
    total: count || 0,
  };
}

export async function listAdminEvents(params = {}) {
  let query = supabase.from('events').select('*', { count: 'exact' });

  if (params.status) query = query.eq('status', params.status);
  if (params.search) query = query.ilike('title', `%${params.search}%`);

  const limit = params.limit || 40;
  query = query.limit(limit);

  const { data, count, error } = await query;
  if (error) {
    console.error('listAdminEvents error:', error.message);
    return { events: [], total: 0 };
  }
  return {
    events: data.map(mapEventToApp),
    total: count || 0,
  };
}

export async function updateUserRoleFirebase(targetUserId, role, actorId = 'admin') {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', targetUserId);

  if (error) {
    console.error('updateUserRoleFirebase error:', error.message);
    throw error;
  }

  await appendAdminAuditLog({
    action: 'user-role-updated',
    actorId,
    targetType: 'user',
    targetId: targetUserId,
    metadata: { role },
  });
}

export async function updateUserStatusFirebase(targetUserId, status, actorId = 'admin') {
  const { error } = await supabase
    .from('profiles')
    .update({ status })
    .eq('id', targetUserId);

  if (error) {
    console.error('updateUserStatusFirebase error:', error.message);
    throw error;
  }

  await appendAdminAuditLog({
    action: 'user-status-updated',
    actorId,
    targetType: 'user',
    targetId: targetUserId,
    metadata: { status },
  });
}

export async function updateEventStatusFirebase(eventId, status, actorId = 'admin') {
  const { error } = await supabase
    .from('events')
    .update({ status })
    .eq('id', eventId);

  if (error) {
    console.error('updateEventStatusFirebase error:', error.message);
    throw error;
  }

  await appendAdminAuditLog({
    action: 'event-status-updated',
    actorId,
    targetType: 'event',
    targetId: eventId,
    metadata: { status },
  });
}

export async function listAdminAuditLogs(limitCount = 50) {
  const { data, error } = await supabase
    .from('admin_audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limitCount);

  if (error) {
    console.error('listAdminAuditLogs error:', error.message);
    return [];
  }
  return data;
}

export async function listAdminComplaints(params = {}) {
  let query = supabase.from('complaints').select('*');

  if (params.status) query = query.eq('status', params.status);
  if (params.search) query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%,message.ilike.%${params.search}%`);

  const { data, error } = await query;
  if (error) {
    console.error('listAdminComplaints error:', error.message);
    return { complaints: [], metrics: { raised: 0, inProgress: 0, resolved: 0 } };
  }

  const complaints = data.map(mapComplaintToApp);
  const metrics = complaints.reduce((acc, c) => {
    if (c.status === 'resolved') acc.resolved += 1;
    else if (c.status === 'in-progress') acc.inProgress += 1;
    else acc.raised += 1;
    return acc;
  }, { raised: 0, inProgress: 0, resolved: 0 });

  return { complaints, metrics };
}

export async function updateComplaintStatus(complaintId, status, note, actorId = 'admin') {
  const { data: currentData, error: fetchError } = await supabase
    .from('complaints')
    .select('*')
    .eq('id', complaintId)
    .single();

  if (fetchError) throw fetchError;

  const history = [
    ...(currentData.history || []),
    { status, note, createdAt: nowIso(), actorId },
  ];

  const { data, error } = await supabase
    .from('complaints')
    .update({ status, history })
    .eq('id', complaintId)
    .select()
    .single();

  if (error) {
    console.error('updateComplaintStatus error:', error.message);
    throw error;
  }

  await appendAdminAuditLog({
    action: 'complaint-status-updated',
    actorId,
    targetType: 'complaint',
    targetId: complaintId,
    metadata: { status },
  });

  return mapComplaintToApp(data);
}
