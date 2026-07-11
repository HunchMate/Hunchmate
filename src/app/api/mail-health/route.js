import { NextResponse } from 'next/server';
import { getMailProvider, getMailConfigIssues, getResendWarnings } from '@/lib/mail-utils';

export async function GET() {
  const provider = getMailProvider();
  const issues = getMailConfigIssues(provider);
  const warnings = provider === 'resend' ? getResendWarnings() : [];
  
  return NextResponse.json({
    ok: true,
    service: 'hunchmate-invite-mailer (nextjs-api)',
    provider,
    mailConfigured: issues.length === 0,
    issues,
    warnings,
  });
}
