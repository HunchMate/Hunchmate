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
 * GET /api/analytics
 * Query params: ?eventId=xxx (optional)
 * Protected: Admin or Organizer
 */
export async function GET(request) {
  try {
    const rbac = await verifyRole(['admin', 'organizer']);
    if (!rbac.authorized) return rbac.errorResponse;

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    const adminClient = getAdminClient();

    // 1. Conversion Funnel Metrics
    let regQuery = adminClient.from('registrations').select('*', { count: 'exact', head: true });
    let subQuery = adminClient.from('project_submissions').select('*', { count: 'exact', head: true });
    let certQuery = adminClient.from('certificates').select('*', { count: 'exact', head: true });
    let activeCertQuery = adminClient.from('certificates').select('*', { count: 'exact', head: true }).eq('status', 'active');
    let verifViewsQuery = adminClient.from('verification_logs').select('*', { count: 'exact', head: true });

    if (eventId) {
      regQuery = regQuery.eq('event_id', eventId);
      subQuery = subQuery.eq('event_id', eventId);
      certQuery = certQuery.eq('event_id', eventId);
      activeCertQuery = activeCertQuery.eq('event_id', eventId);
    }

    const [
      totalRegistrationsRes,
      totalSubmissionsRes,
      totalCertificatesRes,
      activeCertificatesRes,
      verificationViewsRes,
      analyticsEventsRes,
      registrationsTimelineRes,
    ] = await Promise.all([
      regQuery,
      subQuery,
      certQuery,
      activeCertQuery,
      verifViewsQuery,
      // Analytics events for shares & engagement
      adminClient.from('analytics_events').select('event_type, created_at').order('created_at', { ascending: true }),
      // Timeline data for trends chart
      adminClient.from('registrations').select('created_at').order('created_at', { ascending: true }),
    ]);

    const totalRegistrations = totalRegistrationsRes.count || 0;
    const totalSubmissions = totalSubmissionsRes.count || 0;
    const totalCertificates = totalCertificatesRes.count || 0;
    const activeCertificates = activeCertificatesRes.count || 0;
    const verificationViews = verificationViewsRes.count || 0;

    // Calculate Conversion Funnel Ratios
    const regToSubConversion = totalRegistrations > 0 ? ((totalSubmissions / totalRegistrations) * 100).toFixed(1) : 0;
    const subToCertConversion = totalSubmissions > 0 ? ((totalCertificates / totalSubmissions) * 100).toFixed(1) : 0;

    // Engagement shares count
    const eventsData = analyticsEventsRes.data || [];
    const totalShares = eventsData.filter((e) => e.event_type === 'certificate_share').length;

    // Aggregate Participation Trends Over Time (by date string YYYY-MM-DD)
    const timelineData = registrationsTimelineRes.data || [];
    const trendsByDate = {};

    timelineData.forEach((item) => {
      if (item.created_at) {
        const dateStr = new Date(item.created_at).toISOString().split('T')[0];
        if (!trendsByDate[dateStr]) {
          trendsByDate[dateStr] = { registrations: 0, submissions: 0, certs: 0 };
        }
        trendsByDate[dateStr].registrations += 1;
      }
    });

    eventsData.forEach((item) => {
      if (item.created_at) {
        const dateStr = new Date(item.created_at).toISOString().split('T')[0];
        if (!trendsByDate[dateStr]) {
          trendsByDate[dateStr] = { registrations: 0, submissions: 0, certs: 0 };
        }
        if (item.event_type === 'submission') trendsByDate[dateStr].submissions += 1;
        if (item.event_type === 'certificate_issued') trendsByDate[dateStr].certs += 1;
      }
    });

    const sortedDates = Object.keys(trendsByDate).sort();

    return NextResponse.json({
      funnel: {
        totalRegistrations,
        totalSubmissions,
        totalCertificatesIssued: totalCertificates,
        activeCertificates,
        regToSubConversionRate: Number(regToSubConversion),
        subToCertConversionRate: Number(subToCertConversion),
      },
      engagement: {
        verificationViews,
        totalShares,
        activeRate: totalCertificates > 0 ? ((activeCertificates / totalCertificates) * 100).toFixed(1) : 100,
      },
      trends: {
        dates: sortedDates,
        registrations: sortedDates.map((d) => trendsByDate[d].registrations),
        submissions: sortedDates.map((d) => trendsByDate[d].submissions),
        certificates: sortedDates.map((d) => trendsByDate[d].certs),
      },
    });
  } catch (err) {
    console.error('[GET /api/analytics] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/analytics/track
 * Track custom analytics events (e.g. certificate shares)
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { eventType, eventId, metadata = {} } = body;

    if (!eventType) {
      return NextResponse.json({ error: 'eventType is required' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    await adminClient.from('analytics_events').insert({
      event_id: eventId || null,
      event_type: eventType,
      metadata,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/analytics] Error:', err);
    return NextResponse.json({ error: 'Failed to record analytics event' }, { status: 500 });
  }
}
