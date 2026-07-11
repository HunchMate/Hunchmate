import { NextResponse } from 'next/server';
import {
  getMailProvider,
  getMailConfigIssues,
  contactSchema,
  buildContactEmail,
  sendViaResend,
  sendViaSmtp,
  getContactNotificationTarget,
} from '@/lib/mail-utils';

export async function POST(request) {
  try {
    const provider = getMailProvider();
    const issues = getMailConfigIssues(provider);
    
    if (issues.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `${provider.toUpperCase()} is not configured correctly: ${issues.join(', ')}. Update environment variables.`,
        },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const validation = contactSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues.map((issue) => issue.message).join(', '),
        },
        { status: 400 }
      );
    }

    const to = getContactNotificationTarget();
    if (!to) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing CONTACT_FORM_TO (or RESEND_FROM/SMTP_FROM) for contact notifications.',
        },
        { status: 500 }
      );
    }

    const emailPayload = buildContactEmail(validation.data);
    
    const deliveryResult =
      provider === 'resend'
        ? await sendViaResend({ to, ...emailPayload })
        : await sendViaSmtp({ to, ...emailPayload });

    return NextResponse.json({
      success: true,
      provider,
      messageId: deliveryResult.messageId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to send contact email.',
      },
      { status: 500 }
    );
  }
}
