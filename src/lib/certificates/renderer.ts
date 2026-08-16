import crypto from 'crypto';

export interface CertificateTemplateData {
  participantName: string;
  eventTitle: string;
  issueDate: string;
  certificateId: string;
  recipientRole?: string;
  issuerName?: string;
  issuerTitle?: string;
  organizationName?: string;
  customFields?: Record<string, string>;
}

/**
 * Generate SHA-256 integrity hash for certificate anti-tamper verification.
 */
export function generateIntegrityHash(data: {
  certificateId: string;
  userId: string;
  eventId: string;
  participantName: string;
  eventTitle: string;
  issueDate: string;
}): string {
  const secretSalt = process.env.CERTIFICATE_SECRET_SALT || 'HUNCHMATE_CERT_SECURE_SALT_2026';
  const payload = `${data.certificateId}|${data.userId}|${data.eventId}|${data.participantName}|${data.eventTitle}|${data.issueDate}|${secretSalt}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Render dynamic template fields replacing {{placeholder}} tokens.
 */
export function renderCertificateTemplate(
  templateString: string,
  data: CertificateTemplateData
): string {
  if (!templateString) return '';
  
  let rendered = templateString;
  const replacements: Record<string, string> = {
    '{{participant_name}}': data.participantName || '',
    '{{event_title}}': data.eventTitle || '',
    '{{issue_date}}': data.issueDate || '',
    '{{certificate_id}}': data.certificateId || '',
    '{{recipient_role}}': data.recipientRole || 'Participant',
    '{{issuer_name}}': data.issuerName || 'Hunchmate Certification Board',
    '{{issuer_title}}': data.issuerTitle || 'Lead Organizer',
    '{{organization_name}}': data.organizationName || 'Hunchmate Platform',
    ...Object.entries(data.customFields || {}).reduce((acc, [k, v]) => {
      acc[`{{${k}}}`] = v;
      return acc;
    }, {} as Record<string, string>),
  };

  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(key.replace(/[-[\]{}()*+?.:=\\^$|#\s]/g, '\\$&'), 'g');
    rendered = rendered.replace(regex, value);
  }

  return rendered;
}

/**
 * Constructs the public verification URL for dynamic QR code.
 */
export function getVerificationUrl(certificateId: string, origin?: string): string {
  const baseUrl = origin || process.env.NEXT_PUBLIC_APP_URL || 'https://hunchmate.com';
  return `${baseUrl}/verify/${encodeURIComponent(certificateId)}`;
}
