import { NextResponse } from 'next/server';
import {
  getMailProvider,
  getMailConfigIssues,
  invitationSchema,
  buildInvitationEmail,
  sendViaResend,
  sendViaSmtp,
  getResendWarnings,
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
    const validation = invitationSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues.map((issue) => issue.message).join(', '),
        },
        { status: 400 }
      );
    }

    const {
      to,
      invitedEmail,
      inviterName,
      teamName,
      eventTitle,
      joinUrl,
    } = validation.data;

    const emailPayload = buildInvitationEmail({
      to,
      invitedEmail,
      inviterName,
      teamName,
      eventTitle,
      joinUrl,
    });

    const deliveryResult =
      provider === 'resend'
        ? await sendViaResend({ to, ...emailPayload })
        : await sendViaSmtp({ to, ...emailPayload });

    const warnings = provider === 'resend' ? getResendWarnings() : [];
    
    return NextResponse.json({
      success: true,
      provider,
      messageId: deliveryResult.messageId,
      warnings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to send invitation email.',
      },
      { status: 500 }
    );
  }
}
