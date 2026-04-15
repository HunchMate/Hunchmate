import 'dotenv/config.js';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { promises as fs } from 'fs';
import path from 'path';
import { ObjectId } from 'mongodb';
import { OAuth2Client } from 'google-auth-library';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { connectToDatabase, getCachedDb } from './db.js';

const app = express();
const port = Number(process.env.PORT || process.env.AUTH_API_PORT || 5001);
const IS_PRODUCTION = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
const BODY_LIMIT = process.env.AUTH_BODY_LIMIT || '8mb';
const MEDIA_UPLOAD_DIR = path.resolve(process.cwd(), 'server', 'uploads');
const MAX_INLINE_MEDIA_BYTES = Number(process.env.MAX_INLINE_MEDIA_BYTES || 1 * 1024 * 1024);
const DATA_URL_PATTERN = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\n\r]+)$/;
const REQUEST_MAX_DEPTH = Number(process.env.REQUEST_MAX_DEPTH || 8);
const REQUEST_MAX_OBJECT_KEYS = Number(process.env.REQUEST_MAX_OBJECT_KEYS || 200);
const REQUEST_MAX_ARRAY_ITEMS = Number(process.env.REQUEST_MAX_ARRAY_ITEMS || 200);
const REQUEST_MAX_STRING_LENGTH = Number(process.env.REQUEST_MAX_STRING_LENGTH || 12000);
const REQUEST_MAX_QUERY_LENGTH = Number(process.env.REQUEST_MAX_QUERY_LENGTH || 512);
const MAX_DATA_URL_LENGTH = Math.ceil((MAX_INLINE_MEDIA_BYTES * 4) / 3) + 256;

const rawAllowedOrigins = String(
  process.env.FRONTEND_URL
  || process.env.CORS_ORIGIN
  || 'http://localhost:5173,http://localhost:5174',
);

const allowedOrigins = rawAllowedOrigins
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);
const adminEmails = String(process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => String(email || '').trim().toLowerCase())
  .filter(Boolean);

const emailSchema = z.string().trim().email().max(320);
const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
const signupSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(120),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'Terms and Conditions must be accepted.' }),
  }),
  termsAcceptedAt: z.string().datetime().optional(),
  role: z.enum(['participant', 'organizer', 'admin']).optional(),
  avatar: z.string().max(MAX_DATA_URL_LENGTH).optional(),
  avatarBackdrop: z.string().max(200).optional(),
  bio: z.string().max(1200).optional(),
  institution: z.string().max(160).optional(),
  organizationName: z.string().max(160).optional(),
  location: z.string().max(160).optional(),
  headline: z.string().max(180).optional(),
  website: z.string().max(512).optional(),
  skills: z.union([z.array(z.string().max(80)).max(80), z.string().max(2000)]).optional(),
  profileType: z.enum(['student', 'working_professional']).optional(),
  stream: z.string().max(120).optional(),
  graduationYear: z.string().max(16).optional(),
  institutionName: z.string().max(160).optional(),
  hostType: z.string().max(80).optional(),
  phoneNumber: z.string().max(40).optional(),
  hostOnboardingCompleted: z.boolean().optional(),
  state: z.string().max(120).optional(),
  city: z.string().max(120).optional(),
  experience: z.string().max(120).optional(),
  techProficiency: z.string().max(120).optional(),
  workSummary: z.string().max(1000).optional(),
  currentDesignation: z.string().max(140).optional(),
  onboardingCompleted: z.boolean().optional(),
  socials: z.object({
    linkedin: z.string().max(512).optional(),
    github: z.string().max(512).optional(),
    instagram: z.string().max(512).optional(),
  }).optional(),
});
const googleAuthSchema = z.object({
  credential: z.string().trim().min(20).max(6000),
  role: z.enum(['participant', 'organizer', 'admin']).optional(),
  profile: z.record(z.any()).optional(),
  termsAccepted: z.boolean().optional(),
  termsAcceptedAt: z.string().datetime().optional(),
});

function isPlainObject(value) {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function sanitizeString(input, maxLength) {
  const raw = String(input);
  let safe = '';
  for (const char of raw) {
    const code = char.charCodeAt(0);
    const isAllowedWhitespace = code === 9 || code === 10 || code === 13;
    if (isAllowedWhitespace || (code >= 32 && code !== 127)) {
      safe += char;
    }
  }
  const normalized = safe.trim();

  if (normalized.startsWith('data:image/')) {
    if (normalized.length > MAX_DATA_URL_LENGTH) {
      const error = new Error('Input is too large.');
      error.status = 413;
      throw error;
    }
    return normalized;
  }

  if (normalized.length > maxLength) {
    const error = new Error('Input is too large.');
    error.status = 413;
    throw error;
  }

  return normalized;
}

function sanitizeValue(value, options = {}, depth = 0) {
  if (depth > REQUEST_MAX_DEPTH) {
    const error = new Error('Input nesting is too deep.');
    error.status = 400;
    throw error;
  }

  const maxStringLength = options.maxStringLength || REQUEST_MAX_STRING_LENGTH;

  if (typeof value === 'string') {
    return sanitizeString(value, maxStringLength);
  }

  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length > REQUEST_MAX_ARRAY_ITEMS) {
      const error = new Error('Too many array items in request payload.');
      error.status = 413;
      throw error;
    }

    return value.map((item) => sanitizeValue(item, options, depth + 1));
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (entries.length > REQUEST_MAX_OBJECT_KEYS) {
      const error = new Error('Too many object keys in request payload.');
      error.status = 413;
      throw error;
    }

    const sanitized = {};
    for (const [rawKey, rawValue] of entries) {
      const key = sanitizeString(rawKey, 120);
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        const error = new Error('Malformed request payload.');
        error.status = 400;
        throw error;
      }

      sanitized[key] = sanitizeValue(rawValue, options, depth + 1);
    }

    return sanitized;
  }

  const error = new Error('Malformed request payload.');
  error.status = 400;
  throw error;
}

