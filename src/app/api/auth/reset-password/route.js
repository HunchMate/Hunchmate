import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import {
  getMailProvider,
  getMailConfigIssues,
  resetPasswordSchema,
  buildResetPasswordEmail,
  sendViaResend,
  sendViaSmtp,
} from '@/lib/mail-utils';

export async function POST(request) {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
    }

    const provider = getMailProvider();
    const issues = getMailConfigIssues(provider);
    
    if (issues.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `${provider.toUpperCase()} is not configured correctly: ${issues.join(', ')}.`,
        },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    
    // Create Supabase Admin client to generate the reset link
    const adminClient = createServiceClient(supabaseUrl, serviceKey);

    const { email } = body;
    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    // Generate link (we pass a generic redirectTo, though Supabase will still encode it in the hash)
    // Actually, generateLink returns the raw ActionLink which we can mail!
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hunchmate.com/reset-password?mode=recovery'
      }
    });

    if (error) {
      console.error('generateLink error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // The generated link directly authenticates the user and redirects to redirectTo
    const resetLink = data.properties.action_link;

    const emailPayload = buildResetPasswordEmail({
      email,
      resetLink,
    });

    const deliveryResult =
      provider === 'resend'
        ? await sendViaResend({ to: email, ...emailPayload })
        : await sendViaSmtp({ to: email, ...emailPayload });

    return NextResponse.json({
      success: true,
      messageId: deliveryResult.messageId,
    });
  } catch (error) {
    console.error('Reset password email error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to send reset password email.',
      },
      { status: 500 }
    );
  }
}
