import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { MongoClient, ObjectId } from 'mongodb';

const base = 'http://127.0.0.1:5001';
const adminEmail = 'admin@hunchmate.com';

const mongoUri = process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET;
if (!mongoUri) {
  throw new Error('MONGODB_URI is missing');
}
if (!jwtSecret) {
  throw new Error('JWT_SECRET is missing');
}

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const error = new Error(data.error || `HTTP ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

const createEvent = (token, payload) => fetchJson(`${base}/events`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify(payload),
});

const registerForEvent = (eventId, participant) => fetchJson(`${base}/events/${eventId}/register`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${participant.token}` },
  body: JSON.stringify({
    participant: {
      id: participant.userId,
      name: participant.name,
      email: participant.email,
      role: 'participant',
    },
  }),
});

const adminPatch = (token, path, body) => fetchJson(`${base}${path}`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify(body),
});

const adminGet = (token, path) => fetchJson(`${base}${path}`, {
  method: 'GET',
  headers: { Authorization: `Bearer ${token}` },
});

const makeEmail = (prefix, idx) => `${prefix}.${Date.now()}.${idx}@example.com`;
const makeToken = (userId) => jwt.sign(
  { userId: String(userId), type: 'access', iat: Math.floor(Date.now() / 1000) },
  jwtSecret,
  { expiresIn: '15m' }
);

