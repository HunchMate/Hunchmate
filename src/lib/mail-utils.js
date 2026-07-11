import nodemailer from 'nodemailer';
import { z } from 'zod';

export const invitationSchema = z.object({
  to: z.string().email().max(320),
  invitedEmail: z.string().email().max(320).optional(),
  inviterName: z.string().trim().max(120).optional(),
  teamName: z.string().trim().max(120).optional(),
  eventTitle: z.string().trim().min(1).max(180),
  joinUrl: z.string().url().max(2048),
});

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320),
  subject: z.string().trim().min(1).max(180),
  message: z.string().trim().min(1).max(4000),
});

export const resetPasswordSchema = z.object({
  email: z.string().email().max(320),
  resetLink: z.string().url(),
});

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeString(value) {
  return String(value || '').trim();
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function hasPlaceholder(value) {
  const normalized = String(value || '').toLowerCase();
  return (
    normalized.includes('your-smtp') ||
    normalized.includes('your-resend') ||
    normalized.includes('example.com') ||
    normalized.includes('<set-')
  );
}

export function getMailProvider() {
  return String(process.env.MAIL_PROVIDER || 'smtp').trim().toLowerCase();
}

export function getMailConfigIssues(provider) {
  const issues = [];
  let keys = [];

  if (provider === 'resend') {
    keys = ['RESEND_API_KEY', 'RESEND_FROM'];
  } else if (provider === 'smtp') {
    keys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
  } else {
    return [`Unsupported MAIL_PROVIDER: ${provider}. Use smtp or resend.`];
  }

  keys.forEach((key) => {
    const value = process.env[key];
    if (!value) {
      issues.push(`Missing ${key}`);
      return;
    }
    if (hasPlaceholder(value)) {
      issues.push(`${key} still has placeholder value`);
    }
  });

  return issues;
}

export function getResendWarnings() {
  const warnings = [];
  const resendFrom = String(process.env.RESEND_FROM || '').toLowerCase();
  if (resendFrom.includes('onboarding@resend.dev')) {
    warnings.push('Using onboarding@resend.dev is sandbox mode. Verify your domain in Resend and use a domain sender to deliver invites to teammates.');
  }
  return warnings;
}

export function buildInvitationEmail({ inviterName, teamName, eventTitle, invitedEmail, to, joinUrl }) {
  const invitee = invitedEmail || to;
  const safeInviterName = escapeHtml(inviterName || 'A teammate');
  const safeTeamName = escapeHtml(teamName || 'a team');
  const safeEventTitle = escapeHtml(eventTitle);
  const safeInvitee = escapeHtml(invitee);
  const safeJoinUrl = escapeHtml(joinUrl);
  const subject = `Hunchmate Team Invite: ${eventTitle}`;
  const html = `
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02);">
            <tr>
              <td style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); padding: 32px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">Hunchmate</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px;">
                <h2 style="margin: 0 0 20px; color: #0f172a; font-size: 18px; font-weight: 600;">Team Invitation</h2>
                <p style="margin: 0 0 12px; color: #334155; font-size: 15px; line-height: 1.6;">
                  <strong>${safeInviterName}</strong> has invited you to join the team <strong style="color: #0f172a;">${safeTeamName}</strong> for the event <strong>${safeEventTitle}</strong>.
                </p>
                <p style="margin: 0 0 28px; color: #64748b; font-size: 14px;">
                  Invited email: ${safeInvitee}
                </p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <a href="${safeJoinUrl}" style="display: inline-block; padding: 12px 28px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; text-align: center;">
                        Accept Invitation
                      </a>
                    </td>
                  </tr>
                </table>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
                <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5; text-align: center;">
                  If you are already registered on Hunchmate, you can accept directly.<br>
                  If not, you will be asked to log in or sign up first.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
  const text = `${normalizeString(inviterName) || 'A teammate'} invited you to join ${normalizeString(teamName) || 'a team'} for ${normalizeString(eventTitle)}. Join here: ${normalizeString(joinUrl)}`;

  return { subject, html, text };
}

export function getContactNotificationTarget() {
  return String(process.env.CONTACT_FORM_TO || process.env.RESEND_FROM || process.env.SMTP_FROM || '').trim();
}

export function buildContactEmail({ name, email, subject, message }) {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replaceAll('\n', '<br />');
  const mailSubject = `New Contact Request: ${subject}`;

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.55;">
      <h2 style="margin: 0 0 12px;">New Contact Form Submission</h2>
      <p style="margin: 0 0 8px;"><strong>Name:</strong> ${safeName}</p>
      <p style="margin: 0 0 8px;"><strong>Email:</strong> ${safeEmail}</p>
      <p style="margin: 0 0 8px;"><strong>Subject:</strong> ${safeSubject}</p>
      <p style="margin: 0 0 6px;"><strong>Message:</strong></p>
      <div style="padding: 10px 12px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0;">
        ${safeMessage}
      </div>
    </div>
  `;

  const text = [
    'New Contact Form Submission',
    `Name: ${normalizeString(name)}`,
    `Email: ${normalizeString(email)}`,
    `Subject: ${normalizeString(subject)}`,
    `Message: ${normalizeString(message)}`,
  ].join('\n');

  return { subject: mailSubject, html, text };
}

export function buildResetPasswordEmail({ email, resetLink }) {
  const safeEmail = escapeHtml(email);
  const safeResetLink = escapeHtml(resetLink);
  const subject = `Reset Your Hunchmate Password`;

  const html = `
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02);">
            <tr>
              <td style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); padding: 32px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">Hunchmate</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px;">
                <h2 style="margin: 0 0 20px; color: #0f172a; font-size: 18px; font-weight: 600;">Reset Your Password</h2>
                <p style="margin: 0 0 12px; color: #334155; font-size: 15px; line-height: 1.6;">
                  We received a request to reset the password for your Hunchmate account (<strong>${safeEmail}</strong>).
                </p>
                <p style="margin: 0 0 28px; color: #64748b; font-size: 14px;">
                  If you didn't request this, you can safely ignore this email.
                </p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <a href="${safeResetLink}" style="display: inline-block; padding: 12px 28px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; text-align: center;">
                        Reset Password
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  const text = `Reset your Hunchmate password. Click here to reset it: ${normalizeString(resetLink)} \n\nIf you didn't request this, you can safely ignore this email.`;

  return { subject, html, text };
}

export async function sendViaSmtp({ to, subject, html }) {
  const host = requiredEnv('SMTP_HOST');
  const smtpPort = Number(requiredEnv('SMTP_PORT'));
  const user = requiredEnv('SMTP_USER');
  const pass = requiredEnv('SMTP_PASS');

  const transporter = nodemailer.createTransport({
    host,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user, pass },
  });

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });
  return { messageId: info.messageId };
}

export async function sendViaResend({ to, subject, html, text }) {
  const apiKey = requiredEnv('RESEND_API_KEY');
  const from = requiredEnv('RESEND_FROM');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.message || payload?.error || `Resend request failed with status ${response.status}`;
    throw new Error(message);
  }

  return { messageId: payload?.id || 'resend-message' };
}
