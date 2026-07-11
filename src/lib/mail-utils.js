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
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.55;">
        <h2 style="margin: 0 0 12px;">You are invited to join a Hunchmate team</h2>
        <p style="margin: 0 0 8px;">
          <strong>${safeInviterName}</strong> invited you to join
          <strong>${safeTeamName}</strong> for
          <strong>${safeEventTitle}</strong>.
        </p>
        <p style="margin: 0 0 18px; color: #334155;">
          Invited email: ${safeInvitee}
        </p>
        <a href="${safeJoinUrl}" style="display:inline-block;padding:10px 14px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
          Join Team
        </a>
        <p style="margin: 18px 0 0; color: #64748b; font-size: 13px;">
          If you are already registered on Hunchmate, you can accept directly.
          If not, you will be asked to log in or sign up first.
        </p>
      </div>
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
