import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

const app = express();
const port = Number(process.env.PORT || process.env.MAIL_API_PORT || 8787);
const defaultOrigin = 'http://localhost:5173';

app.disable('x-powered-by');
app.set('trust proxy', 1);

function getAllowedOrigins() {
  const raw = String(
    process.env.MAIL_API_ALLOWED_ORIGIN
    || process.env.FRONTEND_URL
    || process.env.CORS_ORIGIN
    || defaultOrigin,
  );
  return raw
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  const normalizedOrigin = String(origin).trim().replace(/\/+$/, '');
  return getAllowedOrigins().includes(normalizedOrigin);
}

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin not allowed by mail API CORS policy.'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  maxAge: 600,
}));
app.use(helmet());
app.use((_, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use(express.json({ limit: '20kb' }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 400,
  standardHeaders: true,
  legacyHeaders: false,
});

const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many invitation attempts. Please wait and try again later.',
  },
});

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many contact requests. Please wait and try again later.',
  },
});

app.use('/api', globalLimiter);
app.use('/api/invitations/email', inviteLimiter);
app.use('/api/contact/email', contactLimiter);

const invitationSchema = z.object({
  to: z.string().email().max(320),
  invitedEmail: z.string().email().max(320).optional(),
  inviterName: z.string().trim().max(120).optional(),
  teamName: z.string().trim().max(120).optional(),
  eventTitle: z.string().trim().min(1).max(180),
  joinUrl: z.string().url().max(2048),
});

const contactSchema = z.object({
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

function getMailProvider() {
  return String(process.env.MAIL_PROVIDER || 'smtp').trim().toLowerCase();
}

function getSmtpConfigIssues() {
  const keys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
  const issues = [];

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

function getResendConfigIssues() {
  const keys = ['RESEND_API_KEY', 'RESEND_FROM'];
  const issues = [];

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

function getResendWarnings() {
  const warnings = [];
  const resendFrom = String(process.env.RESEND_FROM || '').toLowerCase();
  if (resendFrom.includes('onboarding@resend.dev')) {
    warnings.push('Using onboarding@resend.dev is sandbox mode. It can be limited for external recipients. Verify your domain in Resend and use a domain sender to deliver invites to teammates.');
  }
  return warnings;
}

function getMailConfigIssues(provider) {
  if (provider === 'resend') {
    return getResendConfigIssues();
  }
  if (provider === 'smtp') {
    return getSmtpConfigIssues();
  }
  return [`Unsupported MAIL_PROVIDER: ${provider}. Use smtp or resend.`];
}

function createTransporter() {
  const host = requiredEnv('SMTP_HOST');
  const smtpPort = Number(requiredEnv('SMTP_PORT'));
  const user = requiredEnv('SMTP_USER');
  const pass = requiredEnv('SMTP_PASS');

  return nodemailer.createTransport({
    host,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user, pass },
  });
}

function buildInvitationEmail({ inviterName, teamName, eventTitle, invitedEmail, to, joinUrl }) {
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

function getContactNotificationTarget() {
  return String(process.env.CONTACT_FORM_TO || process.env.RESEND_FROM || process.env.SMTP_FROM || '').trim();
}

function buildContactEmail({ name, email, subject, message }) {
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

async function sendViaSmtp({ to, subject, html }) {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });
  return { messageId: info.messageId };
}

async function sendViaResend({ to, subject, html, text }) {
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

app.get('/api/health', (_req, res) => {
  const provider = getMailProvider();
  const issues = getMailConfigIssues(provider);
  const warnings = provider === 'resend' ? getResendWarnings() : [];
  res.json({
    ok: true,
    service: 'hunchmate-invite-mailer',
    provider,
    mailConfigured: issues.length === 0,
    issues,
    warnings,
  });
});

app.post('/api/invitations/email', async (req, res) => {
  try {
    const provider = getMailProvider();
    const issues = getMailConfigIssues(provider);
    if (issues.length > 0) {
      return res.status(500).json({
        success: false,
        error: `${provider.toUpperCase()} is not configured correctly: ${issues.join(', ')}. Update .env and restart npm run mail-api.`,
      });
    }

    const validation = invitationSchema.safeParse(req.body || {});
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.issues.map((issue) => issue.message).join(', '),
      });
    }

    if (!isAllowedOrigin(req.get('origin'))) {
      return res.status(403).json({
        success: false,
        error: 'Request origin is not allowed.',
      });
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

    const deliveryResult = provider === 'resend'
      ? await sendViaResend({ to, ...emailPayload })
      : await sendViaSmtp({ to, ...emailPayload });

    const warnings = provider === 'resend' ? getResendWarnings() : [];
    return res.json({ success: true, provider, messageId: deliveryResult.messageId, warnings });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unable to send invitation email.',
    });
  }
});

app.post('/api/contact/email', async (req, res) => {
  try {
    const provider = getMailProvider();
    const issues = getMailConfigIssues(provider);
    if (issues.length > 0) {
      return res.status(500).json({
        success: false,
        error: `${provider.toUpperCase()} is not configured correctly: ${issues.join(', ')}. Update .env and restart npm run mail-api.`,
      });
    }

    if (!isAllowedOrigin(req.get('origin'))) {
      return res.status(403).json({
        success: false,
        error: 'Request origin is not allowed.',
      });
    }

    const validation = contactSchema.safeParse(req.body || {});
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.issues.map((issue) => issue.message).join(', '),
      });
    }

    const to = getContactNotificationTarget();
    if (!to) {
      return res.status(500).json({
        success: false,
        error: 'Missing CONTACT_FORM_TO (or RESEND_FROM/SMTP_FROM) for contact notifications.',
      });
    }

    const emailPayload = buildContactEmail(validation.data);
    const deliveryResult = provider === 'resend'
      ? await sendViaResend({ to, ...emailPayload })
      : await sendViaSmtp({ to, ...emailPayload });

    return res.json({ success: true, provider, messageId: deliveryResult.messageId });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unable to send contact email.',
    });
  }
});

app.use((error, _req, res, next) => {
  if (error?.message === 'Origin not allowed by mail API CORS policy.') {
    return res.status(403).json({ success: false, error: error.message });
  }

  return next(error);
});

app.listen(port, () => {
  console.log(`Invite mail API running on http://localhost:${port}`);
});