const buildUserDoc = ({ email, name, role }) => ({
  _id: new ObjectId(),
  email: String(email || '').toLowerCase(),
  name,
  role,
  status: 'active',
  provider: 'local',
  authMethods: ['password'],
  password: '',
  emailVerified: true,
  avatar: '',
  avatarBackdrop: '',
  bio: '',
  institution: '',
  organizationName: role === 'organizer' ? name : '',
  location: '',
  headline: '',
  website: '',
  skills: [],
  socials: { linkedin: '', github: '', instagram: '' },
  profile: {
    avatar: '',
    avatarBackdrop: '',
    bio: '',
    institution: '',
    organizationName: role === 'organizer' ? name : '',
    location: '',
    headline: '',
    website: '',
    skills: [],
    socials: { linkedin: '', github: '', instagram: '' },
    participant: { institution: '' },
    host: { organizationName: role === 'organizer' ? name : '', website: '', location: '' },
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  verified: true,
});

const main = async () => {
  const report = {
    startedAt: new Date().toISOString(),
    phases: {},
    findings: [],
  };

  report.phases.health = await fetchJson(`${base}/health`);

  // Ensure clean baseline for this run.
  const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 20000 });
  await client.connect();
  const db = client.db('hunchmate');
  const usersCollection = db.collection('users');
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  const dynamic = collections.map((c) => c.name).filter((name) => name.startsWith('event_'));
  const wipeTargets = ['users', 'events', 'invitations', 'registrations', 'auth_sessions', 'admin_audit_logs', ...dynamic];
  for (const name of wipeTargets) {
    await db.collection(name).deleteMany({});
  }
  report.phases.dbReset = {
    wipedCollections: wipeTargets.length,
    targets: wipeTargets,
  };

  // Seed admin + organizer directly in DB and authenticate with signed access tokens.
  const adminDoc = buildUserDoc({ email: adminEmail, name: 'Admin Root', role: 'admin' });
  const organizerDoc = buildUserDoc({ email: makeEmail('organizer', 1), name: 'Load Organizer', role: 'organizer' });
  await usersCollection.insertMany([adminDoc, organizerDoc]);

  const adminToken = makeToken(adminDoc._id);
  const organizerToken = makeToken(organizerDoc._id);

  report.phases.adminAuth = {
    signupUserId: String(adminDoc._id),
    loginOk: Boolean(adminToken),
    role: 'admin',
  };

  // Create 30 events.
  const eventCreateStart = Date.now();
  const eventJobs = Array.from({ length: 30 }, (_, i) => {
    const eventNo = i + 1;
    return createEvent(organizerToken, {
      title: `Audit Event ${eventNo}`,
      description: `Audit flow event ${eventNo}`,
      shortDescription: `Audit event ${eventNo}`,
      category: eventNo % 2 === 0 ? 'Hackathon' : 'Workshop',
      mode: eventNo % 3 === 0 ? 'Online' : 'Hybrid',
      status: 'open',
      timeline: {
        registrationStart: '2026-04-01',
        registrationEnd: '2026-04-30',
        eventStart: '2026-05-10',
        eventEnd: '2026-05-12',
      },
      tags: ['audit', `event-${eventNo}`],
      teamSize: null,
    });
  });

  const eventSettled = await Promise.allSettled(eventJobs);
  const createdEvents = eventSettled
    .filter((x) => x.status === 'fulfilled')
    .map((x) => x.value.event);
  const eventErrors = eventSettled
    .filter((x) => x.status === 'rejected')
    .map((x) => String(x.reason?.message || x.reason));

  report.phases.eventCreation = {
    requested: 30,
    created: createdEvents.length,
    failed: eventErrors.length,
    elapsedMs: Date.now() - eventCreateStart,
    sampleEventId: createdEvents[0]?.id || null,
    errors: eventErrors.slice(0, 5),
  };

  if (createdEvents.length === 0) {
    throw new Error('No events created. Cannot proceed with registration/load test.');
  }

  // Create participants for load.
  const participantCount = 300;
  const signupStart = Date.now();
  const participantDocs = Array.from({ length: participantCount }, (_, i) => {
    const email = makeEmail('participant', i + 1);
    return buildUserDoc({ email, name: `Participant ${i + 1}`, role: 'participant' });
  });
  await usersCollection.insertMany(participantDocs);
  const participants = participantDocs.map((doc) => ({
    email: doc.email,
    name: doc.name,
    userId: String(doc._id),
    token: makeToken(doc._id),
  }));

  report.phases.participantSignup = {
    requested: participantCount,
    created: participants.length,
    failed: 0,
    elapsedMs: Date.now() - signupStart,
    errors: [],
  };

  // Register all participants concurrently to the first event (load test).
  const targetEventId = createdEvents[0].id;
  const loadStart = Date.now();
  const registrationSettled = await Promise.allSettled(
    participants.map((p) => registerForEvent(targetEventId, p))
  );
  const loadMs = Date.now() - loadStart;

  const regSummary = {
    requested: participants.length,
    success: 0,
    failed: 0,
    duplicate: 0,
    otherErrors: 0,
    elapsedMs: loadMs,
    rpsApprox: participants.length > 0 ? Number((participants.length / (loadMs / 1000)).toFixed(2)) : 0,
  };

  for (const item of registrationSettled) {
    if (item.status === 'fulfilled') {
      regSummary.success += 1;
      continue;
    }
    regSummary.failed += 1;
    const message = String(item.reason?.message || item.reason || 'unknown');
    if (/already registered/i.test(message) || /409/.test(message)) {
      regSummary.duplicate += 1;
    } else {
      regSummary.otherErrors += 1;
    }
  }

  // Spread a few registrations across all remaining events to verify event-specific flow.
  const extraStart = Date.now();
  const extraJobs = [];
  const eventTail = createdEvents.slice(1, 30);
  for (let i = 0; i < eventTail.length; i += 1) {
    const participant = participants[i];
    if (!participant) break;
    extraJobs.push(registerForEvent(eventTail[i].id, participant));
  }
  const extraSettled = await Promise.allSettled(extraJobs);
  const extraSuccess = extraSettled.filter((x) => x.status === 'fulfilled').length;
  const extraFail = extraSettled.length - extraSuccess;

  report.phases.registrationLoad = {
    targetEventId,
    ...regSummary,
    extraCrossEventRegistrations: {
      requested: extraJobs.length,
      success: extraSuccess,
      failed: extraFail,
      elapsedMs: Date.now() - extraStart,
    },
  };

  // DB-level count audit for race condition detection.
  const eventDoc = await db.collection('events').findOne({ id: targetEventId });
  const actualRegs = await db.collection('registrations').countDocuments({ eventId: targetEventId });
  const totalEventsInDb = await db.collection('events').countDocuments({});

  report.phases.countAudit = {
    eventId: targetEventId,
    registeredCountField: Number(eventDoc?.registeredCount || 0),
    actualRegistrations: actualRegs,
    delta: Number(eventDoc?.registeredCount || 0) - actualRegs,
    totalEventsInDb,
  };

  if (report.phases.countAudit.delta !== 0) {
    report.findings.push({
      severity: 'high',
      issue: 'registeredCount mismatch detected under load',
      details: report.phases.countAudit,
    });
  }

  // Admin API audit.
  const [overview, usersPage, eventsPage, logs] = await Promise.all([
    adminGet(adminToken, '/admin/overview'),
    adminGet(adminToken, '/admin/users?limit=30&page=1'),
    adminGet(adminToken, '/admin/events?limit=30&page=1'),
    adminGet(adminToken, '/admin/audit-logs?limit=100'),
  ]);

  report.phases.adminAudit = {
    overviewMetrics: overview.metrics,
    usersPageCount: Array.isArray(usersPage.users) ? usersPage.users.length : -1,
    usersTotal: usersPage.total,
    eventsPageCount: Array.isArray(eventsPage.events) ? eventsPage.events.length : -1,
    eventsTotal: eventsPage.total,
    auditLogCount: Array.isArray(logs.logs) ? logs.logs.length : -1,
    pageLimitRespected: Array.isArray(eventsPage.events) ? eventsPage.events.length <= 30 : false,
  };

  // Test admin actions.
  const dbSampleUser = await db.collection('users').findOne({ role: { $ne: 'admin' } });
  const sampleUser = dbSampleUser ? { id: String(dbSampleUser._id) } : null;
  const sampleEvent = eventsPage.events?.[0];

  const adminActionErrors = [];

  if (sampleUser?.id) {
    try {
      await adminPatch(adminToken, `/admin/users/${sampleUser.id}/status`, { status: 'suspended', reason: 'audit-check' });
      await adminPatch(adminToken, `/admin/users/${sampleUser.id}/status`, { status: 'active', reason: 'audit-check-restore' });
    } catch (error) {
      adminActionErrors.push(`user-status-action: ${error.message}`);
    }
  }

  if (sampleEvent?.id) {
    try {
      await adminPatch(adminToken, `/admin/events/${sampleEvent.id}/status`, { status: 'live', reason: 'audit-check' });
      await adminPatch(adminToken, `/admin/events/${sampleEvent.id}/status`, { status: 'open', reason: 'audit-check-restore' });
    } catch (error) {
      adminActionErrors.push(`event-status-action: ${error.message}`);
    }
  }

  const logsAfterActions = await adminGet(adminToken, '/admin/audit-logs?limit=100');
  report.phases.adminActionAudit = {
    sampleUserId: sampleUser?.id || null,
    sampleEventId: sampleEvent?.id || null,
    auditLogsAfterActions: Array.isArray(logsAfterActions.logs) ? logsAfterActions.logs.length : -1,
    actionErrors: adminActionErrors,
  };

  if (adminActionErrors.length > 0) {
    report.findings.push({
      severity: 'medium',
      issue: 'One or more admin moderation actions failed during audit',
      details: adminActionErrors,
    });
  }

  report.completedAt = new Date().toISOString();
  report.durationMs = new Date(report.completedAt).getTime() - new Date(report.startedAt).getTime();

  console.log(JSON.stringify(report, null, 2));
  await client.close();
};

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    message: error.message,
    stack: error.stack,
  }, null, 2));
  process.exitCode = 1;
});
