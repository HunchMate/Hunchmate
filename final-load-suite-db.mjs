import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';

const base = 'http://127.0.0.1:5001';
const password = process.env.TEST_USER_PASSWORD;
const mongoUri = process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET;

if (!mongoUri) {
  throw new Error('MONGODB_URI is missing');
}

if (!password) {
  throw new Error('TEST_USER_PASSWORD is missing');
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

const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 15000 });
await client.connect();
const db = client.db('hunchmate');
const usersCollection = db.collection('users');
const eventsCollection = db.collection('events');
const registrationsCollection = db.collection('registrations');

const createSeedUser = async ({ email, name, role }) => {
  const normalizedEmail = String(email).toLowerCase();
  const existing = await usersCollection.findOne({ email: normalizedEmail });
  if (existing) {
    return existing;
  }

  const document = {
    _id: new ObjectId(),
    email: normalizedEmail,
    name,
    role,
    status: 'active',
    provider: 'local',
    authMethods: ['password'],
    emailVerified: false,
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
    verified: false,
  };

  await usersCollection.insertOne(document);
  return document;
};

const tokenFor = (userId) => jwt.sign(
  { userId: String(userId), type: 'access', iat: Math.floor(Date.now() / 1000) },
  jwtSecret,
  { expiresIn: '15m' }
);

const createEvent = (token, title, description) => fetchJson(`${base}/events`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    title,
    description,
    shortDescription: description,
    category: 'Hackathon',
    mode: 'Hybrid',
  }),
});

const registerParticipant = (eventId, participant) => fetchJson(`${base}/events/${eventId}/register`, {
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

const buildSeedParticipants = async (label, count) => {
  const start = Date.now();
  const participants = [];

  for (let index = 0; index < count; index += 1) {
    const email = `${label}.${Date.now()}.${index}@example.com`;
    const name = `${label} User ${index + 1}`;
    const user = await createSeedUser({ email, name, role: 'participant' });
    participants.push({
      email,
      name,
      userId: String(user._id),
      token: tokenFor(user._id),
    });
  }

  return { ms: Date.now() - start, participants };
};

const runRegistrationWave = async (label, eventId, participants) => {
  const start = Date.now();
  const settled = await Promise.allSettled(participants.map((participant) => registerParticipant(eventId, participant)));
  const ms = Date.now() - start;

  const summary = {
    label,
    ms,
    requested: participants.length,
    success: 0,
    failures: 0,
    duplicateErrors: 0,
    otherErrors: 0,
    statuses: {},
  };

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      summary.success += 1;
      const status = result.value?.success === false ? result.value?.status || 'false' : 'success';
      summary.statuses[status] = (summary.statuses[status] || 0) + 1;
      continue;
    }

    summary.failures += 1;
    const message = String(result.reason?.message || result.reason || 'unknown');
    if (/already registered/i.test(message) || /409/.test(message)) {
      summary.duplicateErrors += 1;
    } else {
      summary.otherErrors += 1;
    }
    summary.statuses.error = (summary.statuses.error || 0) + 1;
  }

  const [eventDoc, actualCount] = await Promise.all([
    eventsCollection.findOne({ id: eventId }),
    registrationsCollection.countDocuments({ eventId }),
  ]);

  summary.actualRegistrations = actualCount;
  summary.registeredCountField = Number(eventDoc?.registeredCount || 0);
  summary.countDelta = summary.registeredCountField - summary.actualRegistrations;

  return summary;
};

const cleanupArtifacts = async (artifactIds) => {
  if (!artifactIds.length) return;

  await registrationsCollection.deleteMany({ eventId: { $in: artifactIds.eventIds } });
  await eventsCollection.deleteMany({ id: { $in: artifactIds.eventIds } });
  await usersCollection.deleteMany({ _id: { $in: artifactIds.userIds } });
};

const artifactIds = { eventIds: [], userIds: [] };
const final = {
  startedAt: new Date().toISOString(),
  backendHealth: await fetchJson(`${base}/health`),
  scenarios: {},
};

