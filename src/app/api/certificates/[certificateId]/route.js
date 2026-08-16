import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { generateCertificatePdf } from '@/lib/certificates/pdf-generator';

function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) throw new Error('Missing Supabase Service Key');
  return createServiceClient(supabaseUrl, serviceKey);
}

/**
 * GET /api/certificates/:certificateId
 * Query params: ?format=pdf to download PDF stream
 */
export async function GET(request, { params }) {
  try {
    const { certificateId } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');

    const adminClient = getAdminClient();
    const { data: cert, error } = await adminClient
      .from('certificates')
      .select('*')
      .eq('id', certificateId)
      .single();

    if (error || !cert) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    // Return PDF binary stream if format === 'pdf'
    if (format === 'pdf') {
      const issueDateStr = cert.issue_date ? new Date(cert.issue_date).toLocaleDateString() : '';
      const doc = generateCertificatePdf({
        templateData: {
          participantName: cert.participant_name,
          eventTitle: cert.event_title,
          issueDate: issueDateStr,
          certificateId: cert.id,
          recipientRole: cert.template_data?.recipientRole || 'Participant',
        },
        integrityHash: cert.integrity_hash,
        issuerName: cert.template_data?.issuerName || 'Hunchmate Board',
        issuerTitle: cert.template_data?.issuerTitle || 'Issuing Authority',
      });

      const pdfArrayBuffer = doc.output('arraybuffer');
      return new NextResponse(pdfArrayBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${cert.id}.pdf"`,
        },
      });
    }

    return NextResponse.json({ certificate: cert });
  } catch (err) {
    console.error('[GET /api/certificates/:id] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch certificate details' }, { status: 500 });
  }
}
