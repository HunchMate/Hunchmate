import 'dotenv/config';

const base = 'http://127.0.0.1:5001';
const password = process.env.TEST_USER_PASSWORD;

if (!password) {
  throw new Error('TEST_USER_PASSWORD is missing');
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

const signup = (email, name, role = 'participant') => fetchJson(`${base}/auth/signup`, {
  method: 'POST',
  body: JSON.stringify({ email, password, name, role }),
});

const login = (email) => fetchJson(`${base}/auth/login`, {
  method: 'POST',
  body: JSON.stringify({ email, password }),
});

const createEvent = (token, title, extra = {}) => fetchJson(`${base}/events`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    title,
    description: extra.description || title,
    shortDescription: extra.shortDescription || title,
    category: 'Hackathon',
    mode: 'Hybrid',
    ...extra,
  }),
});

const registerForEvent = (baseUrl, eventId, participant) => fetchJson(`${baseUrl}/events/${eventId}/register`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${participant.token}`,
  },
  body: JSON.stringify({
    participant: {
      id: participant.userId,
      name: participant.name,
      email: participant.email,
      role: 'participant',
    },
  }),
});

const makeEmail = (prefix, scenario, index) => `${prefix}.${scenario}.${Date.now()}.${index}@example.com`;

async function buildParticipants(scenario, count, prefix = 'user') {
  const start = Date.now();
  const settled = await Promise.allSettled(
    Array.from({ length: count }, async (_, index) => {
      const email = makeEmail(prefix, scenario, index);
      const name = `${scenario} User ${index + 1}`;
      const data = await signup(email, name, 'participant');
      return { email, name, userId: data.userId, token: data.token };
    })
  );

  const success = settled.filter((item) => item.status === 'fulfilled').map((item) => item.value);
  const failures = settled.filter((item) => item.status === 'rejected').map((item) => String(item.reason?.message || item.reason));

  return {
    ms: Date.now() - start,
    success,
    failureCount: failures.length,
    failures,
  };
}

async function runRegistrationWave(label, eventId, participants) {
  const start = Date.now();
  const settled = await Promise.allSettled(participants.map((participant) => registerForEvent(base, eventId, participant)));
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

  for (const item of settled) {
    if (item.status === 'fulfilled') {
      summary.success += 1;
      const status = item.value?.success === false ? item.value?.status || 'false' : 'success';
      summary.statuses[status] = (summary.statuses[status] || 0) + 1;
      continue;
    }

    summary.failures += 1;
    const message = String(item.reason?.message || item.reason || 'unknown');
    if (/already registered/i.test(message) || /409/.test(message)) {
      summary.duplicateErrors += 1;
    } else {
      summary.otherErrors += 1;
    }
    summary.statuses.error = (summary.statuses.error || 0) + 1;
  }

  return summary;
}

async function scenario200() {
  const orgEmail = `load200.organizer.${Date.now()}@example.com`;
  const organizer = await signup(orgEmail, 'Load 200 Organizer', 'organizer');
  const token = organizer.token || (await login(orgEmail)).token;
  const event = await createEvent(token, `Load 200 Event ${Date.now()}`, { description: '200 registration stress test' });
  const eventId = event.event.id;
  const participants = await buildParticipants('s200', 200, 'load200');
  const reg = await runRegistrationWave('200-registrations', eventId, participants.success);
  return {
    eventId,
    organizer: orgEmail,
    participants: participants.success.length,
    participantSignupMs: participants.ms,
    participantSignupFailures: participants.failureCount,
    ...reg,
    health: await fetchJson(`${base}/health`),
  };
}

async function scenario500() {
  const orgEmail = `load500.organizer.${Date.now()}@example.com`;
  const organizer = await signup(orgEmail, 'Load 500 Organizer', 'organizer');
  const token = organizer.token || (await login(orgEmail)).token;
  const event = await createEvent(token, `Load 500 Event ${Date.now()}`, { description: '500 registration stress test' });
  const eventId = event.event.id;
  const participants = await buildParticipants('s500', 500, 'load500');
  const reg = await runRegistrationWave('500-registrations', eventId, participants.success);
  return {
    eventId,
    organizer: orgEmail,
    participants: participants.success.length,
    participantSignupMs: participants.ms,
    participantSignupFailures: participants.failureCount,
    ...reg,
    health: await fetchJson(`${base}/health`),
  };
}

async function scenarioMixed() {
  const organizerCount = 10;
  const participantsPerEvent = 10;
  const start = Date.now();

  const organizerSettled = await Promise.allSettled(
    Array.from({ length: organizerCount }, async (_, index) => {
      const email = `mixed.organizer.${Date.now()}.${index}@example.com`;
      const signupData = await signup(email, `Mixed Organizer ${index + 1}`, 'organizer');
      const token = signupData.token || (await login(email)).token;
      const event = await createEvent(token, `Mixed Event ${index + 1} ${Date.now()}`, { description: 'Mixed create/register load' });
      return { email, token, eventId: event.event.id, index };
    })
  );

  const organizers = organizerSettled.filter((item) => item.status === 'fulfilled').map((item) => item.value);
  const organizerFailures = organizerSettled.filter((item) => item.status === 'rejected').map((item) => String(item.reason?.message || item.reason));

  const participantJobs = [];
  for (const organizer of organizers) {
    for (let i = 0; i < participantsPerEvent; i += 1) {
      participantJobs.push((async () => {
        const email = `mixed.user.${Date.now()}.${organizer.index}.${i}@example.com`;
        const name = `Mixed User ${organizer.index + 1}-${i + 1}`;
        const signupData = await signup(email, name, 'participant');
        return {
          email,
          name,
          userId: signupData.userId,
          token: signupData.token,
          eventId: organizer.eventId,
        };
      })());
    }
  }

  const participantSettled = await Promise.allSettled(participantJobs);
  const participants = participantSettled.filter((item) => item.status === 'fulfilled').map((item) => item.value);
  const participantFailures = participantSettled.filter((item) => item.status === 'rejected').map((item) => String(item.reason?.message || item.reason));

  const registrationSettled = await Promise.allSettled(
    participants.map((participant) => registerForEvent(base, participant.eventId, participant))
  );

  const registrationSummary = {
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

  return {
    elapsedMs: Date.now() - start,
    organizerCount,
    organizers: organizers.length,
    organizerFailures: organizerFailures.length,
    participantCount: participants.length,
    participantFailures: participantFailures.length,
    registrations: registrationSummary,
    health: await fetchJson(`${base}/health`),
  };
}

async function scenarioBursts() {
  const rounds = 5;
  const perRound = 100;
  const results = [];

  for (let round = 1; round <= rounds; round += 1) {
    const orgEmail = `burst.organizer.${Date.now()}.${round}@example.com`;
    const organizer = await signup(orgEmail, `Burst Organizer ${round}`, 'organizer');
    const token = organizer.token || (await login(orgEmail)).token;
    const event = await createEvent(token, `Burst Event ${round} ${Date.now()}`, { description: `Burst round ${round}` });
    const eventId = event.event.id;

    const participants = await buildParticipants(`burst${round}`, perRound, 'burst');
    const reg = await runRegistrationWave(`burst-round-${round}`, eventId, participants.success);
    results.push({
      round,
      eventId,
      participantSignupMs: participants.ms,
      participantSignupFailures: participants.failureCount,
      participants: participants.success.length,
      ...reg,
    });
  }

  return {
    rounds,
    perRound,
    results,
    health: await fetchJson(`${base}/health`),
  };
}

const final = {
  startedAt: new Date().toISOString(),
  backendHealth: await fetchJson(`${base}/health`),
  scenarios: {},
};

console.log('Running 200-registration scenario...');
final.scenarios['200-registrations'] = await scenario200();
console.log('Running 500-registration scenario...');
final.scenarios['500-registrations'] = await scenario500();
console.log('Running mixed create/register scenario...');
final.scenarios['mixed-load'] = await scenarioMixed();
console.log('Running repeated burst scenario...');
final.scenarios['repeated-bursts'] = await scenarioBursts();
final.completedAt = new Date().toISOString();

console.log(JSON.stringify(final, null, 2));