try {
  console.log('Running 200-registration scenario...');
  {
    const organizer = await createSeedUser({
      email: `load200.organizer.${Date.now()}@example.com`,
      name: 'Load 200 Organizer',
      role: 'organizer',
    });
    artifactIds.userIds.push(organizer._id);
    const event = await createEvent(tokenFor(organizer._id), `Load 200 Event ${Date.now()}`, '200 registration stress test');
    artifactIds.eventIds.push(event.event.id);
    const participants = await buildSeedParticipants('load200', 200);
    participants.participants.forEach((participant) => artifactIds.userIds.push(new ObjectId(participant.userId)));
    final.scenarios['200-registrations'] = {
      eventId: event.event.id,
      participantSeedMs: participants.ms,
      participantCount: participants.participants.length,
      registration: await runRegistrationWave('200-registrations', event.event.id, participants.participants),
      health: await fetchJson(`${base}/health`),
    };
  }

  console.log('Running 500-registration scenario...');
  {
    const organizer = await createSeedUser({
      email: `load500.organizer.${Date.now()}@example.com`,
      name: 'Load 500 Organizer',
      role: 'organizer',
    });
    artifactIds.userIds.push(organizer._id);
    const event = await createEvent(tokenFor(organizer._id), `Load 500 Event ${Date.now()}`, '500 registration stress test');
    artifactIds.eventIds.push(event.event.id);
    const participants = await buildSeedParticipants('load500', 500);
    participants.participants.forEach((participant) => artifactIds.userIds.push(new ObjectId(participant.userId)));
    final.scenarios['500-registrations'] = {
      eventId: event.event.id,
      participantSeedMs: participants.ms,
      participantCount: participants.participants.length,
      registration: await runRegistrationWave('500-registrations', event.event.id, participants.participants),
      health: await fetchJson(`${base}/health`),
    };
  }

  console.log('Running mixed create/register scenario...');
  {
    const organizerCount = 10;
    const participantsPerEvent = 10;
    const organizers = [];

    for (let index = 0; index < organizerCount; index += 1) {
      const organizer = await createSeedUser({
        email: `mixed.organizer.${Date.now()}.${index}@example.com`,
        name: `Mixed Organizer ${index + 1}`,
        role: 'organizer',
      });
      artifactIds.userIds.push(organizer._id);
      organizers.push({
        index,
        userId: String(organizer._id),
        token: tokenFor(organizer._id),
      });
    }

    const eventSettled = await Promise.allSettled(
      organizers.map((organizer) => createEvent(organizer.token, `Mixed Event ${organizer.index + 1} ${Date.now()}`, 'Mixed create/register load'))
    );
    const events = eventSettled.filter((result) => result.status === 'fulfilled').map((result) => result.value.event.id);
    events.forEach((eventId) => artifactIds.eventIds.push(eventId));

    const participants = [];
    for (const eventId of events) {
      for (let index = 0; index < participantsPerEvent; index += 1) {
        const user = await createSeedUser({
          email: `mixed.user.${eventId}.${index}@example.com`,
          name: `Mixed User ${index + 1}`,
          role: 'participant',
        });
        artifactIds.userIds.push(user._id);
        participants.push({
          email: user.email,
          name: user.name,
          userId: String(user._id),
          token: tokenFor(user._id),
          eventId,
        });
      }
    }

    const regStart = Date.now();
    const registrationSettled = await Promise.allSettled(participants.map((participant) => registerParticipant(participant.eventId, participant)));
    const registrationMs = Date.now() - regStart;

    const registrationSummary = {
      ms: registrationMs,
      requested: participants.length,
      success: 0,
      failures: 0,
      duplicateErrors: 0,
      otherErrors: 0,
      statuses: {},
    };

    for (const item of registrationSettled) {
      if (item.status === 'fulfilled') {
        registrationSummary.success += 1;
        const status = item.value?.success === false ? item.value?.status || 'false' : 'success';
        registrationSummary.statuses[status] = (registrationSummary.statuses[status] || 0) + 1;
        continue;
      }

      registrationSummary.failures += 1;
      const message = String(item.reason?.message || item.reason || 'unknown');
      if (/already registered/i.test(message) || /409/.test(message)) {
        registrationSummary.duplicateErrors += 1;
      } else {
        registrationSummary.otherErrors += 1;
      }
      registrationSummary.statuses.error = (registrationSummary.statuses.error || 0) + 1;
    }

    const countChecks = await Promise.all(events.map(async (eventId) => ({
      eventId,
      registeredCountField: Number((await eventsCollection.findOne({ id: eventId }))?.registeredCount || 0),
      actualRegistrations: await registrationsCollection.countDocuments({ eventId }),
    })));

    final.scenarios['mixed-load'] = {
      organizerCount,
      createdEvents: events.length,
      participantCount: participants.length,
      registration: registrationSummary,
      countChecks,
      health: await fetchJson(`${base}/health`),
    };
  }

  console.log('Running repeated burst scenario...');
  {
    const rounds = 5;
    const perRound = 100;
    const results = [];

    for (let round = 1; round <= rounds; round += 1) {
      const organizer = await createSeedUser({
        email: `burst.organizer.${Date.now()}.${round}@example.com`,
        name: `Burst Organizer ${round}`,
        role: 'organizer',
      });
      artifactIds.userIds.push(organizer._id);
      const event = await createEvent(tokenFor(organizer._id), `Burst Event ${round} ${Date.now()}`, `Burst round ${round}`);
      artifactIds.eventIds.push(event.event.id);
      const participants = await buildSeedParticipants(`burst${round}`, perRound);
      participants.participants.forEach((participant) => artifactIds.userIds.push(new ObjectId(participant.userId)));
      const registration = await runRegistrationWave(`burst-round-${round}`, event.event.id, participants.participants);
      results.push({
        round,
        eventId: event.event.id,
        participantSeedMs: participants.ms,
        participantCount: participants.participants.length,
        registration,
      });
    }

    final.scenarios['repeated-bursts'] = {
      rounds,
      perRound,
      results,
      health: await fetchJson(`${base}/health`),
    };
  }

  final.completedAt = new Date().toISOString();
  console.log(JSON.stringify(final, null, 2));
} finally {
  await cleanupArtifacts(artifactIds).catch((error) => {
    console.error('Cleanup failed:', error.message);
  });
  await client.close().catch(() => {});
}