function parseBody(schema, payload) {
  const result = schema.safeParse(payload || {});
  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join(', ');
    const error = new Error(message || 'Invalid request payload.');
    error.status = 400;
    throw error;
  }

  return result.data;
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isAllowedDevOrigin(origin) {
  if (IS_PRODUCTION || !origin) return false;

  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname || '';
    const protocol = parsed.protocol || '';
    return protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

app.use(cors({
  origin(origin, callback) {
    // Allow non-browser requests and same-origin calls.
    if (!origin) return callback(null, true);
    const normalizedOrigin = String(origin).trim().replace(/\/+$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) return callback(null, true);
    if (isAllowedDevOrigin(origin)) return callback(null, true);
    return callback(new Error('CORS origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.disable('x-powered-by');
app.set('trust proxy', 1);

// Middleware
// Keep parser limits high enough for single poster/showcase base64 uploads.
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ limit: BODY_LIMIT, extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static(MEDIA_UPLOAD_DIR));

function sanitizeObjectEntriesInPlace(target, options) {
  for (const key of Object.keys(target)) {
    target[key] = sanitizeValue(target[key], options);
  }
}

function sanitizeArrayEntriesInPlace(target, options) {
  for (let index = 0; index < target.length; index += 1) {
    target[index] = sanitizeValue(target[index], options);
  }
}

app.use((req, res, next) => {
  try {
    if (isPlainObject(req.body)) {
      sanitizeObjectEntriesInPlace(req.body, { maxStringLength: REQUEST_MAX_STRING_LENGTH });
    } else if (Array.isArray(req.body)) {
      sanitizeArrayEntriesInPlace(req.body, { maxStringLength: REQUEST_MAX_STRING_LENGTH });
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

// Rate limiters using built-in IP detection
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.AUTH_ATTEMPT_LIMIT || (IS_PRODUCTION ? 10 : 40)),
  message: 'Too many auth attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  skipSuccessfulRequests: true,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again in 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  skipSuccessfulRequests: true,
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_PRODUCTION ? 80 : 400,
  message: 'Too many refresh attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
});

const allEndpointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.GLOBAL_RATE_LIMIT_MAX || (IS_PRODUCTION ? 240 : 1000)),
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.method === 'OPTIONS' || req.path === '/health',
});

app.use(allEndpointsLimiter);
app.use('/auth/login', loginLimiter);
app.use('/auth/google', loginLimiter);

const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

// JWT helpers
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('Missing required environment variable: JWT_SECRET');
}
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_TOKEN_TTL = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const REFRESH_COOKIE_NAME = process.env.AUTH_REFRESH_COOKIE_NAME || 'hunchmate_refresh';
const REFRESH_COOKIE_PATH = process.env.AUTH_REFRESH_COOKIE_PATH || '/auth';
function generateAccessToken(userId) {
  return jwt.sign(
    { userId, type: 'access', iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function generateRefreshToken(userId, sessionId) {
  return jwt.sign(
    { userId, sessionId, type: 'refresh', iat: Math.floor(Date.now() / 1000) },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL }
  );
}

function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PRODUCTION,
    path: REFRESH_COOKIE_PATH,
  };
}

function setRefreshCookie(res, refreshToken) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());
}

function issueTokens(userId, sessionId) {
  return {
    accessToken: generateAccessToken(userId),
    refreshToken: generateRefreshToken(userId, sessionId),
  };
}

async function createAuthSession(db, { userId, userAgent = '', ipAddress = '' }) {
  const sessionId = randomUUID();
  const createdAt = new Date();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.collection('auth_sessions').insertOne({
    sessionId,
    userId,
    createdAt,
    lastUsedAt: createdAt,
    expiresAt,
    revokedAt: null,
    userAgent,
    ipAddress,
  });

  const tokens = issueTokens(userId, sessionId);
  return { sessionId, ...tokens, expiresAt };
}

async function rotateAuthSession(db, { sessionId, userId, userAgent = '', ipAddress = '' }) {
  const nextSessionId = randomUUID();
  const now = new Date();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const result = await db.collection('auth_sessions').updateOne(
    { sessionId, userId, revokedAt: null },
    {
      $set: {
        sessionId: nextSessionId,
        lastUsedAt: now,
        expiresAt,
        userAgent,
        ipAddress,
      },
    }
  );

  if (!result.matchedCount) {
    throw new Error('Unable to rotate auth session');
  }

  const tokens = issueTokens(userId, nextSessionId);
  return { sessionId: nextSessionId, ...tokens, expiresAt };
}

async function revokeAuthSession(db, sessionId) {
  if (!sessionId) return;

  await db.collection('auth_sessions').updateOne(
    { sessionId },
    {
      $set: {
        revokedAt: new Date(),
      },
    }
  );
}

async function getSessionById(db, sessionId) {
  if (!sessionId) return null;
  return db.collection('auth_sessions').findOne({ sessionId, revokedAt: null });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function normalizeSocials(socials = {}) {
  return {
    linkedin: String(socials.linkedin || '').trim(),
    github: String(socials.github || '').trim(),
    instagram: String(socials.instagram || '').trim(),
  };
}

function normalizeSkills(skills) {
  if (Array.isArray(skills)) {
    return skills.map((skill) => String(skill || '').trim()).filter(Boolean);
  }

  if (typeof skills === 'string') {
    return skills
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeRole(role, options = {}) {
  const allowAdmin = Boolean(options.allowAdmin);
  if (allowAdmin && role === 'admin') return 'admin';
  return role === 'organizer' ? 'organizer' : 'participant';
}

function normalizeUserStatus(status) {
  return status === 'suspended' ? 'suspended' : 'active';
}

function normalizeComplaintStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'resolved') return 'resolved';
  if (value === 'in-progress' || value === 'in_progress' || value === 'progress') return 'in-progress';
  return 'raised';
}

function serializeComplaint(complaint) {
  if (!complaint) return null;

  return {
    ...complaint,
    _id: complaint._id?.toString?.() || complaint._id,
    status: normalizeComplaintStatus(complaint.status),
    history: Array.isArray(complaint.history) ? complaint.history : [],
  };
}

function shouldAssignAdminRole(email) {
  return adminEmails.includes(String(email || '').trim().toLowerCase());
}

function buildProfilePayload(source = {}, fallback = {}) {
  const socialsSource = source.socials || fallback.socials || {};
  const fallbackProfile = fallback.profile || {};

  return {
    avatar: source.avatar ?? fallback.avatar ?? '',
    avatarBackdrop: source.avatarBackdrop ?? fallback.avatarBackdrop ?? '',
    bio: source.bio ?? fallback.bio ?? '',
    institution: source.institution ?? fallback.institution ?? '',
    organizationName: source.organizationName ?? fallback.organizationName ?? '',
    location: source.location ?? fallback.location ?? '',
    headline: source.headline ?? fallback.headline ?? '',
    website: source.website ?? fallback.website ?? '',
    skills: normalizeSkills(source.skills ?? fallback.skills ?? []),
    profileType: source.profileType ?? fallback.profileType ?? fallbackProfile.profileType ?? '',
    stream: source.stream ?? fallback.stream ?? fallbackProfile.stream ?? '',
    graduationYear: source.graduationYear ?? fallback.graduationYear ?? fallbackProfile.graduationYear ?? '',
    institutionName: source.institutionName ?? fallback.institutionName ?? fallbackProfile.institutionName ?? '',
    hostType: source.hostType ?? fallback.hostType ?? fallbackProfile.hostType ?? '',
    phoneNumber: source.phoneNumber ?? fallback.phoneNumber ?? fallbackProfile.phoneNumber ?? '',
    hostOnboardingCompleted: source.hostOnboardingCompleted ?? fallback.hostOnboardingCompleted ?? fallbackProfile.hostOnboardingCompleted ?? false,
    state: source.state ?? fallback.state ?? fallbackProfile.state ?? '',
    city: source.city ?? fallback.city ?? fallbackProfile.city ?? '',
    experience: source.experience ?? fallback.experience ?? fallbackProfile.experience ?? '',
    techProficiency: source.techProficiency ?? fallback.techProficiency ?? fallbackProfile.techProficiency ?? '',
    workSummary: source.workSummary ?? fallback.workSummary ?? fallbackProfile.workSummary ?? '',
    currentDesignation: source.currentDesignation ?? fallback.currentDesignation ?? fallbackProfile.currentDesignation ?? '',
    onboardingCompleted: source.onboardingCompleted ?? fallback.onboardingCompleted ?? fallbackProfile.onboardingCompleted ?? false,
    socials: normalizeSocials(socialsSource),
  };
}

function serializeUser(user) {
  if (!user) return null;

  const profile = user.profile || {};

  return {
    id: user._id?.toString?.() || String(user.id || ''),
    email: user.email || '',
    name: user.name || '',
    role: normalizeRole(user.role, { allowAdmin: true }),
    status: normalizeUserStatus(user.status),
    provider: user.provider || 'local',
    authMethods: user.authMethods || ['password'],
    googleId: user.google?.sub || '',
    emailVerified: Boolean(user.emailVerified),
    avatar: user.avatar || profile.avatar || '',
    avatarBackdrop: user.avatarBackdrop || profile.avatarBackdrop || '',
    bio: user.bio || profile.bio || '',
    institution: user.institution || profile.institution || '',
    organizationName: user.organizationName || profile.organizationName || '',
    location: user.location || profile.location || '',
    headline: user.headline || profile.headline || '',
    website: user.website || profile.website || '',
    skills: Array.isArray(user.skills) ? user.skills : normalizeSkills(profile.skills || []),
    profileType: user.profileType || profile.profileType || '',
    stream: user.stream || profile.stream || '',
    graduationYear: user.graduationYear || profile.graduationYear || '',
    institutionName: user.institutionName || profile.institutionName || '',
    hostType: user.hostType || profile.hostType || '',
    phoneNumber: user.phoneNumber || profile.phoneNumber || '',
    hostOnboardingCompleted: Boolean(user.hostOnboardingCompleted ?? profile.hostOnboardingCompleted ?? false),
    state: user.state || profile.state || '',
    city: user.city || profile.city || '',
    experience: user.experience || profile.experience || '',
    techProficiency: user.techProficiency || profile.techProficiency || '',
    workSummary: user.workSummary || profile.workSummary || '',
    currentDesignation: user.currentDesignation || profile.currentDesignation || '',
    onboardingCompleted: Boolean(user.onboardingCompleted ?? profile.onboardingCompleted ?? false),
    socials: normalizeSocials(user.socials || profile.socials || {}),
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null,
    verified: Boolean(user.verified),
    profile: {
      avatar: user.avatar || profile.avatar || '',
      avatarBackdrop: user.avatarBackdrop || profile.avatarBackdrop || '',
      bio: user.bio || profile.bio || '',
      institution: user.institution || profile.institution || '',
      organizationName: user.organizationName || profile.organizationName || '',
      location: user.location || profile.location || '',
      headline: user.headline || profile.headline || '',
      website: user.website || profile.website || '',
      skills: Array.isArray(user.skills) ? user.skills : normalizeSkills(profile.skills || []),
      profileType: user.profileType || profile.profileType || '',
      stream: user.stream || profile.stream || '',
      graduationYear: user.graduationYear || profile.graduationYear || '',
      institutionName: user.institutionName || profile.institutionName || '',
      hostType: user.hostType || profile.hostType || '',
      phoneNumber: user.phoneNumber || profile.phoneNumber || '',
      hostOnboardingCompleted: Boolean(user.hostOnboardingCompleted ?? profile.hostOnboardingCompleted ?? false),
      state: user.state || profile.state || '',
      city: user.city || profile.city || '',
      experience: user.experience || profile.experience || '',
      techProficiency: user.techProficiency || profile.techProficiency || '',
      workSummary: user.workSummary || profile.workSummary || '',
      currentDesignation: user.currentDesignation || profile.currentDesignation || '',
      onboardingCompleted: Boolean(user.onboardingCompleted ?? profile.onboardingCompleted ?? false),
      socials: normalizeSocials(user.socials || profile.socials || {}),
      participant: {
        institution: user.institution || profile.institution || '',
      },
      host: {
        organizationName: user.organizationName || profile.organizationName || '',
        website: user.website || profile.website || '',
        location: user.location || profile.location || '',
        institutionName: user.institutionName || profile.institutionName || '',
        hostType: user.hostType || profile.hostType || '',
        phoneNumber: user.phoneNumber || profile.phoneNumber || '',
        state: user.state || profile.state || '',
        city: user.city || profile.city || '',
        hostOnboardingCompleted: Boolean(user.hostOnboardingCompleted ?? profile.hostOnboardingCompleted ?? false),
      },
    },
  };
}

function buildStoredUserDocument({
  email,
  name,
  role,
  provider = 'local',
  authMethods = ['password'],
  password,
  google = null,
  emailVerified = false,
  termsAcceptedAt = null,
  profile = {},
  createdAt = new Date(),
  verified = false,
}) {
  const normalizedProfile = buildProfilePayload(profile);

  return {
    email: String(email || '').toLowerCase(),
    name: String(name || '').trim(),
    role: normalizeRole(role, { allowAdmin: true }),
    status: normalizeUserStatus('active'),
    provider,
    authMethods,
    password,
    google,
    emailVerified,
    avatar: normalizedProfile.avatar,
    avatarBackdrop: normalizedProfile.avatarBackdrop,
    bio: normalizedProfile.bio,
    institution: normalizedProfile.institution,
    organizationName: normalizedProfile.organizationName,
    location: normalizedProfile.location,
    headline: normalizedProfile.headline,
    website: normalizedProfile.website,
    skills: normalizedProfile.skills,
    profileType: normalizedProfile.profileType,
    stream: normalizedProfile.stream,
    graduationYear: normalizedProfile.graduationYear,
    institutionName: normalizedProfile.institutionName,
    hostType: normalizedProfile.hostType,
    phoneNumber: normalizedProfile.phoneNumber,
    hostOnboardingCompleted: Boolean(normalizedProfile.hostOnboardingCompleted),
    state: normalizedProfile.state,
    city: normalizedProfile.city,
    experience: normalizedProfile.experience,
    techProficiency: normalizedProfile.techProficiency,
    workSummary: normalizedProfile.workSummary,
    currentDesignation: normalizedProfile.currentDesignation,
    onboardingCompleted: Boolean(normalizedProfile.onboardingCompleted),
    socials: normalizedProfile.socials,
    profile: {
      ...normalizedProfile,
      participant: {
        institution: normalizedProfile.institution,
      },
      host: {
        organizationName: normalizedProfile.organizationName,
        website: normalizedProfile.website,
        location: normalizedProfile.location,
        institutionName: normalizedProfile.institutionName,
        hostType: normalizedProfile.hostType,
        phoneNumber: normalizedProfile.phoneNumber,
        state: normalizedProfile.state,
        city: normalizedProfile.city,
        hostOnboardingCompleted: Boolean(normalizedProfile.hostOnboardingCompleted),
      },
    },
    termsAcceptedAt: termsAcceptedAt || createdAt,
    createdAt,
    updatedAt: new Date(),
    verified,
  };
}

function sanitizeEventCollectionName(eventId) {
  const safe = String(eventId || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `event_${safe || randomUUID().replace(/-/g, '_')}`;
}

function generateEventId() {
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isValidOrganizerContactEmail(email) {
  return /^\S+@\S+\.\S+$/.test(String(email || '').trim());
}

function isValidOrganizerContactPhone(phone) {
  return /^\d{10}$/.test(String(phone || '').trim());
}

function serializeEvent(event) {
  if (!event) return null;

  const organiser = event.organiser || event.organizer || {};

  return {
    ...event,
    organiser,
    organizer: event.organizer || organiser,
  };
}

function normalizeEventContentPayload(payload = {}) {
  const next = { ...(payload || {}) };

  const organiserSource = next.organiser || next.organizer || {};
  const normalizedOrganiser = {
    id: String(organiserSource?.id || '').trim(),
    name: String(organiserSource?.name || '').trim(),
    logo: String(organiserSource?.logo || '').trim(),
    email: String(organiserSource?.email || next.organizerContactEmail || '').trim(),
    phone: String(organiserSource?.phone || next.organizerContactPhone || '').trim(),
  };

  next.organiser = normalizedOrganiser;
  next.organizer = {
    ...(next.organizer || {}),
    ...normalizedOrganiser,
  };
  next.organizerContactEmail = normalizedOrganiser.email;
  next.organizerContactPhone = normalizedOrganiser.phone;

  const themesSource = Array.isArray(next.themes)
    ? next.themes
    : Array.isArray(next.tags)
      ? next.tags
      : typeof next.themes === 'string'
        ? next.themes.split(',')
        : [];

  const normalizedThemes = themesSource
    .map((entry) => String(entry || '').trim())
    .filter(Boolean);

  next.themes = normalizedThemes;
  next.tags = normalizedThemes;

  next.timelineItems = Array.isArray(next.timelineItems)
    ? next.timelineItems
        .map((item) => ({
          title: String(item?.title || '').trim(),
          date: String(item?.date || item?.time || '').trim(),
          description: String(item?.description || '').trim(),
        }))
        .filter((item) => item.title || item.date || item.description)
    : [];

  next.problemStatements = Array.isArray(next.problemStatements)
    ? next.problemStatements
        .map((entry) => {
          if (typeof entry === 'string') {
            return {
              psId: '',
              psDescription: '',
              psStatement: String(entry || '').trim(),
            };
          }

          return {
            psId: String(entry?.psId || '').trim(),
            psDescription: String(entry?.psDescription || entry?.description || '').trim(),
            psStatement: String(entry?.psStatement || entry?.statement || entry?.title || '').trim(),
          };
        })
        .filter((entry) => entry.psId || entry.psDescription || entry.psStatement)
    : [];

  next.subEvents = Array.isArray(next.subEvents)
    ? next.subEvents
        .map((subEvent) => ({
          title: String(subEvent?.title || '').trim(),
          startDate: String(subEvent?.startDate || '').trim(),
          endDate: String(subEvent?.endDate || '').trim(),
          description: String(subEvent?.description || '').trim(),
          milestones: Array.isArray(subEvent?.milestones)
            ? subEvent.milestones
                .map((milestone) => ({
                  title: String(milestone?.title || '').trim(),
                  date: String(milestone?.date || '').trim(),
                  description: String(milestone?.description || '').trim(),
                }))
                .filter((milestone) => milestone.title || milestone.date || milestone.description)
            : [],
        }))
        .filter((subEvent) => subEvent.title || subEvent.startDate || subEvent.endDate || subEvent.description || subEvent.milestones.length > 0)
    : [];

  return next;
}

function extensionFromMime(mimeType) {
  const normalized = String(mimeType || '').toLowerCase();
  if (normalized === 'image/jpeg' || normalized === 'image/jpg') return 'jpg';
  if (normalized === 'image/png') return 'png';
  if (normalized === 'image/webp') return 'webp';
  if (normalized === 'image/gif') return 'gif';
  if (normalized === 'image/svg+xml') return 'svg';
  return 'bin';
}

function buildUploadUrl(req, fileName) {
  return `${req.protocol}://${req.get('host')}/uploads/${fileName}`;
}

async function persistDataUrlImage(req, value, eventId, slotName) {
  const raw = String(value || '').trim();
  const match = raw.match(DATA_URL_PATTERN);
  if (!match) return value;

  const mimeType = match[1];
  const base64Payload = match[2].replace(/\s+/g, '');
  const estimatedBytes = Math.floor((base64Payload.length * 3) / 4);

  if (estimatedBytes > MAX_INLINE_MEDIA_BYTES) {
    const maxMb = Math.floor(MAX_INLINE_MEDIA_BYTES / (1024 * 1024));
    const error = new Error(`Image exceeds ${maxMb}MB upload limit.`);
    error.status = 413;
    throw error;
  }

  await fs.mkdir(MEDIA_UPLOAD_DIR, { recursive: true });

  const fileExtension = extensionFromMime(mimeType);
  const safeEventId = String(eventId || randomUUID())
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
  const fileName = `${safeEventId}_${slotName}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${fileExtension}`;
  const filePath = path.join(MEDIA_UPLOAD_DIR, fileName);

  await fs.writeFile(filePath, Buffer.from(base64Payload, 'base64'));
  return buildUploadUrl(req, fileName);
}

async function normalizeEventMediaPayload(req, payload, eventId) {
  const next = { ...(payload || {}) };

  next.posterImage = await persistDataUrlImage(req, next.posterImage, eventId, 'poster');
  next.showcaseImage = await persistDataUrlImage(req, next.showcaseImage, eventId, 'showcase');

  if (Array.isArray(next.bannerImages) && next.bannerImages.length > 0) {
    next.bannerImages = [await persistDataUrlImage(req, next.bannerImages[0], eventId, 'banner')];
  }

  if (Array.isArray(next.galleryImages) && next.galleryImages.length > 0) {
    next.galleryImages = [await persistDataUrlImage(req, next.galleryImages[0], eventId, 'gallery')];
  }

  if (next.media && typeof next.media === 'object') {
    const media = { ...next.media };

    if (Array.isArray(media.banners) && media.banners.length > 0) {
      media.banners = [await persistDataUrlImage(req, media.banners[0], eventId, 'media_banner')];
    }

    if (Array.isArray(media.gallery) && media.gallery.length > 0) {
      media.gallery = [await persistDataUrlImage(req, media.gallery[0], eventId, 'media_gallery')];
    }

    next.media = media;
  }

  if (next.credentialConfig && typeof next.credentialConfig === 'object') {
    const credentialConfig = { ...next.credentialConfig };
    credentialConfig.logoUrl = await persistDataUrlImage(req, credentialConfig.logoUrl, eventId, 'cert_logo');
    credentialConfig.sponsorLogoUrl = await persistDataUrlImage(req, credentialConfig.sponsorLogoUrl, eventId, 'cert_sponsor');
    next.credentialConfig = credentialConfig;
  }

  return next;
}

async function findExistingUser(usersCollection, email, googleSub) {
  const normalizedEmail = String(email || '').toLowerCase();
  const filters = [{ email: normalizedEmail }];

  if (googleSub) {
    filters.unshift({ 'google.sub': googleSub });
  }

  return usersCollection.findOne({ $or: filters });
}

// Auth middleware
async function authenticateTokenWithOptions(req, res, next, options = {}) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const allowSuspended = Boolean(options.allowSuspended);

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const decoded = verifyToken(token);
  if (!decoded || decoded.type !== 'access') {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  try {
    const db = getCachedDb();
    const usersCollection = db.collection('users');
    const authUser = await usersCollection.findOne(
      { _id: new ObjectId(decoded.userId) },
      { projection: { role: 1, status: 1, email: 1, name: 1 } }
    );

    if (!authUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!allowSuspended && normalizeUserStatus(authUser.status) === 'suspended') {
      return res.status(403).json({ error: 'Your account is suspended. Contact support.' });
    }

    req.userId = decoded.userId;
    req.authUser = {
      id: decoded.userId,
      role: normalizeRole(authUser.role, { allowAdmin: true }),
      status: normalizeUserStatus(authUser.status),
      email: authUser.email || '',
      name: authUser.name || '',
    };
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

async function authenticateToken(req, res, next) {
  return authenticateTokenWithOptions(req, res, next, { allowSuspended: false });
}

async function authenticateTokenAllowSuspended(req, res, next) {
  return authenticateTokenWithOptions(req, res, next, { allowSuspended: true });
}

function requireAdmin(req, res, next) {
  if (!req.authUser || req.authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  return next();
}

async function logAdminAction(db, actorId, action, targetType, targetId, metadata = {}) {
  await db.collection('admin_audit_logs').insertOne({
    actorId: String(actorId || ''),
    action: String(action || ''),
    targetType: String(targetType || ''),
    targetId: String(targetId || ''),
    metadata,
    createdAt: new Date().toISOString(),
  });
}

// Routes

// Health check
app.get('/health', (req, res) => {
  const db = getCachedDb();
  res.json({
    status: 'ok',
    mongoDB: db ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// Keep API responsive when Mongo is temporarily unavailable.
app.use((req, res, next) => {
  if (req.path === '/health') {
    return next();
  }

  if (!getCachedDb()) {
    return res.status(503).json({
      error: 'Database unavailable. Retrying connection in background.',
    });
  }

  return next();
});

// Signup
app.post('/auth/signup', authLimiter, async (req, res) => {
  try {
    const {
      email,
      password,
      name,
      termsAcceptedAt,
      role,
      avatar,
      avatarBackdrop,
      bio,
      institution,
      organizationName,
      location,
      headline,
      website,
      skills,
      profileType,
      stream,
      graduationYear,
      institutionName,
      state,
      city,
      experience,
      techProficiency,
      workSummary,
      currentDesignation,
      onboardingCompleted,
      socials,
    } = parseBody(signupSchema, req.body);

    const db = getCachedDb();
    const usersCollection = db.collection('users');

    // Check if user already exists
    const existing = await usersCollection.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    const normalizedProfile = buildProfilePayload({
      avatar,
      avatarBackdrop,
      bio,
      institution,
      organizationName,
      location,
      headline,
      website,
      skills,
      profileType,
      stream,
      graduationYear,
      institutionName,
      state,
      city,
      experience,
      techProficiency,
      workSummary,
      currentDesignation,
      onboardingCompleted,
      socials,
    });

    // Create user
    const assignedRole = shouldAssignAdminRole(email) ? 'admin' : normalizeRole(role);
    const document = buildStoredUserDocument({
      email,
      name,
      role: assignedRole,
      provider: 'local',
      authMethods: ['password'],
      password: hashedPassword,
      termsAcceptedAt,
      profile: normalizedProfile,
      verified: false,
    });

    const result = await usersCollection.insertOne(document);

    const userId = result.insertedId.toString();
    const createdUser = { ...document, _id: result.insertedId };
    const session = await createAuthSession(db, {
      userId,
      userAgent: req.get('user-agent') || '',
      ipAddress: req.ip || '',
    });
    setRefreshCookie(res, session.refreshToken);

    res.status(201).json({
      success: true,
      userId,
      token: session.accessToken,
      user: serializeUser(createdUser),
    });
  } catch (error) {
    console.error('Signup error:', error);
    if (error?.status === 400 || error?.status === 413) {
      return res.status(error.status).json({ error: error.message || 'Invalid signup request' });
    }
    res.status(500).json({ error: 'Signup failed' });
  }
});

// Login
app.post('/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = parseBody(loginSchema, req.body);

    const db = getCachedDb();
    const usersCollection = db.collection('users');

    // Find user
    const user = await usersCollection.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (normalizeUserStatus(user.status) === 'suspended') {
      return res.status(403).json({ error: 'Your account is suspended. Contact support.' });
    }

    if (user.provider === 'google' && !user.password) {
      return res.status(400).json({ error: 'This account uses Google sign-in. Continue with Google.' });
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userId = user._id.toString();
    const session = await createAuthSession(db, {
      userId,
      userAgent: req.get('user-agent') || '',
      ipAddress: req.ip || '',
    });
    setRefreshCookie(res, session.refreshToken);

    res.json({
      success: true,
      userId,
      token: session.accessToken,
      user: serializeUser(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/auth/google', authLimiter, async (req, res) => {
  try {
    if (!googleClient) {
      return res.status(500).json({ error: 'Google auth is not configured' });
    }

    const {
      credential,
      role,
      profile = {},
      termsAccepted = false,
      termsAcceptedAt,
    } = parseBody(googleAuthSchema, req.body);

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      return res.status(400).json({ error: 'Google account email is unavailable' });
    }

    const normalizedEmail = String(payload.email).toLowerCase();
    const googleSub = String(payload.sub || '');
    const normalizedRole = shouldAssignAdminRole(normalizedEmail)
      ? 'admin'
      : normalizeRole(role);
    const db = getCachedDb();
    const usersCollection = db.collection('users');

    const existing = await findExistingUser(usersCollection, normalizedEmail, googleSub);
    const mergedProfile = buildProfilePayload(
      {
        avatar: payload.picture || '',
        ...profile,
      },
      existing || {}
    );

    let userDocument;

    if (existing) {
      const updates = {
        email: normalizedEmail,
        name: existing.name || payload.name || normalizedEmail.split('@')[0],
        role: normalizeRole(existing.role || normalizedRole, { allowAdmin: true }),
        provider: existing.provider || 'google',
        authMethods: Array.from(new Set([...(existing.authMethods || []), 'google'])),
        google: {
          sub: googleSub,
          picture: payload.picture || existing.google?.picture || '',
          emailVerified: Boolean(payload.email_verified),
        },
        emailVerified: Boolean(payload.email_verified),
        avatar: mergedProfile.avatar,
        avatarBackdrop: mergedProfile.avatarBackdrop,
        bio: mergedProfile.bio,
        institution: mergedProfile.institution,
        organizationName: mergedProfile.organizationName,
        location: mergedProfile.location,
        headline: mergedProfile.headline,
        website: mergedProfile.website,
        skills: mergedProfile.skills,
        profileType: mergedProfile.profileType,
        stream: mergedProfile.stream,
        graduationYear: mergedProfile.graduationYear,
        institutionName: mergedProfile.institutionName,
        state: mergedProfile.state,
        city: mergedProfile.city,
        experience: mergedProfile.experience,
        techProficiency: mergedProfile.techProficiency,
        workSummary: mergedProfile.workSummary,
        currentDesignation: mergedProfile.currentDesignation,
        onboardingCompleted: Boolean(mergedProfile.onboardingCompleted),
        socials: mergedProfile.socials,
        profile: {
          ...mergedProfile,
          participant: {
            institution: mergedProfile.institution,
          },
          host: {
            organizationName: mergedProfile.organizationName,
            website: mergedProfile.website,
            location: mergedProfile.location,
          },
        },
        updatedAt: new Date(),
      };

      const updateResult = await usersCollection.updateOne(
        { _id: existing._id },
        { $set: updates }
      );

      if (!updateResult.matchedCount) {
        userDocument = { ...existing, ...updates, _id: existing._id };
      } else {
        userDocument = await usersCollection.findOne({ _id: existing._id }) || { ...existing, ...updates, _id: existing._id };
      }
    } else {
      if (!termsAccepted) {
        return res.status(400).json({ error: 'Please accept Terms and Conditions to continue.' });
      }

      const document = buildStoredUserDocument({
        email: normalizedEmail,
        name: payload.name || normalizedEmail.split('@')[0],
        role: normalizedRole,
        provider: 'google',
        authMethods: ['google'],
        termsAcceptedAt: termsAcceptedAt || new Date().toISOString(),
        google: {
          sub: googleSub,
          picture: payload.picture || '',
          emailVerified: Boolean(payload.email_verified),
        },
        emailVerified: Boolean(payload.email_verified),
        profile: mergedProfile,
        verified: Boolean(payload.email_verified),
      });

      const result = await usersCollection.insertOne(document);
      userDocument = { ...document, _id: result.insertedId };
    }

    const session = await createAuthSession(db, {
      userId: userDocument._id.toString(),
      userAgent: req.get('user-agent') || '',
      ipAddress: req.ip || '',
    });
    setRefreshCookie(res, session.refreshToken);

    res.json({
      success: true,
      token: session.accessToken,
      user: serializeUser(userDocument),
    });
  } catch (error) {
    console.error('Google auth error:', error);
    if (error?.status === 400 || error?.status === 413) {
      return res.status(error.status).json({ error: error.message || 'Invalid Google signup request' });
    }
    res.status(500).json({ error: 'Google sign-in failed' });
  }
});

app.post('/auth/refresh', refreshLimiter, async (req, res) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh session found' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch {
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Invalid refresh session' });
    }

    if (!decoded?.userId || !decoded?.sessionId || decoded?.type !== 'refresh') {
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Invalid refresh session' });
    }

    const db = getCachedDb();
    const usersCollection = db.collection('users');
    const sessionRecord = await getSessionById(db, decoded.sessionId);

    if (!sessionRecord || String(sessionRecord.userId) !== String(decoded.userId)) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Session expired or revoked' });
    }

    const user = await usersCollection.findOne({ _id: new ObjectId(decoded.userId) });
    if (!user) {
      await revokeAuthSession(db, decoded.sessionId);
      clearRefreshCookie(res);
      return res.status(404).json({ error: 'User not found' });
    }

    if (normalizeUserStatus(user.status) === 'suspended') {
      await revokeAuthSession(db, decoded.sessionId);
      clearRefreshCookie(res);
      return res.status(403).json({ error: 'Your account is suspended. Contact support.' });
    }

    const rotated = await rotateAuthSession(db, {
      sessionId: decoded.sessionId,
      userId: decoded.userId,
      userAgent: req.get('user-agent') || '',
      ipAddress: req.ip || '',
    });

    setRefreshCookie(res, rotated.refreshToken);

    res.json({
      success: true,
      token: rotated.accessToken,
      user: serializeUser(user),
    });
  } catch (error) {
    console.error('Refresh error:', error);
    clearRefreshCookie(res);
    res.status(500).json({ error: 'Unable to refresh session' });
  }
});

// Get current user
app.get('/auth/me', authenticateToken, async (req, res) => {
  try {
    const db = getCachedDb();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ _id: new ObjectId(req.userId) });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(serializeUser(user));
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update profile
app.post('/auth/profile', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      role,
      avatar,
      avatarBackdrop,
      bio,
      institution,
      organizationName,
      location,
      headline,
      website,
      skills,
      profileType,
      stream,
      graduationYear,
      institutionName,
      hostType,
      phoneNumber,
      hostOnboardingCompleted,
      state,
      city,
      experience,
      techProficiency,
      workSummary,
      currentDesignation,
      onboardingCompleted,
      socials,
    } = req.body;

    const db = getCachedDb();
    const usersCollection = db.collection('users');

    const existing = await usersCollection.findOne({ _id: new ObjectId(req.userId) });
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    const mergedProfile = buildProfilePayload(
      {
        avatar,
        avatarBackdrop,
        bio,
        institution,
        organizationName,
        location,
        headline,
        website,
        skills,
        profileType,
        stream,
        graduationYear,
        institutionName,
        hostType,
        phoneNumber,
        hostOnboardingCompleted,
        state,
        city,
        experience,
        techProficiency,
        workSummary,
        currentDesignation,
        onboardingCompleted,
        socials,
      },
      existing
    );

    const updateData = {};
    if (name) updateData.name = name;
    if (role) updateData.role = normalizeRole(role);
    updateData.avatar = mergedProfile.avatar;
    updateData.avatarBackdrop = mergedProfile.avatarBackdrop;
    updateData.bio = mergedProfile.bio;
    updateData.institution = mergedProfile.institution;
    updateData.organizationName = mergedProfile.organizationName;
    updateData.location = mergedProfile.location;
    updateData.headline = mergedProfile.headline;
    updateData.website = mergedProfile.website;
    updateData.skills = mergedProfile.skills;
    updateData.profileType = mergedProfile.profileType;
    updateData.stream = mergedProfile.stream;
    updateData.graduationYear = mergedProfile.graduationYear;
    updateData.institutionName = mergedProfile.institutionName;
    updateData.hostType = mergedProfile.hostType;
    updateData.phoneNumber = mergedProfile.phoneNumber;
    updateData.hostOnboardingCompleted = Boolean(mergedProfile.hostOnboardingCompleted);
    updateData.state = mergedProfile.state;
    updateData.city = mergedProfile.city;
    updateData.experience = mergedProfile.experience;
    updateData.techProficiency = mergedProfile.techProficiency;
    updateData.workSummary = mergedProfile.workSummary;
    updateData.currentDesignation = mergedProfile.currentDesignation;
    updateData.onboardingCompleted = Boolean(mergedProfile.onboardingCompleted);
    updateData.socials = mergedProfile.socials;
    updateData.profile = {
      ...mergedProfile,
      participant: {
        institution: mergedProfile.institution,
      },
      host: {
        organizationName: mergedProfile.organizationName,
        website: mergedProfile.website,
        location: mergedProfile.location,
        institutionName: mergedProfile.institutionName,
        hostType: mergedProfile.hostType,
        phoneNumber: mergedProfile.phoneNumber,
        state: mergedProfile.state,
        city: mergedProfile.city,
        hostOnboardingCompleted: Boolean(mergedProfile.hostOnboardingCompleted),
      },
    };
    updateData.updatedAt = new Date();

    const targetObjectId = new ObjectId(req.userId);
    const updateResult = await usersCollection.updateOne(
      { _id: targetObjectId },
      { $set: updateData }
    );

    if (!updateResult.matchedCount) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = await usersCollection.findOne({ _id: targetObjectId });

    res.json({
      success: true,
      user: serializeUser(updatedUser),
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Logout
app.post('/auth/logout', async (req, res) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        if (decoded?.sessionId) {
          const db = getCachedDb();
          await revokeAuthSession(db, decoded.sessionId);
        }
      } catch {
        // Ignore invalid cookie and just clear it.
      }
    }

    clearRefreshCookie(res);
    res.json({ success: true, message: 'Logged out' });
  } catch (error) {
    console.error('Logout error:', error);
    clearRefreshCookie(res);
    res.status(500).json({ error: 'Unable to logout' });
  }
});

app.post('/auth/logout-all', authenticateToken, async (req, res) => {
  try {
    const db = getCachedDb();
    await db.collection('auth_sessions').updateMany(
      { userId: String(req.userId), revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );

    clearRefreshCookie(res);
    res.json({ success: true, message: 'Logged out from all sessions' });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ error: 'Unable to logout all sessions' });
  }
});

app.get('/events', async (req, res) => {
  try {
    const db = getCachedDb();
    const events = await db.collection('events').find({}).sort({ createdAt: -1 }).toArray();
    res.json(events.map((event) => serializeEvent(event)));
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

app.get('/events/registrations/me', authenticateToken, async (req, res) => {
  try {
    const db = getCachedDb();
    const registrations = await db
      .collection('registrations')
      .find({ userId: String(req.userId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(registrations);
  } catch (error) {
    console.error('Get my registrations error:', error);
    res.status(500).json({ error: 'Failed to get registrations' });
  }
});

app.get('/events/registrations/organizer/me', authenticateToken, async (req, res) => {
  try {
    const db = getCachedDb();
    const organizerId = String(req.userId);
    const eventsCollection = db.collection('events');
    const registrationsCollection = db.collection('registrations');

    const ownedEvents = await eventsCollection
      .find(
        {
          $or: [
            { createdBy: organizerId },
            { 'organiser.id': organizerId },
            { 'organizer.id': organizerId },
          ],
        },
        { projection: { id: 1 } }
      )
      .toArray();

    const ownedEventIds = ownedEvents
      .map((item) => String(item.id || '').trim())
      .filter(Boolean);

    if (ownedEventIds.length === 0) {
      return res.json([]);
    }

    const registrations = await registrationsCollection
      .find({ eventId: { $in: ownedEventIds } })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(registrations);
  } catch (error) {
    console.error('Get organizer registrations error:', error);
    res.status(500).json({ error: 'Failed to get organizer registrations' });
  }
});

app.post('/events', authenticateToken, async (req, res) => {
  try {
    const db = getCachedDb();
    const usersCollection = db.collection('users');
    const eventsCollection = db.collection('events');
    const user = await usersCollection.findOne({ _id: new ObjectId(req.userId) });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const payload = req.body || {};
    if (!payload.title || !String(payload.title).trim()) {
      return res.status(400).json({ error: 'Event title is required' });
    }

    const eventId = payload.id || generateEventId();
    const mediaNormalizedPayload = await normalizeEventMediaPayload(req, payload, eventId);
    const normalizedPayload = normalizeEventContentPayload(mediaNormalizedPayload);

    const contactEmail = String(
      normalizedPayload?.organiser?.email ||
        normalizedPayload?.organizer?.email ||
        normalizedPayload?.organizerContactEmail ||
        ''
    ).trim();
    const contactPhone = String(
      normalizedPayload?.organiser?.phone ||
        normalizedPayload?.organizer?.phone ||
        normalizedPayload?.organizerContactPhone ||
        ''
    ).trim();

    if (!contactEmail) {
      return res.status(400).json({ error: 'Organizer contact email is required' });
    }

    if (!isValidOrganizerContactEmail(contactEmail)) {
      return res.status(400).json({ error: 'Organizer contact email is invalid' });
    }

    if (!contactPhone) {
      return res.status(400).json({ error: 'Organizer contact phone is required' });
    }

    if (!isValidOrganizerContactPhone(contactPhone)) {
      return res.status(400).json({ error: 'Organizer contact phone must be exactly 10 digits' });
    }

    const organiser = {
      id: String(normalizedPayload?.organiser?.id || user._id),
      name: normalizedPayload?.organiser?.name || normalizedPayload?.organizer?.name || user.organizationName || user.name,
      logo: normalizedPayload?.organiser?.logo || normalizedPayload?.organizer?.logo || '',
      email: contactEmail,
      phone: contactPhone,
    };

    const now = new Date().toISOString();
    const eventDocument = {
      ...normalizedPayload,
      id: eventId,
      organiser,
      organizer: {
        ...(normalizedPayload.organizer || {}),
        ...organiser,
      },
      organizerContactEmail: contactEmail,
      organizerContactPhone: contactPhone,
      registeredCount: Number(normalizedPayload.registeredCount || 0),
      createdAt: normalizedPayload.createdAt || now,
      updatedAt: now,
      createdBy: String(user._id),
      eventCollection: sanitizeEventCollectionName(eventId),
    };

    await eventsCollection.insertOne(eventDocument);

    const eventCollection = db.collection(eventDocument.eventCollection);
    await eventCollection.createIndex({ type: 1, createdAt: -1 });
    await eventCollection.insertOne({
      type: 'event-meta',
      eventId,
      title: eventDocument.title,
      organiser,
      createdBy: String(user._id),
      createdAt: now,
      payload: eventDocument,
    });

    await eventCollection.insertOne({
      type: 'event-schedule',
      eventId,
      createdAt: now,
      updatedAt: now,
      payload: {
        timeline: eventDocument.timeline || {},
        timelineItems: eventDocument.timelineItems || [],
        subEvents: eventDocument.subEvents || [],
      },
    });

    res.status(201).json({ success: true, event: serializeEvent(eventDocument) });
  } catch (error) {
    console.error('Create event error:', error);
    if (error?.status === 413 || error?.type === 'entity.too.large') {
      return res.status(413).json({ error: error.message || 'Uploaded media is too large.' });
    }
    if (error?.code === 11000) {
      return res.status(409).json({ error: 'Event already exists' });
    }
    res.status(500).json({ error: 'Failed to create event' });
  }
});

app.post('/events/:eventId/update', authenticateToken, async (req, res) => {
  try {
    const db = getCachedDb();
    const eventsCollection = db.collection('events');
    const eventId = String(req.params.eventId || '');
    const existingEvent = await eventsCollection.findOne({ id: eventId });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const ownerId = String(existingEvent.createdBy || existingEvent.organiser?.id || existingEvent.organizer?.id || '');
    if (ownerId && ownerId !== String(req.userId)) {
      return res.status(403).json({ error: 'You can only edit your own events' });
    }

    const updates = { ...(req.body || {}) };
    delete updates._id;
    delete updates.id;
    delete updates.createdAt;
    delete updates.createdBy;
    delete updates.eventCollection;
    delete updates.registeredCount;

    const mediaNormalizedUpdates = await normalizeEventMediaPayload(req, updates, eventId);
    const normalizedUpdates = normalizeEventContentPayload(mediaNormalizedUpdates);

    const { _id, ...eventWithoutId } = existingEvent;
    const mergedOrganiser = {
      ...(eventWithoutId.organiser || eventWithoutId.organizer || {}),
      ...(normalizedUpdates.organiser || normalizedUpdates.organizer || {}),
    };

    const hasOrganizerContactUpdate =
      Object.prototype.hasOwnProperty.call(normalizedUpdates, 'organizerContactEmail') ||
      Object.prototype.hasOwnProperty.call(normalizedUpdates, 'organizerContactPhone') ||
      Object.prototype.hasOwnProperty.call(normalizedUpdates, 'organiser') ||
      Object.prototype.hasOwnProperty.call(normalizedUpdates, 'organizer');

    if (hasOrganizerContactUpdate) {
      const nextContactEmail = String(
        normalizedUpdates?.organizerContactEmail ||
          normalizedUpdates?.organiser?.email ||
          normalizedUpdates?.organizer?.email ||
          mergedOrganiser?.email ||
          ''
      ).trim();
      const nextContactPhone = String(
        normalizedUpdates?.organizerContactPhone ||
          normalizedUpdates?.organiser?.phone ||
          normalizedUpdates?.organizer?.phone ||
          mergedOrganiser?.phone ||
          ''
      ).trim();

      if (!nextContactEmail) {
        return res.status(400).json({ error: 'Organizer contact email is required' });
      }

      if (!isValidOrganizerContactEmail(nextContactEmail)) {
        return res.status(400).json({ error: 'Organizer contact email is invalid' });
      }

      if (!nextContactPhone) {
        return res.status(400).json({ error: 'Organizer contact phone is required' });
      }

      if (!isValidOrganizerContactPhone(nextContactPhone)) {
        return res.status(400).json({ error: 'Organizer contact phone must be exactly 10 digits' });
      }

      mergedOrganiser.email = nextContactEmail;
      mergedOrganiser.phone = nextContactPhone;
      normalizedUpdates.organizerContactEmail = nextContactEmail;
      normalizedUpdates.organizerContactPhone = nextContactPhone;
    }

    const now = new Date().toISOString();
    const nextEvent = {
      ...eventWithoutId,
      ...normalizedUpdates,
      organiser: mergedOrganiser,
      organizer: {
        ...(normalizedUpdates.organizer || {}),
        ...mergedOrganiser,
      },
      organizerContactEmail: String(normalizedUpdates.organizerContactEmail || eventWithoutId.organizerContactEmail || mergedOrganiser.email || '').trim(),
      organizerContactPhone: String(normalizedUpdates.organizerContactPhone || eventWithoutId.organizerContactPhone || mergedOrganiser.phone || '').trim(),
      updatedAt: now,
    };

    await eventsCollection.updateOne(
      { id: eventId },
      {
        $set: nextEvent,
      }
    );

    const eventCollectionName = nextEvent.eventCollection || sanitizeEventCollectionName(eventId);
    const eventCollection = db.collection(eventCollectionName);
    await eventCollection.createIndex({ type: 1, createdAt: -1 });

    await eventCollection.updateOne(
      { type: 'event-meta', eventId },
      {
        $set: {
          title: nextEvent.title,
          organiser: nextEvent.organiser,
          payload: nextEvent,
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    await eventCollection.updateOne(
      { type: 'event-schedule', eventId },
      {
        $set: {
          payload: {
            timeline: nextEvent.timeline || {},
            timelineItems: nextEvent.timelineItems || [],
            subEvents: nextEvent.subEvents || [],
          },
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    await eventCollection.insertOne({
      type: 'event-update',
      eventId,
      createdBy: String(req.userId),
      createdAt: now,
      payload: normalizedUpdates,
    });

    res.json({ success: true, event: serializeEvent(nextEvent) });
  } catch (error) {
    console.error('Update event error:', error);
    if (error?.status === 413 || error?.type === 'entity.too.large') {
      return res.status(413).json({ error: error.message || 'Uploaded media is too large.' });
    }
    res.status(500).json({ error: 'Failed to update event' });
  }
});

async function handleDeleteEvent(req, res) {
  try {
    const db = getCachedDb();
    const eventsCollection = db.collection('events');
    const registrationsCollection = db.collection('registrations');
    const eventId = String(req.params.eventId || '');

    let existingEvent = await eventsCollection.findOne({ id: eventId });
    if (!existingEvent && ObjectId.isValid(eventId)) {
      existingEvent = await eventsCollection.findOne({ _id: new ObjectId(eventId) });
    }

    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const ownerId = String(existingEvent.createdBy || existingEvent.organiser?.id || existingEvent.organizer?.id || '');
    if (ownerId && ownerId !== String(req.userId)) {
      return res.status(403).json({ error: 'You can only delete your own events' });
    }

    const confirmTitle = String(req.body?.confirmTitle || '').trim();
    const eventTitle = String(existingEvent.title || '').trim();
    if (!confirmTitle) {
      return res.status(400).json({ error: 'Event name confirmation is required' });
    }
    if (confirmTitle !== eventTitle) {
      return res.status(400).json({ error: 'Event name does not match. Delete aborted.' });
    }

    const canonicalEventId = String(existingEvent.id || eventId);

    await eventsCollection.deleteOne({ _id: existingEvent._id });
    await registrationsCollection.deleteMany({ eventId: canonicalEventId });

    const eventCollectionName = existingEvent.eventCollection || sanitizeEventCollectionName(canonicalEventId);
    const hasEventCollection = await db.listCollections({ name: eventCollectionName }, { nameOnly: true }).hasNext();
    if (hasEventCollection) {
      await db.collection(eventCollectionName).drop();
    }

    res.json({ success: true, deletedEventId: canonicalEventId });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
}

app.post('/events/:eventId/delete', authenticateToken, handleDeleteEvent);
app.delete('/events/:eventId', authenticateToken, handleDeleteEvent);
app.post('/api/events/:eventId/delete', authenticateToken, handleDeleteEvent);
app.delete('/api/events/:eventId', authenticateToken, handleDeleteEvent);

app.post('/events/:eventId/register', authenticateToken, async (req, res) => {
  try {
    const db = getCachedDb();
    const usersCollection = db.collection('users');
    const eventsCollection = db.collection('events');
    const registrationsCollection = db.collection('registrations');

    const user = await usersCollection.findOne({ _id: new ObjectId(req.userId) });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const eventId = String(req.params.eventId || '');
    const event = await eventsCollection.findOne({ id: eventId });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const existing = await registrationsCollection.findOne({
      eventId,
      userId: String(user._id),
    });

    if (existing) {
      return res.status(409).json({ error: 'Already registered for this event' });
    }

    const body = req.body || {};
    const participantSnapshot = body.participant || {
      id: String(user._id),
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'participant',
      institution: user.institution || '',
      organizationName: user.organizationName || '',
      avatar: user.avatar || '',
      socials: user.socials || { linkedin: '', github: '', instagram: '' },
    };
    const leaderLabel = String(participantSnapshot.name || participantSnapshot.email || '').trim();
    const normalizedMembers = Array.from(
      new Set(
        [
          ...(Array.isArray(body.members) ? body.members : []),
          leaderLabel,
        ]
          .map((member) => String(member || '').trim())
          .filter(Boolean)
      )
    );
    const normalizedPaymentStatus =
      String(body.paymentStatus || '').trim().toLowerCase() === 'paid' ? 'paid' : 'not-paid';
    const teamSize = event.teamSize && typeof event.teamSize === 'object' ? event.teamSize : null;
    const minTeamSize = Number.parseInt(teamSize?.min, 10);
    const maxTeamSize = Number.parseInt(teamSize?.max, 10);
    const hasValidTeamRange = Number.isInteger(minTeamSize) && Number.isInteger(maxTeamSize) && minTeamSize > 0 && maxTeamSize >= minTeamSize;

    if (hasValidTeamRange) {
      const memberCount = normalizedMembers.length;
      if (!body.teamName || !String(body.teamName).trim()) {
        return res.status(400).json({
          error: 'Team name is required for this event',
          status: 'invalid',
        });
      }

      if (memberCount < minTeamSize || memberCount > maxTeamSize) {
        return res.status(400).json({
          error: `Team size must be between ${minTeamSize} and ${maxTeamSize} members.`,
          status: 'invalid',
        });
      }
    } else if (normalizedMembers.length > 1) {
      return res.status(400).json({
        error: 'This event only allows individual registration.',
        status: 'invalid',
      });
    }

    const registration = {
      id: body.id || `reg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      userId: String(user._id),
      eventId,
      teamId: body.teamId || null,
      teamName: body.teamName || null,
      members: normalizedMembers,
      paymentStatus: normalizedPaymentStatus,
      participant: participantSnapshot,
      qrToken: body.qrToken || `qr-${eventId}-${String(user._id)}`,
      checkedIn: false,
      checkedInAt: null,
      createdAt: new Date().toISOString(),
    };

    await registrationsCollection.insertOne(registration);

    await eventsCollection.updateOne(
      { id: eventId },
      {
        $inc: {
          registeredCount: 1,
        },
        $set: {
          updatedAt: new Date().toISOString(),
        }
      }
    );

    const refreshedEvent = await eventsCollection.findOne({ id: eventId });
    const nextRegisteredCount = Number(refreshedEvent?.registeredCount || 0);

    const eventCollectionName = event.eventCollection || sanitizeEventCollectionName(eventId);
    const eventCollection = db.collection(eventCollectionName);
    await eventCollection.insertOne({
      type: 'registration',
      eventId,
      registrationId: registration.id,
      payload: registration,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      registration,
      event: serializeEvent(refreshedEvent || { ...event, registeredCount: nextRegisteredCount }),
    });
  } catch (error) {
    console.error('Register event error:', error);
    if (error?.code === 11000) {
      return res.status(409).json({ error: 'Already registered for this event' });
    }
    res.status(500).json({ error: 'Failed to register for event' });
  }
});

function normalizePaymentStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'paid' || value === 'success' || value === 'successful') return 'paid';
  if (value === 'pending') return 'pending';
  return 'not-paid';
}

function paymentStatusLabel(status) {
  if (status === 'paid') return 'Payment Successful';
  if (status === 'pending') return 'Payment Pending';
  return 'Not Paid';
}

function buildTeamValidationDetails(registrations = []) {
  const list = Array.isArray(registrations) ? registrations : [];
  if (list.length === 0) return null;

  const first = list[0] || {};
  const members = new Set();

  list.forEach((registration) => {
    if (Array.isArray(registration?.members)) {
      registration.members
        .map((member) => String(member || '').trim())
        .filter(Boolean)
        .forEach((member) => members.add(member));
    }

    const participantName = String(registration?.participant?.name || '').trim();
    if (participantName) {
      members.add(participantName);
    }
  });

  const normalizedStatuses = list.map((registration) => normalizePaymentStatus(registration?.paymentStatus));
  const allPaid = normalizedStatuses.length > 0 && normalizedStatuses.every((status) => status === 'paid');
  const hasPending = normalizedStatuses.some((status) => status === 'pending');
  const paymentStatus = allPaid ? 'paid' : hasPending ? 'pending' : 'not-paid';

  const registrationDate = list
    .map((registration) => new Date(registration?.createdAt || 0).getTime())
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b)[0];

  return {
    teamId: String(first.teamId || '').trim() || null,
    eventId: String(first.eventId || '').trim() || null,
    teamName: String(first.teamName || '').trim() || 'Individual',
    registrationDate: registrationDate ? new Date(registrationDate).toISOString() : first.createdAt,
    members: Array.from(members),
    paymentStatus,
    paymentLabel: paymentStatusLabel(paymentStatus),
    registrationIds: list.map((registration) => registration.id),
  };
}

app.post('/events/checkin', authenticateToken, async (req, res) => {
  try {
    const db = getCachedDb();
    const registrationsCollection = db.collection('registrations');
    const eventsCollection = db.collection('events');

    const qrToken = sanitizeString(req.body?.qrToken || '', 256);
    if (!qrToken) {
      return res.status(400).json({
        success: false,
        status: 'invalid',
        message: 'QR token is required for validation.',
      });
    }

    const registrationsByToken = await registrationsCollection.find({ qrToken }).toArray();
    if (registrationsByToken.length === 0) {
      return res.status(404).json({
        success: false,
        status: 'invalid',
        message: 'Team is not present or QR is not validated for this event.',
      });
    }

    const pivot = registrationsByToken[0];
    const eventId = String(pivot.eventId || '').trim();
    const event = await eventsCollection.findOne({ id: eventId });

    if (!event) {
      return res.status(404).json({
        success: false,
        status: 'invalid',
        message: 'Event linked to this QR could not be found.',
      });
    }

    const ownerId = String(event.createdBy || event.organiser?.id || event.organizer?.id || '');
    if (ownerId && ownerId !== String(req.userId)) {
      return res.status(403).json({
        success: false,
        status: 'invalid',
        message: 'You are not authorized to validate this event team.',
      });
    }

    const pivotTeamId = String(pivot.teamId || '').trim();
    const pivotTeamName = String(pivot.teamName || '').trim();

    let teamRegistrations = [];
    if (pivotTeamId) {
      teamRegistrations = await registrationsCollection.find({ eventId, teamId: pivotTeamId }).toArray();
    } else if (pivotTeamName) {
      teamRegistrations = await registrationsCollection.find({ eventId, teamName: pivotTeamName }).toArray();
    } else {
      teamRegistrations = registrationsByToken;
    }

    if (teamRegistrations.length === 0) {
      teamRegistrations = registrationsByToken;
    }

    const isAlreadyCheckedIn = teamRegistrations.every((registration) => Boolean(registration.checkedIn));
    if (isAlreadyCheckedIn) {
      return res.json({
        success: false,
        status: 'already-checked-in',
        message: teamRegistrations.length > 1
          ? 'Team already validated for this event.'
          : 'Participant already validated for this event.',
        event: {
          id: eventId,
          title: event.title,
        },
        team: buildTeamValidationDetails(teamRegistrations),
      });
    }

    const checkInTime = new Date().toISOString();
    const registrationIds = teamRegistrations
      .map((registration) => registration.id)
      .filter(Boolean);

    if (registrationIds.length > 0) {
      await registrationsCollection.updateMany(
        { id: { $in: registrationIds } },
        {
          $set: {
            checkedIn: true,
            checkedInAt: checkInTime,
          },
        }
      );
    }

    const checkedRegistrations = registrationIds.length > 0
      ? await registrationsCollection.find({ id: { $in: registrationIds } }).toArray()
      : teamRegistrations;

    return res.json({
      success: true,
      status: 'valid',
      message: checkedRegistrations.length > 1
        ? 'Team validated and checked in successfully.'
        : 'Participant validated and checked in successfully.',
      event: {
        id: eventId,
        title: event.title,
      },
      team: buildTeamValidationDetails(checkedRegistrations),
      checkedInAt: checkInTime,
    });
  } catch (error) {
    console.error('Check-in validation error:', error);
    return res.status(500).json({
      success: false,
      status: 'invalid',
      message: 'Unable to validate QR right now. Please try again.',
    });
  }
});

app.post('/complaints', authenticateTokenAllowSuspended, async (req, res) => {
  try {
    const db = getCachedDb();
    const usersCollection = db.collection('users');
    const complaintsCollection = db.collection('complaints');
    const actorId = String(req.userId || '').trim();

    const user = await usersCollection.findOne(
      { _id: new ObjectId(actorId) },
      { projection: { name: 1, email: 1, role: 1, status: 1 } }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const message = sanitizeString(req.body?.message || req.body?.complaint || '', 2000);
    const submittedName = sanitizeString(req.body?.name || '', 120);

    if (!message) {
      return res.status(400).json({ error: 'Complaint message is required' });
    }

    const complaintId = `cmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const document = {
      complaintId,
      userId: actorId,
      name: submittedName || user.name || 'Unknown user',
      email: user.email || '',
      role: normalizeRole(user.role, { allowAdmin: true }),
      userStatus: normalizeUserStatus(user.status),
      message,
      status: 'raised',
      adminNote: '',
      createdAt: now,
      updatedAt: now,
      lastStatusAt: now,
      history: [
        {
          status: 'raised',
          note: 'Ticket raised by user.',
          actorId,
          actorRole: normalizeRole(user.role, { allowAdmin: true }),
          createdAt: now,
        },
      ],
    };

    await complaintsCollection.insertOne(document);

    await logAdminAction(db, actorId, 'complaint-raised', 'complaint', complaintId, {
      status: 'raised',
      byRole: normalizeRole(user.role, { allowAdmin: true }),
    });

    res.status(201).json({ success: true, complaint: serializeComplaint(document) });
  } catch (error) {
    console.error('Create complaint error:', error);
    res.status(500).json({ error: 'Failed to submit complaint' });
  }
});

app.get('/complaints/me', authenticateTokenAllowSuspended, async (req, res) => {
  try {
    const db = getCachedDb();
    const complaints = await db
      .collection('complaints')
      .find({ userId: String(req.userId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ complaints: complaints.map((item) => serializeComplaint(item)) });
  } catch (error) {
    console.error('Load my complaints error:', error);
    res.status(500).json({ error: 'Failed to load complaints' });
  }
});

app.get('/complaints/:complaintId', authenticateTokenAllowSuspended, async (req, res) => {
  try {
    const db = getCachedDb();
    const complaintId = String(req.params.complaintId || '').trim();
    if (!complaintId) {
      return res.status(400).json({ error: 'Invalid complaint id' });
    }

    const complaint = await db.collection('complaints').findOne({ complaintId });
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const isAdmin = req.authUser?.role === 'admin';
    const isOwner = String(complaint.userId || '') === String(req.userId || '');
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Not authorized to view this complaint' });
    }

    res.json({ complaint: serializeComplaint(complaint) });
  } catch (error) {
    console.error('Load complaint error:', error);
    res.status(500).json({ error: 'Failed to load complaint' });
  }
});

app.get('/admin/complaints', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getCachedDb();
    const complaintsCollection = db.collection('complaints');

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const status = normalizeComplaintStatus(req.query.status);
    const rawStatus = String(req.query.status || '').trim();
    const search = sanitizeString(req.query.search || '', 120);

    const filter = {};
    if (rawStatus) {
      filter.status = status;
    }
    if (search) {
      const safeSearch = escapeRegex(search);
      filter.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
        { message: { $regex: safeSearch, $options: 'i' } },
        { complaintId: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const [total, raisedCount, inProgressCount, resolvedCount, complaints] = await Promise.all([
      complaintsCollection.countDocuments(filter),
      complaintsCollection.countDocuments({ status: 'raised' }),
      complaintsCollection.countDocuments({ status: 'in-progress' }),
      complaintsCollection.countDocuments({ status: 'resolved' }),
      complaintsCollection
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
    ]);

    res.json({
      total,
      page,
      limit,
      metrics: {
        raised: raisedCount,
        inProgress: inProgressCount,
        resolved: resolvedCount,
      },
      complaints: complaints.map((item) => serializeComplaint(item)),
    });
  } catch (error) {
    console.error('Admin complaints list error:', error);
    res.status(500).json({ error: 'Failed to load complaints' });
  }
});

app.patch('/admin/complaints/:complaintId/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getCachedDb();
    const complaintsCollection = db.collection('complaints');
    const complaintId = String(req.params.complaintId || '').trim();
    const nextStatus = normalizeComplaintStatus(req.body?.status);
    const note = String(req.body?.note || '').trim();

    if (!complaintId) {
      return res.status(400).json({ error: 'Invalid complaint id' });
    }

    const complaint = await complaintsCollection.findOne({ complaintId });
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const now = new Date().toISOString();
    const historyEntry = {
      status: nextStatus,
      note: note || `Ticket moved to ${nextStatus}.`,
      actorId: String(req.userId || ''),
      actorRole: 'admin',
      createdAt: now,
    };

    await complaintsCollection.updateOne(
      { complaintId },
      {
        $set: {
          status: nextStatus,
          adminNote: note,
          updatedAt: now,
          lastStatusAt: now,
        },
        $push: {
          history: historyEntry,
        },
      }
    );

    const updated = await complaintsCollection.findOne({ complaintId });

    await logAdminAction(db, req.userId, 'complaint-status-updated', 'complaint', complaintId, {
      status: nextStatus,
      note,
      userId: String(updated?.userId || ''),
    });

    res.json({ success: true, complaint: serializeComplaint(updated) });
  } catch (error) {
    console.error('Admin complaint status update error:', error);
    res.status(500).json({ error: 'Failed to update complaint status' });
  }
});

app.get('/admin/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getCachedDb();
    const usersCollection = db.collection('users');
    const eventsCollection = db.collection('events');
    const registrationsCollection = db.collection('registrations');
    const sessionsCollection = db.collection('auth_sessions');
    const complaintsCollection = db.collection('complaints');

    const [
      totalUsers,
      totalEvents,
      totalRegistrations,
      totalCheckIns,
      activeSessions,
      suspendedUsers,
      openComplaints,
      roleBreakdown,
      recentUsers,
      recentEvents,
    ] = await Promise.all([
      usersCollection.countDocuments({}),
      eventsCollection.countDocuments({}),
      registrationsCollection.countDocuments({}),
      registrationsCollection.countDocuments({ checkedIn: true }),
      sessionsCollection.countDocuments({ revokedAt: null }),
      usersCollection.countDocuments({ status: 'suspended' }),
      complaintsCollection.countDocuments({ status: { $in: ['raised', 'in-progress'] } }),
      usersCollection
        .aggregate([
          { $group: { _id: '$role', count: { $sum: 1 } } },
        ])
        .toArray(),
      usersCollection
        .find({}, { projection: { password: 0 } })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray(),
      eventsCollection
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray(),
    ]);

    const roleCounts = {
      participant: 0,
      organizer: 0,
      admin: 0,
    };

    roleBreakdown.forEach((item) => {
      const role = normalizeRole(item?._id, { allowAdmin: true });
      roleCounts[role] = Number(item?.count || 0);
    });

    res.json({
      metrics: {
        totalUsers,
        totalEvents,
        totalRegistrations,
        totalCheckIns,
        activeSessions,
        suspendedUsers,
        openComplaints,
        roleCounts,
      },
      recentUsers: recentUsers.map((item) => serializeUser(item)),
      recentEvents: recentEvents.map((item) => serializeEvent(item)),
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({ error: 'Failed to load admin overview' });
  }
});

app.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getCachedDb();
    const usersCollection = db.collection('users');

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const role = String(req.query.role || '').trim().toLowerCase();
    const status = String(req.query.status || '').trim().toLowerCase();
    const search = sanitizeString(req.query.search || '', 120);

    const filter = {};
    if (role && ['participant', 'organizer', 'admin'].includes(role)) {
      filter.role = role;
    }
    if (status && ['active', 'suspended'].includes(status)) {
      filter.status = status;
    }
    if (search) {
      const safeSearch = escapeRegex(search);
      filter.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const [total, users] = await Promise.all([
      usersCollection.countDocuments(filter),
      usersCollection
        .find(filter, { projection: { password: 0 } })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
    ]);

    res.json({
      total,
      page,
      limit,
      users: users.map((item) => serializeUser(item)),
    });
  } catch (error) {
    console.error('Admin users list error:', error);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

app.patch('/admin/users/:userId/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getCachedDb();
    const usersCollection = db.collection('users');
    const targetUserId = String(req.params.userId || '').trim();
    const nextRole = normalizeRole(req.body?.role, { allowAdmin: true });

    if (!ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    if (targetUserId === String(req.userId) && nextRole !== 'admin') {
      return res.status(400).json({ error: 'You cannot remove your own admin role.' });
    }

    const targetObjectId = new ObjectId(targetUserId);
    const updateResult = await usersCollection.updateOne(
      { _id: targetObjectId },
      {
        $set: {
          role: nextRole,
          updatedAt: new Date(),
        },
      }
    );

    if (!updateResult.matchedCount) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = await usersCollection.findOne(
      { _id: targetObjectId },
      { projection: { password: 0 } }
    );

    await logAdminAction(db, req.userId, 'user-role-updated', 'user', targetUserId, {
      role: nextRole,
    });

    res.json({ success: true, user: serializeUser(updatedUser) });
  } catch (error) {
    console.error('Admin role update error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

app.patch('/admin/users/:userId/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getCachedDb();
    const usersCollection = db.collection('users');
    const sessionsCollection = db.collection('auth_sessions');
    const targetUserId = String(req.params.userId || '').trim();
    const nextStatus = normalizeUserStatus(req.body?.status);
    const reason = String(req.body?.reason || '').trim();

    if (!ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    if (targetUserId === String(req.userId) && nextStatus === 'suspended') {
      return res.status(400).json({ error: 'You cannot suspend your own account.' });
    }

    const targetObjectId = new ObjectId(targetUserId);
    const updateResult = await usersCollection.updateOne(
      { _id: targetObjectId },
      {
        $set: {
          status: nextStatus,
          updatedAt: new Date(),
        },
      }
    );

    if (!updateResult.matchedCount) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = await usersCollection.findOne(
      { _id: targetObjectId },
      { projection: { password: 0 } }
    );

    if (nextStatus === 'suspended') {
      await sessionsCollection.updateMany(
        { userId: targetUserId, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
    }

    await logAdminAction(db, req.userId, 'user-status-updated', 'user', targetUserId, {
      status: nextStatus,
      reason,
    });

    res.json({ success: true, user: serializeUser(updatedUser) });
  } catch (error) {
    console.error('Admin status update error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

app.get('/admin/events', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getCachedDb();
    const eventsCollection = db.collection('events');

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const status = String(req.query.status || '').trim();
    const search = sanitizeString(req.query.search || '', 120);

    const filter = {};
    if (status) {
      filter.status = status;
    }
    if (search) {
      const safeSearch = escapeRegex(search);
      filter.$or = [
        { title: { $regex: safeSearch, $options: 'i' } },
        { 'organiser.name': { $regex: safeSearch, $options: 'i' } },
        { 'organizer.name': { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const [total, events] = await Promise.all([
      eventsCollection.countDocuments(filter),
      eventsCollection
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
    ]);

    res.json({
      total,
      page,
      limit,
      events: events.map((item) => serializeEvent(item)),
    });
  } catch (error) {
    console.error('Admin events list error:', error);
    res.status(500).json({ error: 'Failed to load events' });
  }
});

app.patch('/admin/events/:eventId/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getCachedDb();
    const eventsCollection = db.collection('events');
    const eventId = String(req.params.eventId || '').trim();
    const nextStatus = String(req.body?.status || '').trim();
    const reason = String(req.body?.reason || '').trim();

    if (!eventId) {
      return res.status(400).json({ error: 'Invalid event id' });
    }

    if (!nextStatus) {
      return res.status(400).json({ error: 'Event status is required' });
    }

    const updateResult = await eventsCollection.updateOne(
      { id: eventId },
      {
        $set: {
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    if (!updateResult.matchedCount) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const updatedEvent = await eventsCollection.findOne({ id: eventId });

    await logAdminAction(db, req.userId, 'event-status-updated', 'event', eventId, {
      status: nextStatus,
      reason,
    });

    res.json({ success: true, event: serializeEvent(updatedEvent) });
  } catch (error) {
    console.error('Admin event status update error:', error);
    res.status(500).json({ error: 'Failed to update event status' });
  }
});

app.get('/admin/audit-logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getCachedDb();
    const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const logs = await db
      .collection('admin_audit_logs')
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    res.json({ logs });
  } catch (error) {
    console.error('Admin audit logs error:', error);
    res.status(500).json({ error: 'Failed to load admin audit logs' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, _next) => {
  if (err?.message === 'CORS origin not allowed') {
    return res.status(403).json({ error: 'CORS origin not allowed' });
  }

  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  if (err?.status === 400 || err?.status === 413) {
    return res.status(err.status).json({ error: err.message || 'Invalid request payload' });
  }

  if (err?.status === 413 || err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Uploaded media is too large. Use images under 1MB each.' });
  }

  const message = String(err?.message || '');
  if (message.includes('BSONObj size') || message.includes('document is larger than the maximum size')) {
    return res.status(413).json({ error: 'Event payload is too large for storage. Use smaller files or URLs.' });
  }

  console.error('Server error:', err);
  if (!IS_PRODUCTION) {
    return res.status(500).json({
      error: 'Internal server error',
      detail: err?.stack || err?.message || String(err),
    });
  }
  return res.status(500).json({ error: 'Internal server error' });
});

// Initialize and start
async function startServer() {
  app.listen(port, () => {
    console.log(`✓ Auth API running on http://localhost:${port}`);
  });

  const connectWithRetry = async () => {
    const retryDelayMs = 5000;

    while (!getCachedDb()) {
      try {
        await connectToDatabase();
        console.log('✓ Database ready');
        return;
      } catch (error) {
        console.error(`Database unavailable. Retrying in ${retryDelayMs / 1000}s...`, error?.message || error);
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  };

  try {
    await connectWithRetry();
  } catch (error) {
    console.error('Unexpected startup error:', error);
  }
}

startServer();

export default app;
